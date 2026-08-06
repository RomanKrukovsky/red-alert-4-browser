import { describe, it, expect, afterEach } from 'vitest';
import { WebSocketServer, WebSocket as WsClient } from 'ws';
import { AuthoritativeMatchRuntime, MatchPlayerSession } from '../matches/matchRuntime.js';
import { GameSimulation } from '@ra4/sim-core';
import {
  decodeChecksum, decodeEnvelope, decodeCommandList, decodeJsonPayload, decodeTickFrame,
  encodeChecksum, encodeCommandList, encodeEnvelope, WireKind,
} from '@ra4/netcode';
import { CommandType, FactionId, PlayerCommand, PlayerType } from '@ra4/shared-types';

/**
 * End-to-end multiplayer over a real WebSocket transport.
 *
 * Both clients speak Protocol v1 binary frames over an actual socket to a
 * real AuthoritativeMatchRuntime, re-simulate the authoritative TICK_FRAME
 * stream in their own GameSimulation, and report checksums back. This is
 * the same code path the browser NetworkMatchClient uses (identical codecs,
 * identical envelopes) — only the DOM WebSocket is swapped for `ws`.
 */

interface HarnessClient {
  socket: WsClient;
  sim: GameSimulation;
  playerIndex: number;
  ticksApplied: number;
  outSeq: number;
  serverChecksums: Map<number, number>;
  localChecksums: Map<number, number>;
  matchStartReceived: boolean;
  gameOver: { winnerTeam: number; desyncEvents: number } | null;
  desyncs: number;
}

/** Send a Protocol v1 envelope, exactly as ProtocolChannel would. */
function sendFrame(client: HarnessClient, kind: WireKind, payload: Uint8Array): void {
  client.outSeq += 1;
  client.socket.send(encodeEnvelope(kind, client.outSeq, 0, payload));
}

const PORT = 18234;

