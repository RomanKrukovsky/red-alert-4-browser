import { WebSocket } from 'ws';
import crypto from 'node:crypto';
import { GameSimulation } from '@ra4/sim-core';
import {
  encodeChecksum, encodeEnvelope, encodeJsonPayload, encodeTickFrame,
  PROTOCOL_VERSION, validatePlayerCommand, WireKind,
} from '@ra4/netcode';
import { ReplayRecorderV2 } from '@ra4/replay';
import { FactionId, MatchState, PlayerCommand, PlayerType, WorldSnapshot } from '@ra4/shared-types';
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
  /** Per-player outbound sequence counter (Protocol v1 envelopes). */
  outSeq?: number;
  /** Last client-reported checksum, for desync detection. */
  lastReportedChecksum?: { tick: number; checksum: number };
  /** Wall-clock ms of disconnect, for the reconnect window. */
  disconnectedAtMs?: number;
}

export interface DesyncEvent {
  playerIndex: number;
  tick: number;
  serverChecksum: number;
  clientChecksum: number;
}

/** Reconnect window: a disconnected player may resume within this period. */
export const RECONNECT_WINDOW_MS = 90_000;

/**
 * Server-authoritative match runtime (Protocol v1).
 *
 * The server simulation is the single source of truth:
 *  - clients submit commands (binary SUBMIT_COMMANDS frames);
 *  - every command is validated against the authoritative state;
 *  - validated commands are applied on the next tick and broadcast in
 *    binary TICK_FRAME messages (clients re-simulate deterministically);
 *  - periodic CHECKSUM_STATE lets clients verify sync; client
 *    CHECKSUM_REPORTs are compared for desync detection;
 *  - the match is recorded with ReplayRecorderV2 (command log +
 *    checkpoints + keyframes) and persisted at match end.
 */
export class AuthoritativeMatchRuntime {
  public readonly matchId: string;
  public readonly seed: number;
  public readonly mapId: string;
  public matchState: MatchState = MatchState.IN_GAME;

  public readonly sim: GameSimulation;
  public readonly replayRecorder: ReplayRecorderV2;

  public players: Map<number, MatchPlayerSession> = new Map();
  public tickBuffer: PlayerCommand[] = [];
  public snapshotHistory: Map<number, WorldSnapshot> = new Map();
  public desyncEvents: DesyncEvent[] = [];

  private timer: NodeJS.Timeout | null = null;
  private readonly tickRateHz = 30;
  private readonly tickIntervalMs = 33; // ~33.33ms (30 Hz)
  private readonly checksumBroadcastInterval = 90; // every 3 s
  /** Commands accepted per player per tick (anti-flood). */
  private readonly maxCommandsPerPlayerPerTick = 32;
  private commandCountThisTick: Map<number, number> = new Map();

  constructor(mapId: string, playerConfigs: MatchPlayerSession[], seed: number = 1337) {
    this.matchId = crypto.randomUUID();
    this.mapId = mapId;
    this.seed = seed;

    this.sim = new GameSimulation(seed);

    for (const p of playerConfigs) {
      this.players.set(p.playerIndex, { ...p, outSeq: p.outSeq ?? 0 });
    }

    const simConfigs = playerConfigs.map(p => ({
      name: p.name,
      factionId: p.factionId,
      type: p.type,
      team: p.team,
    }));

    this.sim.initMatch(simConfigs);

    this.replayRecorder = new ReplayRecorderV2({
      mapId,
      seed,
      tickRate: this.tickRateHz,
      simVersion: '1.0.0',
      contentHash: 'sha256_official',
      protocolVersion: PROTOCOL_VERSION,
      players: simConfigs,
      startingCredits: 10000,
      recordedAtIso: new Date().toISOString(),
    });
  }

  public start(): void {
    const initialSnapshot = this.sim.createSnapshot();
    this.snapshotHistory.set(0, initialSnapshot);

    this.broadcastKind(WireKind.MATCH_START_JSON, encodeJsonPayload({
      matchId: this.matchId,
      seed: this.seed,
      tickRate: this.tickRateHz,
      mapId: this.mapId,
      initialSnapshot,
    }));

    // 30 Hz Fixed-Step Authoritative Loop
    this.timer = setInterval(() => {
      this.tick();
    }, this.tickIntervalMs);
  }

  public submitCommand(playerIndex: number, command: PlayerCommand): { valid: boolean; reason?: string } {
    if (this.matchState !== MatchState.IN_GAME) {
      return { valid: false, reason: 'Match is not in progress' };
    }

    const count = this.commandCountThisTick.get(playerIndex) ?? 0;
    if (count >= this.maxCommandsPerPlayerPerTick) {
      return { valid: false, reason: 'Command rate limit exceeded' };
    }

    const validation = validatePlayerCommand(command, this.sim, playerIndex);
    if (!validation.valid) {
      return validation;
    }

    this.commandCountThisTick.set(playerIndex, count + 1);
    this.tickBuffer.push(command);
    return { valid: true };
  }

