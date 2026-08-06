"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ws_1 = require("ws");
const matchRuntime_js_1 = require("../matches/matchRuntime.js");
const sim_core_1 = require("@ra4/sim-core");
const netcode_1 = require("@ra4/netcode");
const shared_types_1 = require("@ra4/shared-types");
/** Send a Protocol v1 envelope, exactly as ProtocolChannel would. */
function sendFrame(client, kind, payload) {
    client.outSeq += 1;
    client.socket.send((0, netcode_1.encodeEnvelope)(kind, client.outSeq, 0, payload));
}
const PORT = 18234;
(0, vitest_1.describe)('Multiplayer E2E over real WebSocket (Protocol v1)', () => {
    let wss = null;
    let runtime = null;
    const clients = [];
    (0, vitest_1.afterEach)(async () => {
        runtime?.stop();
        runtime = null;
        for (const c of clients)
            c.socket.close();
        clients.length = 0;
        await new Promise((resolve) => {
            if (!wss)
                return resolve();
            wss.close(() => resolve());
            wss = null;
        });
    });
    (0, vitest_1.it)('two clients over real sockets stay checksum-identical to the server and detect no desync', async () => {
        const playerConfigs = [
            { playerIndex: 0, name: 'P0', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
            { playerIndex: 1, name: 'P1', factionId: shared_types_1.FactionId.ALLIANCE, team: 1, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-1' },
        ];
        // ── Server side: real WS server bound to a real match runtime ─────────
        runtime = new matchRuntime_js_1.AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 909001);
        const rt = runtime;
        wss = new ws_1.WebSocketServer({ port: PORT });
        let nextSlot = 0;
        const serverSocketsReady = [];
        wss.on('connection', (socket) => {
            const slot = nextSlot++;
            const session = rt.players.get(slot);
            session.ws = socket;
            session.isConnected = true;
            socket.on('message', (data) => {
                // Server-side binary frame handling, same as the gateway.
                const envelope = (0, netcode_1.decodeEnvelope)(new Uint8Array(data));
                if (envelope.kind === netcode_1.WireKind.SUBMIT_COMMANDS) {
                    for (const command of (0, netcode_1.decodeCommandList)(envelope.payload)) {
                        rt.submitCommand(slot, command);
                    }
                }
                else if (envelope.kind === netcode_1.WireKind.CHECKSUM_REPORT) {
                    const report = (0, netcode_1.decodeChecksum)(envelope.payload);
                    rt.reportChecksum(slot, report.tick, report.checksum);
                }
            });
        });
        // ── Client side: two independent clients ─────────────────────────────
        const simPlayers = playerConfigs.map((p) => ({ name: p.name, factionId: p.factionId, type: p.type, team: p.team }));
        for (let i = 0; i < 2; i++) {
            const socket = new ws_1.WebSocket(`ws://127.0.0.1:${PORT}`);
            socket.binaryType = 'arraybuffer';
            const client = {
                socket,
                sim: new sim_core_1.GameSimulation(909001),
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
            socket.on('message', (data) => {
                const envelope = (0, netcode_1.decodeEnvelope)(new Uint8Array(data));
                switch (envelope.kind) {
                    case netcode_1.WireKind.MATCH_START_JSON: {
                        const info = (0, netcode_1.decodeJsonPayload)(envelope.payload);
                        (0, vitest_1.expect)(info.seed).toBe(909001);
                        (0, vitest_1.expect)(info.players).toHaveLength(2);
                        client.matchStartReceived = true;
                        break;
                    }
                    case netcode_1.WireKind.TICK_FRAME: {
                        const frame = (0, netcode_1.decodeTickFrame)(envelope.payload);
                        // Authoritative stream: apply commands, advance exactly one tick.
                        client.sim.processCommands(frame.commands);
                        client.sim.step();
                        client.ticksApplied++;
                        const local = client.sim.calculateChecksum();
                        client.localChecksums.set(frame.tick, local);
                        // Report our checksum back (desync detection on the server).
                        sendFrame(client, netcode_1.WireKind.CHECKSUM_REPORT, (0, netcode_1.encodeChecksum)({ tick: frame.tick, checksum: local }));
                        break;
                    }
                    case netcode_1.WireKind.CHECKSUM_STATE: {
                        const { tick, checksum } = (0, netcode_1.decodeChecksum)(envelope.payload);
                        client.serverChecksums.set(tick, checksum);
                        const local = client.localChecksums.get(tick);
                        if (local !== undefined && local !== checksum)
                            client.desyncs++;
                        break;
                    }
                    case netcode_1.WireKind.GAME_OVER_JSON: {
                        client.gameOver = (0, netcode_1.decodeJsonPayload)(envelope.payload);
                        break;
                    }
                }
            });
            serverSocketsReady.push(new Promise((resolve) => socket.on('open', () => resolve())));
        }
        await Promise.all(serverSocketsReady);
        // Let the server register both sockets.
        await new Promise((r) => setTimeout(r, 50));
        // ── Run the authoritative match ───────────────────────────────────────
        runtime.start();
        // Both clients issue real commands mid-match.
        const buildP0 = { type: shared_types_1.CommandType.BUILD_STRUCTURE, structureId: 'SU_ThermalPower', gridX: 22, gridY: 14, entityIds: [], playerIndex: 0, tick: 0 };
        const buildP1 = { type: shared_types_1.CommandType.BUILD_STRUCTURE, structureId: 'AL_FissionReactor', gridX: 106, gridY: 108, entityIds: [], playerIndex: 1, tick: 0 };
        await new Promise((r) => setTimeout(r, 200));
        sendFrame(clients[0], netcode_1.WireKind.SUBMIT_COMMANDS, (0, netcode_1.encodeCommandList)([buildP0]));
        sendFrame(clients[1], netcode_1.WireKind.SUBMIT_COMMANDS, (0, netcode_1.encodeCommandList)([buildP1]));
        // Let the match run long enough for several checksum broadcasts (90-tick
        // interval at 30 Hz ⇒ ~3 s per broadcast).
        await new Promise((r) => setTimeout(r, 4000));
        runtime.stop();
        // Drain in-flight frames.
        await new Promise((r) => setTimeout(r, 200));
        // ── Assertions ────────────────────────────────────────────────────────
        (0, vitest_1.expect)(clients[0].matchStartReceived, 'client 0 received MATCH_START').toBe(true);
        (0, vitest_1.expect)(clients[1].matchStartReceived, 'client 1 received MATCH_START').toBe(true);
        (0, vitest_1.expect)(clients[0].ticksApplied, 'client 0 applied authoritative ticks').toBeGreaterThan(30);
        (0, vitest_1.expect)(clients[1].ticksApplied, 'client 1 applied authoritative ticks').toBeGreaterThan(30);
        // Every server checksum broadcast the clients compared must have matched.
        (0, vitest_1.expect)(clients[0].serverChecksums.size, 'client 0 got checksum broadcasts').toBeGreaterThan(0);
        (0, vitest_1.expect)(clients[0].desyncs, 'client 0 desyncs').toBe(0);
        (0, vitest_1.expect)(clients[1].desyncs, 'client 1 desyncs').toBe(0);
        // The server recorded no desync from either client's reports.
        (0, vitest_1.expect)(rt.desyncEvents, `server desyncs: ${JSON.stringify(rt.desyncEvents.slice(0, 3))}`).toHaveLength(0);
        // Both clients converge to the same state as each other at their last
        // common tick, proving the authoritative stream is the only time source.
        const commonTicks = [...clients[0].localChecksums.keys()].filter((t) => clients[1].localChecksums.has(t));
        (0, vitest_1.expect)(commonTicks.length).toBeGreaterThan(30);
        for (const tick of commonTicks) {
            (0, vitest_1.expect)(clients[0].localChecksums.get(tick), `tick ${tick} client parity`).toBe(clients[1].localChecksums.get(tick));
        }
        // Player 0's build command reached the authoritative simulation.
        // The starting base has no power plant, so this must be the built one.
        let p0Power = 0;
        for (const e of rt.sim.entities.values()) {
            if (e.playerIndex === 0 && e.specId === 'SU_ThermalPower')
                p0Power++;
        }
        (0, vitest_1.expect)(p0Power, 'player 0 built a thermal power plant via the server').toBeGreaterThanOrEqual(1);
        // And player 1's Alliance plant likewise — proving BOTH clients' commands
        // are accepted, not just the first socket's.
        let p1Power = 0;
        for (const e of rt.sim.entities.values()) {
            if (e.playerIndex === 1 && e.specId === 'AL_FissionReactor')
                p1Power++;
        }
        (0, vitest_1.expect)(p1Power, 'player 1 built an Alliance power plant via the server').toBeGreaterThanOrEqual(1);
    }, 20000);
    (0, vitest_1.it)('a client sending a foreign-entity order is rejected server-side and never enters the stream', async () => {
        const playerConfigs = [
            { playerIndex: 0, name: 'P0', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
            { playerIndex: 1, name: 'P1', factionId: shared_types_1.FactionId.USSR, team: 1, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-1' },
        ];
        runtime = new matchRuntime_js_1.AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 909002);
        const rt = runtime;
        wss = new ws_1.WebSocketServer({ port: PORT + 1 });
        let slotCounter = 0;
        const streamedCommands = [];
        wss.on('connection', (socket) => {
            const slot = slotCounter++;
            rt.players.get(slot).ws = socket;
            socket.on('message', (data) => {
                const envelope = (0, netcode_1.decodeEnvelope)(new Uint8Array(data));
                if (envelope.kind === netcode_1.WireKind.SUBMIT_COMMANDS) {
                    for (const command of (0, netcode_1.decodeCommandList)(envelope.payload)) {
                        rt.submitCommand(slot, command);
                    }
                }
            });
        });
        const socket = new ws_1.WebSocket(`ws://127.0.0.1:${PORT + 1}`);
        socket.binaryType = 'arraybuffer';
        const cheatClient = {
            socket, sim: new sim_core_1.GameSimulation(909002), playerIndex: 0, ticksApplied: 0, outSeq: 0,
            serverChecksums: new Map(), localChecksums: new Map(), matchStartReceived: false, gameOver: null, desyncs: 0,
        };
        clients.push(cheatClient);
        socket.on('message', (data) => {
            const envelope = (0, netcode_1.decodeEnvelope)(new Uint8Array(data));
            if (envelope.kind === netcode_1.WireKind.TICK_FRAME) {
                streamedCommands.push(...(0, netcode_1.decodeTickFrame)(envelope.payload).commands);
            }
        });
        await new Promise((resolve) => socket.on('open', () => resolve()));
        await new Promise((r) => setTimeout(r, 50));
        // Find an entity owned by player 1 and try to order it as player 0.
        let enemyId = -1;
        for (const e of rt.sim.entities.values()) {
            if (e.playerIndex === 1 && !e.isBuilding) {
                enemyId = e.id;
                break;
            }
        }
        (0, vitest_1.expect)(enemyId).toBeGreaterThan(0);
        runtime.start();
        sendFrame(cheatClient, netcode_1.WireKind.SUBMIT_COMMANDS, (0, netcode_1.encodeCommandList)([
            { type: shared_types_1.CommandType.MOVE, entityIds: [enemyId], targetX: 5000, targetY: 5000, playerIndex: 0, tick: 0 },
        ]));
        await new Promise((r) => setTimeout(r, 500));
        runtime.stop();
        // The cheat command must never appear in the authoritative stream.
        const leaked = streamedCommands.some((c) => c.type === shared_types_1.CommandType.MOVE && c.entityIds.includes(enemyId));
        (0, vitest_1.expect)(leaked, 'foreign-entity order leaked into authoritative stream').toBe(false);
    }, 20000);
});
//# sourceMappingURL=multiplayerE2E.test.js.map