describe('Multiplayer E2E over real WebSocket (Protocol v1)', () => {
  let wss: WebSocketServer | null = null;
  let runtime: AuthoritativeMatchRuntime | null = null;
  const clients: HarnessClient[] = [];

  afterEach(async () => {
    runtime?.stop();
    runtime = null;
    for (const c of clients) c.socket.close();
    clients.length = 0;
    await new Promise<void>((resolve) => {
      if (!wss) return resolve();
      wss.close(() => resolve());
      wss = null;
    });
  });

  it('two clients over real sockets stay checksum-identical to the server and detect no desync', async () => {
    const playerConfigs: MatchPlayerSession[] = [
      { playerIndex: 0, name: 'P0', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
      { playerIndex: 1, name: 'P1', factionId: FactionId.ALLIANCE, team: 1, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-1' },
    ];

    // ── Server side: real WS server bound to a real match runtime ─────────
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 909001);
    const rt = runtime;

    wss = new WebSocketServer({ port: PORT });
    let nextSlot = 0;
    const serverSocketsReady: Promise<void>[] = [];

    wss.on('connection', (socket) => {
      const slot = nextSlot++;
      const session = rt.players.get(slot)!;
      session.ws = socket as unknown as import('ws').WebSocket;
      session.isConnected = true;

      socket.on('message', (data: Buffer) => {
        // Server-side binary frame handling, same as the gateway.
        const envelope = decodeEnvelope(new Uint8Array(data));
        if (envelope.kind === WireKind.SUBMIT_COMMANDS) {
          for (const command of decodeCommandList(envelope.payload)) {
            rt.submitCommand(slot, command);
          }
        } else if (envelope.kind === WireKind.CHECKSUM_REPORT) {
          const report = decodeChecksum(envelope.payload);
          rt.reportChecksum(slot, report.tick, report.checksum);
        }
      });
    });

    // ── Client side: two independent clients ─────────────────────────────
    const simPlayers = playerConfigs.map((p) => ({ name: p.name, factionId: p.factionId, type: p.type, team: p.team }));

    for (let i = 0; i < 2; i++) {
      const socket = new WsClient(`ws://127.0.0.1:${PORT}`);
      socket.binaryType = 'arraybuffer';
      const client: HarnessClient = {
        socket,
        sim: new GameSimulation(909001),
        playerIndex: i,
        ticksApplied: 0,
        outSeq: 0,
        serverChecksums: new Map(),
        localChecksums: new Map(),
        matchStartReceived: false,
        gameOver: null,
        desyncs: 0,
      };
      client.sim.initMatch(simPlayers, 10000);
      clients.push(client);

      socket.on('message', (data: ArrayBuffer) => {
        const envelope = decodeEnvelope(new Uint8Array(data as ArrayBuffer));
        switch (envelope.kind) {
          case WireKind.MATCH_START_JSON: {
            const info = decodeJsonPayload<{ seed: number; players: unknown[] }>(envelope.payload);
            expect(info.seed).toBe(909001);
            expect(info.players).toHaveLength(2);
            client.matchStartReceived = true;
            break;
          }
          case WireKind.TICK_FRAME: {
            const frame = decodeTickFrame(envelope.payload);
            // Authoritative stream: apply commands, advance exactly one tick.
            client.sim.processCommands(frame.commands);
            client.sim.step();
            client.ticksApplied++;
            const local = client.sim.calculateChecksum();
            client.localChecksums.set(frame.tick, local);
            // Report our checksum back (desync detection on the server).
            sendFrame(client, WireKind.CHECKSUM_REPORT, encodeChecksum({ tick: frame.tick, checksum: local }));
            break;
          }
          case WireKind.CHECKSUM_STATE: {
            const { tick, checksum } = decodeChecksum(envelope.payload);
            client.serverChecksums.set(tick, checksum);
            const local = client.localChecksums.get(tick);
            if (local !== undefined && local !== checksum) client.desyncs++;
            break;
          }
          case WireKind.GAME_OVER_JSON: {
            client.gameOver = decodeJsonPayload<{ winnerTeam: number; desyncEvents: number }>(envelope.payload);
            break;
          }
        }
      });

      serverSocketsReady.push(new Promise<void>((resolve) => socket.on('open', () => resolve())));
    }

    await Promise.all(serverSocketsReady);
    // Let the server register both sockets.
    await new Promise((r) => setTimeout(r, 50));

    // ── Run the authoritative match ───────────────────────────────────────
    runtime.start();

    // Both clients issue real commands mid-match.
    const buildP0: PlayerCommand = { type: CommandType.BUILD_STRUCTURE, structureId: 'SU_ThermalPower', gridX: 22, gridY: 14, entityIds: [], playerIndex: 0, tick: 0 };
    const buildP1: PlayerCommand = { type: CommandType.BUILD_STRUCTURE, structureId: 'AL_FissionReactor', gridX: 106, gridY: 108, entityIds: [], playerIndex: 1, tick: 0 };

    await new Promise((r) => setTimeout(r, 200));
    sendFrame(clients[0], WireKind.SUBMIT_COMMANDS, encodeCommandList([buildP0]));
    sendFrame(clients[1], WireKind.SUBMIT_COMMANDS, encodeCommandList([buildP1]));

    // Let the match run long enough for several checksum broadcasts (90-tick
    // interval at 30 Hz ⇒ ~3 s per broadcast).
    await new Promise((r) => setTimeout(r, 4000));
    runtime.stop();
    // Drain in-flight frames.
    await new Promise((r) => setTimeout(r, 200));

    // ── Assertions ────────────────────────────────────────────────────────
    expect(clients[0].matchStartReceived, 'client 0 received MATCH_START').toBe(true);
    expect(clients[1].matchStartReceived, 'client 1 received MATCH_START').toBe(true);

    expect(clients[0].ticksApplied, 'client 0 applied authoritative ticks').toBeGreaterThan(30);
    expect(clients[1].ticksApplied, 'client 1 applied authoritative ticks').toBeGreaterThan(30);

    // Every server checksum broadcast the clients compared must have matched.
    expect(clients[0].serverChecksums.size, 'client 0 got checksum broadcasts').toBeGreaterThan(0);
    expect(clients[0].desyncs, 'client 0 desyncs').toBe(0);
    expect(clients[1].desyncs, 'client 1 desyncs').toBe(0);

    // The server recorded no desync from either client's reports.
    expect(rt.desyncEvents, `server desyncs: ${JSON.stringify(rt.desyncEvents.slice(0, 3))}`).toHaveLength(0);

    // Both clients converge to the same state as each other at their last
    // common tick, proving the authoritative stream is the only time source.
    const commonTicks = [...clients[0].localChecksums.keys()].filter((t) => clients[1].localChecksums.has(t));
    expect(commonTicks.length).toBeGreaterThan(30);
    for (const tick of commonTicks) {
      expect(clients[0].localChecksums.get(tick), `tick ${tick} client parity`).toBe(clients[1].localChecksums.get(tick));
    }

    // Player 0's build command reached the authoritative simulation.
    // The starting base has no power plant, so this must be the built one.
    let p0Power = 0;
    for (const e of rt.sim.entities.values()) {
      if (e.playerIndex === 0 && e.specId === 'SU_ThermalPower') p0Power++;
    }
    expect(p0Power, 'player 0 built a thermal power plant via the server').toBeGreaterThanOrEqual(1);

    // And player 1's Alliance plant likewise — proving BOTH clients' commands
    // are accepted, not just the first socket's.
    let p1Power = 0;
    for (const e of rt.sim.entities.values()) {
      if (e.playerIndex === 1 && e.specId === 'AL_FissionReactor') p1Power++;
    }
    expect(p1Power, 'player 1 built an Alliance power plant via the server').toBeGreaterThanOrEqual(1);
  }, 20000);

  it('a client sending a foreign-entity order is rejected server-side and never enters the stream', async () => {
    const playerConfigs: MatchPlayerSession[] = [
      { playerIndex: 0, name: 'P0', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
      { playerIndex: 1, name: 'P1', factionId: FactionId.USSR, team: 1, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-1' },
    ];
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 909002);
    const rt = runtime;

    wss = new WebSocketServer({ port: PORT + 1 });
    let slotCounter = 0;
    const streamedCommands: PlayerCommand[] = [];

    wss.on('connection', (socket) => {
      const slot = slotCounter++;
      rt.players.get(slot)!.ws = socket as unknown as import('ws').WebSocket;
      socket.on('message', (data: Buffer) => {
        const envelope = decodeEnvelope(new Uint8Array(data));
        if (envelope.kind === WireKind.SUBMIT_COMMANDS) {
          for (const command of decodeCommandList(envelope.payload)) {
            rt.submitCommand(slot, command);
          }
        }
      });
    });

    const socket = new WsClient(`ws://127.0.0.1:${PORT + 1}`);
    socket.binaryType = 'arraybuffer';
    const cheatClient: HarnessClient = {
      socket, sim: new GameSimulation(909002), playerIndex: 0, ticksApplied: 0, outSeq: 0,
      serverChecksums: new Map(), localChecksums: new Map(), matchStartReceived: false, gameOver: null, desyncs: 0,
    };
    clients.push(cheatClient);
    socket.on('message', (data: ArrayBuffer) => {
      const envelope = decodeEnvelope(new Uint8Array(data as ArrayBuffer));
      if (envelope.kind === WireKind.TICK_FRAME) {
        streamedCommands.push(...decodeTickFrame(envelope.payload).commands);
      }
    });
    await new Promise<void>((resolve) => socket.on('open', () => resolve()));
    await new Promise((r) => setTimeout(r, 50));

    // Find an entity owned by player 1 and try to order it as player 0.
    let enemyId = -1;
    for (const e of rt.sim.entities.values()) {
      if (e.playerIndex === 1 && !e.isBuilding) { enemyId = e.id; break; }
    }
    expect(enemyId).toBeGreaterThan(0);

    runtime.start();
    sendFrame(cheatClient, WireKind.SUBMIT_COMMANDS, encodeCommandList([
      { type: CommandType.MOVE, entityIds: [enemyId], targetX: 5000, targetY: 5000, playerIndex: 0, tick: 0 },
    ]));
    await new Promise((r) => setTimeout(r, 500));
    runtime.stop();

    // The cheat command must never appear in the authoritative stream.
    const leaked = streamedCommands.some((c) => c.type === CommandType.MOVE && c.entityIds.includes(enemyId));
    expect(leaked, 'foreign-entity order leaked into authoritative stream').toBe(false);
  }, 20000);
});
