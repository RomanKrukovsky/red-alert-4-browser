"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const env_js_1 = require("./config/env.js");
const db_js_1 = require("./persistence/db.js");
const redis_js_1 = require("./persistence/redis.js");
const service_js_1 = require("./auth/service.js");
const roomManager_js_1 = require("./lobby/roomManager.js");
const matchRuntime_js_1 = require("./matches/matchRuntime.js");
const matchmaker_js_1 = require("./matchmaking/matchmaker.js");
const metrics_js_1 = require("./observability/metrics.js");
const GIT_COMMIT = process.env.GIT_COMMIT || 'development-commit';
const SERVER_VERSION = '1.0.0';
const fastify = (0, fastify_1.default)({
    logger: false, // We use pino logger instance
    disableRequestLogging: true,
});
const roomManager = new roomManager_js_1.RoomManager();
/**
 * Live sockets per room slot. Needed so START_MATCH can attach EVERY
 * connected player's socket to the match runtime — otherwise only the
 * initiating player would receive the authoritative tick stream.
 */
const roomSockets = new Map();
/** Room id → live authoritative match, so all sockets in a room resolve it. */
const roomMatches = new Map();
function registerRoomSocket(roomId, slotIndex, socket) {
    let slots = roomSockets.get(roomId);
    if (!slots) {
        slots = new Map();
        roomSockets.set(roomId, slots);
    }
    slots.set(slotIndex, socket);
}
function unregisterRoomSocket(roomId, slotIndex) {
    roomSockets.get(roomId)?.delete(slotIndex);
}
const matchmaker = new matchmaker_js_1.Matchmaker();
const activeMatches = new Map();
async function main() {
    metrics_js_1.logger.info({
        serverVersion: SERVER_VERSION,
        gitCommit: GIT_COMMIT,
        protocolVersion: env_js_1.env.PROTOCOL_VERSION,
        contentVersion: env_js_1.env.CONTENT_VERSION,
        simCoreVersion: env_js_1.env.SIM_CORE_VERSION,
    }, '[Bootstrap] Initializing RA4 Authoritative Game Server...');
    // Initialize DB and Redis
    await (0, db_js_1.initDb)();
    await (0, redis_js_1.initRedis)();
    // Register Fastify plugins
    await fastify.register(cors_1.default, { origin: true });
    await fastify.register(jwt_1.default, { secret: env_js_1.env.JWT_SECRET });
    await fastify.register(rate_limit_1.default, { max: env_js_1.env.RATE_LIMIT_MAX, timeWindow: '1 minute' });
    await fastify.register(websocket_1.default);
    // Request counter hook
    fastify.addHook('onRequest', async (req, reply) => {
        metrics_js_1.httpRequestsTotal.inc({ method: req.method, route: req.routeOptions.url || req.url, status_code: reply.statusCode });
    });
    // Health and Readiness endpoints
    fastify.get('/health', async () => ({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    }));
    fastify.get('/ready', async () => ({
        status: 'ready',
        versions: {
            server: SERVER_VERSION,
            gitCommit: GIT_COMMIT,
            protocol: env_js_1.env.PROTOCOL_VERSION,
            content: env_js_1.env.CONTENT_VERSION,
            simCore: env_js_1.env.SIM_CORE_VERSION,
        },
        activeMatches: activeMatches.size,
        publicRooms: roomManager.listPublicRooms().length,
    }));
    // Prometheus Metrics endpoint
    fastify.get('/metrics', async (req, reply) => {
        reply.type(metrics_js_1.register.contentType);
        return metrics_js_1.register.metrics();
    });
    // HTTP API V1 Routes
    fastify.post('/api/v1/auth/guest', async () => {
        const guestUser = await service_js_1.AuthService.createGuestSession();
        const token = fastify.jwt.sign({ userId: guestUser.id, role: guestUser.role, nickname: guestUser.nickname });
        return { token, user: { id: guestUser.id, nickname: guestUser.nickname, role: guestUser.role } };
    });
    fastify.post('/api/v1/auth/register', async (req, reply) => {
        const { nickname, password, email, secretKey } = req.body;
        try {
            const newUser = await service_js_1.AuthService.register(nickname, password, email, secretKey);
            const token = fastify.jwt.sign({ userId: newUser.id, role: newUser.role, nickname: newUser.nickname });
            return { token, user: { id: newUser.id, nickname: newUser.nickname, role: newUser.role } };
        }
        catch (err) {
            reply.status(400);
            return { error: err.message };
        }
    });
    fastify.post('/api/v1/auth/login', async (req, reply) => {
        const { identifier, password } = req.body;
        try {
            const user = await service_js_1.AuthService.login(identifier, password, req.ip);
            const token = fastify.jwt.sign({ userId: user.id, role: user.role, nickname: user.nickname });
            return { token, user: { id: user.id, nickname: user.nickname, role: user.role } };
        }
        catch (err) {
            reply.status(401);
            return { error: err.message };
        }
    });
    fastify.get('/api/v1/users/profile', async (req, reply) => {
        try {
            await req.jwtVerify();
            const payload = req.user;
            const data = await service_js_1.AuthService.getProfile(payload.userId);
            return data ?? { error: 'Profile not found' };
        }
        catch {
            reply.status(401);
            return { error: 'Unauthorized' };
        }
    });
    // WebSocket Gateway Route
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        metrics_js_1.activeWebSocketConnections.inc();
        metrics_js_1.logger.info({ ip: req.ip }, '[WS] Client connected to WebSocket Gateway');
        let currentRoomId = 'default-room';
        let playerIndex = 0;
        let currentMatch = null;
        let userRole = 'player';
        let userId = 'guest-anon';
        socket.on('message', async (data) => {
            try {
                // Protocol v1 binary frames (match-critical path): magic 'RA'.
                if (Buffer.isBuffer(data) && data.length >= 2 && data[0] === 0x52 && data[1] === 0x41) {
                    const { decodeEnvelope, decodeCommandList, decodeChecksum, WireKind } = await Promise.resolve().then(() => __importStar(require('@ra4/netcode')));
                    const envelope = decodeEnvelope(new Uint8Array(data));
                    // Resolve the live match from the room binding: a non-initiating
                    // player's socket closure has no currentMatch of its own.
                    const match = currentMatch ?? (currentRoomId ? roomMatches.get(currentRoomId) ?? null : null);
                    if (match && !currentMatch)
                        currentMatch = match;
                    switch (envelope.kind) {
                        case WireKind.SUBMIT_COMMANDS: {
                            if (match) {
                                for (const command of decodeCommandList(envelope.payload)) {
                                    const res = match.submitCommand(playerIndex, command);
                                    if (!res.valid) {
                                        metrics_js_1.rejectedCommandsTotal.inc({ reason: res.reason || 'invalid' });
                                    }
                                }
                            }
                            break;
                        }
                        case WireKind.CHECKSUM_REPORT: {
                            if (match) {
                                const report = decodeChecksum(envelope.payload);
                                match.reportChecksum(playerIndex, report.tick, report.checksum);
                            }
                            break;
                        }
                        case WireKind.HEARTBEAT:
                            break;
                        default:
                            break;
                    }
                    return;
                }
                const msg = JSON.parse(data.toString());
                switch (msg.type) {
                    case 'JOIN_LOBBY': {
                        const result = roomManager.joinRoom(msg.roomId || 'default-room', msg.playerName, userId);
                        currentRoomId = result.room.id;
                        playerIndex = result.slotIndex;
                        registerRoomSocket(currentRoomId, playerIndex, socket);
                        // Broadcast the updated lobby to every player in the room so
                        // joins/leaves are visible to all, not just the joiner.
                        const lobbyState = roomManager.getLobbyState(result.room);
                        const lobbyFrame = JSON.stringify({ type: 'LOBBY_STATE', state: lobbyState });
                        for (const peer of roomSockets.get(currentRoomId)?.values() ?? []) {
                            if (peer.readyState === 1)
                                peer.send(lobbyFrame);
                        }
                        break;
                    }
                    case 'SET_SLOT': {
                        if (currentRoomId) {
                            const room = roomManager.setSlotConfig(currentRoomId, msg.slotIndex, msg.factionId, msg.playerType, msg.team);
                            socket.send(JSON.stringify({ type: 'LOBBY_STATE', state: roomManager.getLobbyState(room) }));
                        }
                        break;
                    }
                    case 'SET_READY': {
                        if (currentRoomId) {
                            const room = roomManager.setReady(currentRoomId, playerIndex, msg.isReady);
                            socket.send(JSON.stringify({ type: 'LOBBY_STATE', state: roomManager.getLobbyState(room) }));
                        }
                        break;
                    }
                    case 'START_MATCH': {
                        if (currentRoomId) {
                            const room = roomManager.getRoom(currentRoomId);
                            if (room) {
                                const slotSockets = roomSockets.get(currentRoomId);
                                // Attach EVERY connected player's socket, not just the
                                // initiator's — all clients must receive the tick stream.
                                const matchPlayers = room.slots.map(s => ({
                                    playerIndex: s.index,
                                    name: s.name,
                                    factionId: s.factionId,
                                    team: s.team,
                                    type: s.type,
                                    ws: slotSockets?.get(s.index) ?? null,
                                    isConnected: Boolean(slotSockets?.get(s.index)),
                                    lastAckTick: 0,
                                    reconnectToken: `token-${s.index}`,
                                }));
                                const runtime = new matchRuntime_js_1.AuthoritativeMatchRuntime(room.mapId, matchPlayers);
                                activeMatches.set(runtime.matchId, runtime);
                                // Room→match binding so every player's socket handler can
                                // resolve the live match, not just the initiator's closure.
                                roomMatches.set(currentRoomId, runtime);
                                metrics_js_1.activeMatchesCount.set(activeMatches.size);
                                currentMatch = runtime;
                                runtime.start();
                            }
                        }
                        break;
                    }
                    case 'SUBMIT_COMMAND': {
                        if (currentMatch) {
                            const res = currentMatch.submitCommand(playerIndex, msg.command);
                            if (!res.valid) {
                                metrics_js_1.rejectedCommandsTotal.inc({ reason: res.reason || 'invalid' });
                                socket.send(JSON.stringify({
                                    type: 'ERROR',
                                    message: `Command rejected: ${res.reason}`,
                                }));
                            }
                        }
                        break;
                    }
                    case 'RECONNECT': {
                        // activeMatches is keyed by matchId; a reconnecting client only
                        // knows its room, so resolve through the room→match binding.
                        const match = roomMatches.get(msg.roomId) ?? activeMatches.get(msg.roomId);
                        if (match) {
                            const ok = match.handleReconnect(msg.playerIndex, `token-${msg.playerIndex}`, msg.lastTick, socket);
                            if (ok) {
                                currentMatch = match;
                                currentRoomId = msg.roomId;
                                playerIndex = msg.playerIndex;
                                registerRoomSocket(msg.roomId, playerIndex, socket);
                            }
                            else {
                                socket.send(JSON.stringify({ type: 'ERROR', message: 'Reconnect failed: invalid token or window expired' }));
                            }
                        }
                        else {
                            socket.send(JSON.stringify({ type: 'ERROR', message: 'Reconnect failed: match not found' }));
                        }
                        break;
                    }
                    default:
                        break;
                }
            }
            catch (err) {
                metrics_js_1.logger.error({ err }, '[WS] Error processing message');
            }
        });
        socket.on('close', () => {
            metrics_js_1.activeWebSocketConnections.dec();
            metrics_js_1.logger.info({ userId }, '[WS] Client disconnected');
            if (currentRoomId) {
                unregisterRoomSocket(currentRoomId, playerIndex);
                roomManager.leaveRoom(currentRoomId, playerIndex);
            }
            const match = currentMatch ?? (currentRoomId ? roomMatches.get(currentRoomId) ?? null : null);
            if (match) {
                // Starts the 90 s reconnect window for this player.
                match.handleDisconnect(playerIndex);
            }
        });
    });
    // Start HTTP & WS Server
    await fastify.listen({ port: env_js_1.env.PORT, host: env_js_1.env.HOST });
    metrics_js_1.logger.info(`[RA4 Game Server] Authoritative Fastify Server running on http://${env_js_1.env.HOST}:${env_js_1.env.PORT}`);
}
// Graceful Shutdown Signal Handler
async function gracefulShutdown(signal) {
    metrics_js_1.logger.info({ signal }, '[Shutdown] Initiating graceful shutdown...');
    // Stop active match timers
    for (const match of activeMatches.values()) {
        match.stop();
    }
    await fastify.close();
    await (0, db_js_1.closeDb)();
    await (0, redis_js_1.closeRedis)();
    metrics_js_1.logger.info('[Shutdown] Server successfully shut down.');
    process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
main().catch(err => {
    metrics_js_1.logger.fatal({ err }, 'Fatal error during server startup');
    process.exit(1);
});
//# sourceMappingURL=index.js.map