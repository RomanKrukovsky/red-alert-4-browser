import { WebSocketServer, WebSocket } from 'ws';
import { GameSimulation } from '@ra4/sim-core';
import { deserializeClientMessage, serializeServerMessage, validatePlayerCommand } from '@ra4/netcode';
import { ClientMessage, FactionId, MatchState, PlayerCommand, PlayerType, ServerMessage } from '@ra4/shared-types';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[RA4 Game Server] Authoritative RTS Server listening on ws://localhost:${PORT}`);

class GameRoom {
  public id: string = 'default-room';
  public matchState: MatchState = MatchState.LOBBY;
  public sim: GameSimulation;
  public connections: Map<number, WebSocket> = new Map();
  public tickBuffer: PlayerCommand[] = [];
  public timer: NodeJS.Timeout | null = null;

  constructor() {
    this.sim = new GameSimulation(1337);
  }

  public startMatch(): void {
    this.matchState = MatchState.IN_GAME;
    this.sim.initMatch([
      { name: 'Игрок 1 (СССР)', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
      { name: 'Игрок 2 (Альянс)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
    ]);

    const initialSnapshot = this.sim.createSnapshot();

    this.broadcast({
      type: 'MATCH_START',
      seed: this.sim.seed,
      tickRate: 30,
      initialSnapshot
    });

    // 30 Hz Fixed-Step Loop (33.33ms)
    this.timer = setInterval(() => {
      this.tick();
    }, 33);
  }

  public tick(): void {
    if (this.matchState !== MatchState.IN_GAME) return;

    // Process queued player commands
    const currentCommands = [...this.tickBuffer];
    this.tickBuffer = [];

    this.sim.processCommands(currentCommands);
    const snapshot = this.sim.step();

    // Broadcast tick frame to clients
    this.broadcast({
      type: 'TICK_FRAME',
      tick: snapshot.tick,
      commands: currentCommands
    });

    // Send snapshot every 30 ticks (1s)
    if (snapshot.tick % 30 === 0) {
      this.broadcast({
        type: 'STATE_SNAPSHOT',
        snapshot
      });
    }

    if (this.sim.matchState === MatchState.FINISHED) {
      this.matchState = MatchState.FINISHED;
      if (this.timer) clearInterval(this.timer);
      this.broadcast({
        type: 'GAME_OVER',
        winnerTeam: this.sim.winnerTeam,
        winningPlayerIndices: [this.sim.winnerTeam],
        reason: 'Командное ядро противника уничтожено!'
      });
    }
  }

  public broadcast(msg: ServerMessage): void {
    const data = serializeServerMessage(msg);
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

const room = new GameRoom();

wss.on('connection', (ws: WebSocket) => {
  console.log('[RA4 Game Server] New client connected');
  const playerIndex = room.connections.size;
  room.connections.set(playerIndex, ws);

  ws.on('message', (data: string) => {
    try {
      const msg: ClientMessage = deserializeClientMessage(data.toString());

      switch (msg.type) {
        case 'JOIN_LOBBY': {
          ws.send(serializeServerMessage({
            type: 'LOBBY_STATE',
            state: {
              roomId: room.id,
              mapId: 'map_red_square_duel',
              matchState: room.matchState,
              hostIndex: 0,
              slots: [
                { index: 0, name: msg.playerName, type: PlayerType.HUMAN, factionId: FactionId.USSR, team: 0, color: '#ff4d4d', isReady: true, isConnected: true },
                { index: 1, name: 'AI ИИ-Командир', type: PlayerType.AI_MEDIUM, factionId: FactionId.ALLIANCE, team: 1, color: '#4dc3ff', isReady: true, isConnected: true }
              ],
              contentVersionHash: 'sha256_official'
            }
          }));
          break;
        }
        case 'START_MATCH': {
          if (room.matchState === MatchState.LOBBY) {
            room.startMatch();
          }
          break;
        }
        case 'SUBMIT_COMMAND': {
          const val = validatePlayerCommand(msg.command, room.sim, playerIndex);
          if (val.valid) {
            room.tickBuffer.push(msg.command);
          } else {
            console.warn(`[Anti-Cheat Reject] Player ${playerIndex}: ${val.reason}`);
          }
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error('[RA4 Game Server] Error parsing client message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[RA4 Game Server] Client ${playerIndex} disconnected`);
    room.connections.delete(playerIndex);
  });
});
