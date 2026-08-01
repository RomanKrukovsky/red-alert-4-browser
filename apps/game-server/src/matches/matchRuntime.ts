import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { GameSimulation } from '@ra4/sim-core';
import { validatePlayerCommand } from '@ra4/netcode';
import { ReplayRecorder } from '@ra4/replay';
import { FactionId, MatchState, PlayerCommand, PlayerType, ServerMessage, WorldSnapshot } from '@ra4/shared-types';
import { db, isDbConnected } from '../persistence/db.js';
import { matches, matchPlayers, replays } from '../persistence/schema.js';

export interface MatchPlayerSession {
  playerIndex: number;
  userId?: string;
  name: string;
  factionId: FactionId;
  team: number;
  type: PlayerType;
  ws: WebSocket | null;
  isConnected: boolean;
  lastAckTick: number;
  reconnectToken: string;
}

export class AuthoritativeMatchRuntime {
  public readonly matchId: string;
  public readonly seed: number;
  public readonly mapId: string;
  public matchState: MatchState = MatchState.IN_GAME;

  public readonly sim: GameSimulation;
  public readonly replayRecorder: ReplayRecorder;

  public players: Map<number, MatchPlayerSession> = new Map();
  public tickBuffer: PlayerCommand[] = [];
  public snapshotHistory: Map<number, WorldSnapshot> = new Map();

  private timer: NodeJS.Timeout | null = null;
  private readonly tickRateHz = 30;
  private readonly tickIntervalMs = 33; // ~33.33ms (30 Hz)

  constructor(mapId: string, playerConfigs: MatchPlayerSession[], seed: number = 1337) {
    this.matchId = uuidv4();
    this.mapId = mapId;
    this.seed = seed;

    this.sim = new GameSimulation(seed);

    for (const p of playerConfigs) {
      this.players.set(p.playerIndex, p);
    }

    const simConfigs = playerConfigs.map(p => ({
      name: p.name,
      factionId: p.factionId,
      type: p.type,
      team: p.team,
    }));

    this.sim.initMatch(simConfigs);

    this.replayRecorder = new ReplayRecorder({
      mapId,
      seed,
      contentHash: 'sha256_official',
      players: simConfigs,
      durationTicks: 0,
    });
  }

  public start(): void {
    const initialSnapshot = this.sim.createSnapshot();
    this.snapshotHistory.set(0, initialSnapshot);

    this.broadcast({
      type: 'MATCH_START',
      seed: this.seed,
      tickRate: this.tickRateHz,
      initialSnapshot,
    });

    // 30 Hz Fixed-Step Authoritative Loop
    this.timer = setInterval(() => {
      this.tick();
    }, this.tickIntervalMs);
  }

  public submitCommand(playerIndex: number, command: PlayerCommand): { valid: boolean; reason?: string } {
    if (this.matchState !== MatchState.IN_GAME) {
      return { valid: false, reason: 'Match is not in progress' };
    }

    const validation = validatePlayerCommand(command, this.sim, playerIndex);
    if (!validation.valid) {
      return validation;
    }

    this.tickBuffer.push(command);
    return { valid: true };
  }

  private tick(): void {
    if (this.matchState !== MatchState.IN_GAME) return;

    const currentCommands = [...this.tickBuffer];
    this.tickBuffer = [];

    // Apply commands to sim-core
    this.sim.processCommands(currentCommands);
    const snapshot = this.sim.step();

    // Record replay frame
    this.replayRecorder.recordTick(snapshot.tick, currentCommands);

    // Broadcast tick frame to clients
    this.broadcast({
      type: 'TICK_FRAME',
      tick: snapshot.tick,
      commands: currentCommands,
    });

    // Save snapshot every 30 ticks (1 second) for reconnect recovery
    if (snapshot.tick % 30 === 0) {
      this.snapshotHistory.set(snapshot.tick, snapshot);
      // Retain only last 300 snapshots (10 seconds) in RAM
      if (this.snapshotHistory.size > 300) {
        const oldestKey = Math.min(...Array.from(this.snapshotHistory.keys()));
        this.snapshotHistory.delete(oldestKey);
      }

      this.broadcast({
        type: 'STATE_SNAPSHOT',
        snapshot,
      });
    }

    // Check game over victory conditions
    if (this.sim.matchState === MatchState.FINISHED) {
      this.finishMatch('TEAM_DESTRUCTION');
    }
  }

  public handleReconnect(playerIndex: number, reconnectToken: string, lastTick: number, ws: WebSocket): boolean {
    const player = this.players.get(playerIndex);
    if (!player || player.reconnectToken !== reconnectToken) {
      return false;
    }

    player.ws = ws;
    player.isConnected = true;

    // Send latest available snapshot
    const latestAvailableTick = Math.max(...Array.from(this.snapshotHistory.keys()), 0);
    const latestSnapshot = this.snapshotHistory.get(latestAvailableTick) || this.sim.createSnapshot();

    const reconnectPayload: ServerMessage = {
      type: 'STATE_SNAPSHOT',
      snapshot: latestSnapshot,
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(reconnectPayload));
    }

    return true;
  }

  public handleDisconnect(playerIndex: number): void {
    const player = this.players.get(playerIndex);
    if (player) {
      player.isConnected = false;
      player.ws = null;
    }
  }

  public async finishMatch(reason: string): Promise<void> {
    this.matchState = MatchState.FINISHED;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const winningTeam = this.sim.winnerTeam;
    const winningPlayerIndices = Array.from(this.players.values())
      .filter(p => p.team === winningTeam)
      .map(p => p.playerIndex);

    this.broadcast({
      type: 'GAME_OVER',
      winnerTeam: winningTeam,
      winningPlayerIndices,
      reason,
    });

    // Save match results to DB if connected
    if (isDbConnected && db) {
      try {
        const [insertedMatch] = await db.insert(matches).values({
          id: this.matchId,
          mapId: this.mapId,
          seed: this.seed,
          durationTicks: this.sim.tickIndex,
          winnerTeam: winningTeam,
          finishReason: reason,
          finishedAt: new Date(),
        }).returning();

        for (const p of this.players.values()) {
          await db.insert(matchPlayers).values({
            matchId: insertedMatch.id,
            userId: p.userId ?? null,
            playerIndex: p.playerIndex,
            factionId: p.factionId,
            team: p.team,
            isWinner: p.team === winningTeam,
          });
        }

        const replayJsonStr = this.replayRecorder.exportJSON();
        await db.insert(replays).values({
          matchId: insertedMatch.id,
          contentVersionHash: 'sha256_official',
          simCoreVersion: '1.0.0',
          replayJson: JSON.parse(replayJsonStr),
          checksumFinal: this.sim.seed,
        });

        console.log(`[MatchRuntime] Successfully persisted match ${this.matchId} to DB.`);
      } catch (err) {
        console.error(`[MatchRuntime] Error persisting match ${this.matchId}:`, err);
      }
    }
  }

  public broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const player of this.players.values()) {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
