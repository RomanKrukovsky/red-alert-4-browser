"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthoritativeMatchRuntime = exports.RECONNECT_WINDOW_MS = void 0;
const ws_1 = require("ws");
const node_crypto_1 = __importDefault(require("node:crypto"));
const sim_core_1 = require("@ra4/sim-core");
const netcode_1 = require("@ra4/netcode");
const replay_1 = require("@ra4/replay");
const shared_types_1 = require("@ra4/shared-types");
const db_js_1 = require("../persistence/db.js");
const schema_js_1 = require("../persistence/schema.js");
/** Reconnect window: a disconnected player may resume within this period. */
exports.RECONNECT_WINDOW_MS = 90_000;
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
class AuthoritativeMatchRuntime {
    matchId;
    seed;
    mapId;
    matchState = shared_types_1.MatchState.IN_GAME;
    sim;
    replayRecorder;
    players = new Map();
    tickBuffer = [];
    snapshotHistory = new Map();
    desyncEvents = [];
    timer = null;
    tickRateHz = 30;
    tickIntervalMs = 33; // ~33.33ms (30 Hz)
    checksumBroadcastInterval = 90; // every 3 s
    /** Commands accepted per player per tick (anti-flood). */
    maxCommandsPerPlayerPerTick = 32;
    commandCountThisTick = new Map();
    constructor(mapId, playerConfigs, seed = 1337) {
        this.matchId = node_crypto_1.default.randomUUID();
        this.mapId = mapId;
        this.seed = seed;
        // The room's selected map is authoritative for the simulation.
        this.sim = new sim_core_1.GameSimulation(seed, undefined, undefined, mapId);
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
        this.replayRecorder = new replay_1.ReplayRecorderV2({
            mapId,
            seed,
            tickRate: this.tickRateHz,
            simVersion: '1.0.0',
            contentHash: 'sha256_official',
            protocolVersion: netcode_1.PROTOCOL_VERSION,
            players: simConfigs,
            startingCredits: 10000,
            recordedAtIso: new Date().toISOString(),
        });
    }
    start() {
        const initialSnapshot = this.sim.createSnapshot();
        this.snapshotHistory.set(0, initialSnapshot);
        this.broadcastKind(netcode_1.WireKind.MATCH_START_JSON, (0, netcode_1.encodeJsonPayload)({
            matchId: this.matchId,
            seed: this.seed,
            tickRate: this.tickRateHz,
            mapId: this.mapId,
            // Exact player configs in authoritative slot order — the client must
            // initialize its local simulation from the identical config, never
            // infer factions from the snapshot.
            players: Array.from(this.players.values())
                .sort((a, b) => a.playerIndex - b.playerIndex)
                .map((p) => ({ name: p.name, factionId: p.factionId, type: p.type, team: p.team })),
            startingCredits: 10000,
            initialSnapshot,
        }));
        // 30 Hz Fixed-Step Authoritative Loop
        this.timer = setInterval(() => {
            this.tick();
        }, this.tickIntervalMs);
    }
    submitCommand(playerIndex, command) {
        if (this.matchState !== shared_types_1.MatchState.IN_GAME) {
            return { valid: false, reason: 'Match is not in progress' };
        }
        const count = this.commandCountThisTick.get(playerIndex) ?? 0;
        if (count >= this.maxCommandsPerPlayerPerTick) {
            return { valid: false, reason: 'Command rate limit exceeded' };
        }
        const validation = (0, netcode_1.validatePlayerCommand)(command, this.sim, playerIndex);
        if (!validation.valid) {
            return validation;
        }
        this.commandCountThisTick.set(playerIndex, count + 1);
        this.tickBuffer.push(command);
        return { valid: true };
    }
    /** Client checksum report — compare against recorded server checksums. */
    reportChecksum(playerIndex, tick, checksum) {
        const player = this.players.get(playerIndex);
        if (!player)
            return;
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
    tick() {
        if (this.matchState !== shared_types_1.MatchState.IN_GAME)
            return;
        const currentCommands = [...this.tickBuffer];
        this.tickBuffer = [];
        this.commandCountThisTick.clear();
        // Apply commands to sim-core
        this.sim.processCommands(currentCommands);
        const snapshot = this.sim.step();
        // Record replay frame (v2: sim reference for checkpoints/keyframes)
        this.replayRecorder.recordTick(this.sim, snapshot.tick, currentCommands);
        // Broadcast binary tick frame to clients
        this.broadcastKind(netcode_1.WireKind.TICK_FRAME, (0, netcode_1.encodeTickFrame)({ tick: snapshot.tick, commands: currentCommands }));
        // Periodic authoritative checksum for client-side desync detection
        if (snapshot.tick % this.checksumBroadcastInterval === 0) {
            this.broadcastKind(netcode_1.WireKind.CHECKSUM_STATE, (0, netcode_1.encodeChecksum)({ tick: snapshot.tick, checksum: snapshot.checksum }));
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
                && nowMs - player.disconnectedAtMs > exports.RECONNECT_WINDOW_MS
                && player.type === shared_types_1.PlayerType.HUMAN
                && !this.sim.surrenderedPlayers.has(player.playerIndex)) {
                console.log(`[MatchRuntime] Player ${player.playerIndex} exceeded reconnect window — auto-surrender.`);
                this.sim.processCommands([{ type: 'SURRENDER', entityIds: [], playerIndex: player.playerIndex, tick: this.sim.tickIndex }]);
            }
        }
        // Check game over victory conditions
        if (this.sim.matchState === shared_types_1.MatchState.FINISHED) {
            this.finishMatch('TEAM_DESTRUCTION');
        }
    }
    handleReconnect(playerIndex, reconnectToken, _lastTick, ws) {
        const player = this.players.get(playerIndex);
        if (!player || player.reconnectToken !== reconnectToken) {
            return false;
        }
        if (player.disconnectedAtMs !== undefined && Date.now() - player.disconnectedAtMs > exports.RECONNECT_WINDOW_MS) {
            return false; // window expired
        }
        player.ws = ws;
        player.isConnected = true;
        player.disconnectedAtMs = undefined;
        // Send the latest available snapshot for state restore
        const latestAvailableTick = Math.max(...Array.from(this.snapshotHistory.keys()), 0);
        const latestSnapshot = this.snapshotHistory.get(latestAvailableTick) || this.sim.createSnapshot();
        this.sendTo(player, netcode_1.WireKind.SNAPSHOT_JSON, (0, netcode_1.encodeJsonPayload)({ snapshot: latestSnapshot }));
        return true;
    }
    handleDisconnect(playerIndex) {
        const player = this.players.get(playerIndex);
        if (player) {
            player.isConnected = false;
            player.ws = null;
            player.disconnectedAtMs = Date.now();
        }
    }
    async finishMatch(reason) {
        this.matchState = shared_types_1.MatchState.FINISHED;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        const winningTeam = this.sim.winnerTeam;
        const winningPlayerIndices = Array.from(this.players.values())
            .filter(p => p.team === winningTeam)
            .map(p => p.playerIndex);
        this.replayRecorder.recordResult(winningTeam, reason);
        this.broadcastKind(netcode_1.WireKind.GAME_OVER_JSON, (0, netcode_1.encodeJsonPayload)({
            winnerTeam: winningTeam,
            winningPlayerIndices,
            reason,
            finalChecksum: this.sim.calculateChecksum(),
            desyncEvents: this.desyncEvents.length,
        }));
        // Save match results to DB if connected
        if (db_js_1.isDbConnected && db_js_1.db) {
            try {
                const [insertedMatch] = await db_js_1.db.insert(schema_js_1.matches).values({
                    id: this.matchId,
                    mapId: this.mapId,
                    seed: this.seed,
                    durationTicks: this.sim.tickIndex,
                    winnerTeam: winningTeam,
                    finishReason: reason,
                    finishedAt: new Date(),
                }).returning();
                for (const p of this.players.values()) {
                    await db_js_1.db.insert(schema_js_1.matchPlayers).values({
                        matchId: insertedMatch.id,
                        userId: p.userId ?? null,
                        playerIndex: p.playerIndex,
                        factionId: p.factionId,
                        team: p.team,
                        isWinner: p.team === winningTeam,
                    });
                }
                const replayBytes = this.replayRecorder.export();
                await db_js_1.db.insert(schema_js_1.replays).values({
                    matchId: insertedMatch.id,
                    contentVersionHash: 'sha256_official',
                    simCoreVersion: '1.0.0',
                    replayJson: { formatVersion: 2, base64: Buffer.from(replayBytes).toString('base64') },
                    checksumFinal: this.sim.calculateChecksum(),
                });
                console.log(`[MatchRuntime] Successfully persisted match ${this.matchId} to DB.`);
            }
            catch (err) {
                console.error(`[MatchRuntime] Error persisting match ${this.matchId}:`, err);
            }
        }
    }
    /** Export the replay bytes (for tests / download endpoints). */
    exportReplay() {
        return this.replayRecorder.export();
    }
    sendTo(player, kind, payload) {
        if (player.ws && player.ws.readyState === ws_1.WebSocket.OPEN) {
            player.outSeq = (player.outSeq ?? 0) + 1;
            player.ws.send((0, netcode_1.encodeEnvelope)(kind, player.outSeq, player.lastAckTick, payload));
        }
    }
    broadcastKind(kind, payload) {
        for (const player of this.players.values()) {
            this.sendTo(player, kind, payload);
        }
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
exports.AuthoritativeMatchRuntime = AuthoritativeMatchRuntime;
//# sourceMappingURL=matchRuntime.js.map