  /** Client checksum report — compare against recorded server checksums. */
  public reportChecksum(playerIndex: number, tick: number, checksum: number): void {
    const player = this.players.get(playerIndex);
    if (!player) return;
    player.lastReportedChecksum = { tick, checksum };

    // Server checksum for that tick is known only at checkpoint boundaries;
    // compare against current tick when they line up.
    if (tick === this.sim.tickIndex) {
      const serverChecksum = this.sim.calculateChecksum();
      if (serverChecksum !== checksum) {
        this.desyncEvents.push({ playerIndex, tick, serverChecksum, clientChecksum: checksum });
        console.warn(`[MatchRuntime] DESYNC: player ${playerIndex} tick ${tick} client=${checksum} server=${serverChecksum}`);
      }
    }
  }

  private tick(): void {
    if (this.matchState !== MatchState.IN_GAME) return;

    const currentCommands = [...this.tickBuffer];
    this.tickBuffer = [];
    this.commandCountThisTick.clear();

    // Apply commands to sim-core
    this.sim.processCommands(currentCommands);
    const snapshot = this.sim.step();

    // Record replay frame (v2: sim reference for checkpoints/keyframes)
    this.replayRecorder.recordTick(this.sim, snapshot.tick, currentCommands);

    // Broadcast binary tick frame to clients
    this.broadcastKind(WireKind.TICK_FRAME, encodeTickFrame({ tick: snapshot.tick, commands: currentCommands }));

    // Periodic authoritative checksum for client-side desync detection
    if (snapshot.tick % this.checksumBroadcastInterval === 0) {
      this.broadcastKind(WireKind.CHECKSUM_STATE, encodeChecksum({ tick: snapshot.tick, checksum: snapshot.checksum }));
    }

    // Save snapshot every 30 ticks (1 second) for reconnect recovery
    if (snapshot.tick % 30 === 0) {
      this.snapshotHistory.set(snapshot.tick, snapshot);
      // Retain only the last 300 snapshots in RAM
      if (this.snapshotHistory.size > 300) {
        const oldestKey = Math.min(...Array.from(this.snapshotHistory.keys()));
        this.snapshotHistory.delete(oldestKey);
      }
    }

    // Reconnect window enforcement
    const nowMs = Date.now();
    for (const player of this.players.values()) {
      if (!player.isConnected && player.disconnectedAtMs !== undefined
        && nowMs - player.disconnectedAtMs > RECONNECT_WINDOW_MS
        && player.type === PlayerType.HUMAN
        && !this.sim.surrenderedPlayers.has(player.playerIndex)) {
        console.log(`[MatchRuntime] Player ${player.playerIndex} exceeded reconnect window — auto-surrender.`);
        this.sim.processCommands([{ type: 'SURRENDER' as PlayerCommand['type'], entityIds: [], playerIndex: player.playerIndex, tick: this.sim.tickIndex } as PlayerCommand]);
      }
    }

    // Check game over victory conditions
    if (this.sim.matchState === MatchState.FINISHED) {
      this.finishMatch('TEAM_DESTRUCTION');
    }
  }

  public handleReconnect(playerIndex: number, reconnectToken: string, _lastTick: number, ws: WebSocket): boolean {
    const player = this.players.get(playerIndex);
    if (!player || player.reconnectToken !== reconnectToken) {
      return false;
    }
    if (player.disconnectedAtMs !== undefined && Date.now() - player.disconnectedAtMs > RECONNECT_WINDOW_MS) {
      return false; // window expired
    }

    player.ws = ws;
    player.isConnected = true;
    player.disconnectedAtMs = undefined;

    // Send the latest available snapshot for state restore
    const latestAvailableTick = Math.max(...Array.from(this.snapshotHistory.keys()), 0);
    const latestSnapshot = this.snapshotHistory.get(latestAvailableTick) || this.sim.createSnapshot();
    this.sendTo(player, WireKind.SNAPSHOT_JSON, encodeJsonPayload({ snapshot: latestSnapshot }));
    return true;
  }

  public handleDisconnect(playerIndex: number): void {
    const player = this.players.get(playerIndex);
    if (player) {
      player.isConnected = false;
      player.ws = null;
      player.disconnectedAtMs = Date.now();
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

    this.replayRecorder.recordResult(winningTeam, reason);

    this.broadcastKind(WireKind.GAME_OVER_JSON, encodeJsonPayload({
      winnerTeam: winningTeam,
      winningPlayerIndices,
      reason,
      finalChecksum: this.sim.calculateChecksum(),
      desyncEvents: this.desyncEvents.length,
    }));

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

        const replayBytes = this.replayRecorder.export();
        await db.insert(replays).values({
          matchId: insertedMatch.id,
          contentVersionHash: 'sha256_official',
          simCoreVersion: '1.0.0',
          replayJson: { formatVersion: 2, base64: Buffer.from(replayBytes).toString('base64') },
          checksumFinal: this.sim.calculateChecksum(),
        });

        console.log(`[MatchRuntime] Successfully persisted match ${this.matchId} to DB.`);
      } catch (err) {
        console.error(`[MatchRuntime] Error persisting match ${this.matchId}:`, err);
      }
    }
  }

  /** Export the replay bytes (for tests / download endpoints). */
  public exportReplay(): Uint8Array {
    return this.replayRecorder.export();
  }

  private sendTo(player: MatchPlayerSession, kind: WireKind, payload: Uint8Array): void {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.outSeq = (player.outSeq ?? 0) + 1;
      player.ws.send(encodeEnvelope(kind, player.outSeq, player.lastAckTick, payload));
    }
  }

  public broadcastKind(kind: WireKind, payload: Uint8Array): void {
    for (const player of this.players.values()) {
      this.sendTo(player, kind, payload);
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
