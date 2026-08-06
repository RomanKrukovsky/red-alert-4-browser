import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { WebSocket } from 'ws';

import { env } from './config/env.js';
import { closeDb, initDb } from './persistence/db.js';
import { closeRedis, initRedis } from './persistence/redis.js';
import { AuthService } from './auth/service.js';
import { RoomManager } from './lobby/roomManager.js';
import { AuthoritativeMatchRuntime } from './matches/matchRuntime.js';
import { Matchmaker } from './matchmaking/matchmaker.js';
import { AdminService } from './admin/adminService.js';
import { activeMatchesCount, activeWebSocketConnections, httpRequestsTotal, logger, register, rejectedCommandsTotal } from './observability/metrics.js';
import { ClientMessage, ServerMessage } from '@ra4/shared-types';

const GIT_COMMIT = process.env.GIT_COMMIT || 'development-commit';
const SERVER_VERSION = '1.0.0';

const fastify = Fastify({
  logger: false, // We use pino logger instance
  disableRequestLogging: true,
});

const roomManager = new RoomManager();
/**
 * Live sockets per room slot. Needed so START_MATCH can attach EVERY
 * connected player's socket to the match runtime — otherwise only the
 * initiating player would receive the authoritative tick stream.
 */
const roomSockets = new Map<string, Map<number, WebSocket>>();
/** Room id → live authoritative match, so all sockets in a room resolve it. */
const roomMatches = new Map<string, AuthoritativeMatchRuntime>();

function registerRoomSocket(roomId: string, slotIndex: number, socket: WebSocket): void {
  let slots = roomSockets.get(roomId);
  if (!slots) { slots = new Map(); roomSockets.set(roomId, slots); }
  slots.set(slotIndex, socket);
}

function unregisterRoomSocket(roomId: string, slotIndex: number): void {
  roomSockets.get(roomId)?.delete(slotIndex);
}

/**
 * Broadcast lobby state to EVERY socket in a room.
 *
 * Lobby mutations (ready, faction, team, map) must reach all participants —
 * replying only to the sender left other clients showing stale state, so
 * readiness never converged and the host's start button stayed disabled.
 */
function broadcastLobbyState(roomId: string, room: Parameters<typeof roomManager.getLobbyState>[0]): void {
  const frame = JSON.stringify({ type: 'LOBBY_STATE', state: roomManager.getLobbyState(room) } as ServerMessage);
  for (const peer of roomSockets.get(roomId)?.values() ?? []) {
    if (peer.readyState === 1) peer.send(frame);
  }
}
const matchmaker = new Matchmaker();
const activeMatches = new Map<string, AuthoritativeMatchRuntime>();

/**
 * Finished-match replays kept in memory for download.
 *
 * Bounded (FIFO, 50 matches) so a long-running server cannot grow without
 * limit. Durable storage is the object-store work in the backend program;
 * until then this is what the replay endpoint serves.
 */
const REPLAY_RETENTION = 50;
interface StoredReplay {
  matchId: string;
  mapId: string;
  seed: number;
  winnerTeam: number;
  durationTicks: number;
  bytes: Buffer;
}
const finishedReplays = new Map<string, StoredReplay>();

function storeFinishedReplay(runtime: AuthoritativeMatchRuntime): void {
  try {
    finishedReplays.set(runtime.matchId, {
      matchId: runtime.matchId,
      mapId: runtime.mapId,
      seed: runtime.seed,
      winnerTeam: runtime.sim.winnerTeam,
      durationTicks: runtime.sim.tickIndex,
      bytes: Buffer.from(runtime.exportReplay()),
    });
    while (finishedReplays.size > REPLAY_RETENTION) {
      const oldest = finishedReplays.keys().next().value;
      if (oldest === undefined) break;
      finishedReplays.delete(oldest);
    }
    logger.info({ matchId: runtime.matchId }, '[Replay] Stored finished match replay');
  } catch (err) {
    logger.error({ err, matchId: runtime.matchId }, '[Replay] Failed to store replay');
  }
}

async function main() {
  logger.info({
    serverVersion: SERVER_VERSION,
    gitCommit: GIT_COMMIT,
    protocolVersion: env.PROTOCOL_VERSION,
    contentVersion: env.CONTENT_VERSION,
    simCoreVersion: env.SIM_CORE_VERSION,
  }, '[Bootstrap] Initializing RA4 Authoritative Game Server...');

  // Initialize DB and Redis
  await initDb();
  await initRedis();

  // Register Fastify plugins
  await fastify.register(fastifyCors, { origin: true });
  await fastify.register(fastifyJwt, { secret: env.JWT_SECRET });
  await fastify.register(fastifyRateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: '1 minute' });
  await fastify.register(fastifyWebsocket);

  // Request counter hook
  fastify.addHook('onRequest', async (req, reply) => {
    httpRequestsTotal.inc({ method: req.method, route: req.routeOptions.url || req.url, status_code: reply.statusCode });
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
      protocol: env.PROTOCOL_VERSION,
      content: env.CONTENT_VERSION,
      simCore: env.SIM_CORE_VERSION,
    },
    activeMatches: activeMatches.size,
    publicRooms: roomManager.listPublicRooms().length,
  }));

  // Prometheus Metrics endpoint
  fastify.get('/metrics', async (req, reply) => {
    reply.type(register.contentType);
    return register.metrics();
  });

  // ── Replay API ──────────────────────────────────────────────────────────

  /** List finished matches whose replay can be downloaded. */
  fastify.get('/api/v1/replays', async () => ({
    replays: Array.from(finishedReplays.values()).map((r) => ({
      matchId: r.matchId,
      mapId: r.mapId,
      seed: r.seed,
      winnerTeam: r.winnerTeam,
      durationTicks: r.durationTicks,
      sizeBytes: r.bytes.byteLength,
    })),
  }));

  /**
   * Download one replay as a Replay v2 (`RA4R`) binary container.
   * Served as an octet-stream so the client decodes the exact recorded bytes.
   */
  fastify.get('/api/v1/replays/:matchId', async (req, reply) => {
    const { matchId } = req.params as { matchId: string };
    const stored = finishedReplays.get(matchId);
    if (!stored) {
      reply.status(404);
      return { error: 'Replay not found or expired from retention window' };
    }
    reply
      .type('application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${matchId}.ra4r"`)
      .header('X-RA4-Replay-Format', '2');
    return stored.bytes;
  });

  // HTTP API V1 Routes
  fastify.post('/api/v1/auth/guest', async () => {
    const guestUser = await AuthService.createGuestSession();
    const token = fastify.jwt.sign({ userId: guestUser.id, role: guestUser.role, nickname: guestUser.nickname });
    return { token, user: { id: guestUser.id, nickname: guestUser.nickname, role: guestUser.role } };
  });

  fastify.post('/api/v1/auth/register', async (req, reply) => {
    const { nickname, password, email, secretKey } = req.body as any;
    try {
      const newUser = await AuthService.register(nickname, password, email, secretKey);
      const token = fastify.jwt.sign({ userId: newUser.id, role: newUser.role, nickname: newUser.nickname });
      return { token, user: { id: newUser.id, nickname: newUser.nickname, role: newUser.role } };
    } catch (err) {
      reply.status(400);
      return { error: (err as Error).message };
    }
  });

  fastify.post('/api/v1/auth/login', async (req, reply) => {
    const { identifier, password } = req.body as any;
    try {
      const user = await AuthService.login(identifier, password, req.ip);
      const token = fastify.jwt.sign({ userId: user.id, role: user.role, nickname: user.nickname });
      return { token, user: { id: user.id, nickname: user.nickname, role: user.role } };
    } catch (err) {
      reply.status(401);
      return { error: (err as Error).message };
    }
  });

  fastify.get('/api/v1/users/profile', async (req, reply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as any;
      const data = await AuthService.getProfile(payload.userId);
      return data ?? { error: 'Profile not found' };
    } catch {
      reply.status(401);
      return { error: 'Unauthorized' };
    }
  });

  // WebSocket Gateway Route
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, req) => {
    activeWebSocketConnections.inc();
    logger.info({ ip: req.ip }, '[WS] Client connected to WebSocket Gateway');

    let currentRoomId: string | null = 'default-room';
    let playerIndex: number = 0;
    let currentMatch: AuthoritativeMatchRuntime | null = null;
    let userRole: 'player' | 'moderator' | 'admin' = 'player';
    let userId: string = 'guest-anon';

    socket.on('message', async (data: Buffer | string) => {
      try {
        // Protocol v1 binary frames (match-critical path): magic 'RA'.
        if (Buffer.isBuffer(data) && data.length >= 2 && data[0] === 0x52 && data[1] === 0x41) {
          const { decodeEnvelope, decodeCommandList, decodeChecksum, WireKind } = await import('@ra4/netcode');
          const envelope = decodeEnvelope(new Uint8Array(data));
          // Resolve the live match from the room binding: a non-initiating
          // player's socket closure has no currentMatch of its own.
          const match = currentMatch ?? (currentRoomId ? roomMatches.get(currentRoomId) ?? null : null);
          if (match && !currentMatch) currentMatch = match;
          switch (envelope.kind) {
            case WireKind.SUBMIT_COMMANDS: {
              if (match) {
                for (const command of decodeCommandList(envelope.payload)) {
                  const res = match.submitCommand(playerIndex, command);
                  if (!res.valid) {
                    rejectedCommandsTotal.inc({ reason: res.reason || 'invalid' });
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

        const msg: ClientMessage = JSON.parse(data.toString());

        switch (msg.type) {
          case 'JOIN_LOBBY': {
            const result = roomManager.joinRoom(msg.roomId || 'default-room', msg.playerName, userId);
            currentRoomId = result.room.id;
            playerIndex = result.slotIndex;
            registerRoomSocket(currentRoomId, playerIndex, socket);

            // Tell the joiner its authoritative slot index explicitly. The
            // client must not infer its own index by matching player names.
            socket.send(JSON.stringify({ type: 'JOIN_ACK', playerIndex, roomId: currentRoomId }));

            // Broadcast the updated lobby to every player in the room so
            // joins/leaves are visible to all, not just the joiner.
            broadcastLobbyState(currentRoomId, result.room);
            break;
          }

          case 'SET_SLOT': {
            if (currentRoomId) {
              const room = roomManager.setSlotConfig(currentRoomId, msg.slotIndex, msg.factionId, msg.playerType, msg.team);
              broadcastLobbyState(currentRoomId, room);
            }
            break;
          }

          case 'SET_MAP': {
            if (currentRoomId) {
              // Validate against the content database — an unknown map id
              // would silently fall back and desync client expectations.
              const { DEFAULT_DATABASE } = await import('@ra4/content-runtime');
              const known = DEFAULT_DATABASE.maps.some((m) => m.id === msg.mapId);
              if (!known) {
                socket.send(JSON.stringify({ type: 'ERROR', message: `Unknown map ${msg.mapId}` } as ServerMessage));
                break;
              }
              const room = roomManager.getRoom(currentRoomId);
              if (room && room.hostIndex !== playerIndex) {
                socket.send(JSON.stringify({ type: 'ERROR', message: 'Only the host can change the map' } as ServerMessage));
                break;
              }
              broadcastLobbyState(currentRoomId, roomManager.setMap(currentRoomId, msg.mapId));
            }
            break;
          }

          case 'SET_READY': {
            if (currentRoomId) {
              const room = roomManager.setReady(currentRoomId, playerIndex, msg.isReady);
              broadcastLobbyState(currentRoomId, room);
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

                const runtime = new AuthoritativeMatchRuntime(room.mapId, matchPlayers);
                // Archive the replay and release the match when it finishes.
                runtime.onFinished = (finished) => {
                  storeFinishedReplay(finished);
                  activeMatches.delete(finished.matchId);
                  activeMatchesCount.set(activeMatches.size);
                  if (currentRoomId) roomMatches.delete(currentRoomId);
                };
                activeMatches.set(runtime.matchId, runtime);
                // Room→match binding so every player's socket handler can
                // resolve the live match, not just the initiator's closure.
                roomMatches.set(currentRoomId, runtime);
                activeMatchesCount.set(activeMatches.size);
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
                rejectedCommandsTotal.inc({ reason: res.reason || 'invalid' });
                socket.send(JSON.stringify({
                  type: 'ERROR',
                  message: `Command rejected: ${res.reason}`,
                } as ServerMessage));
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
              } else {
                socket.send(JSON.stringify({ type: 'ERROR', message: 'Reconnect failed: invalid token or window expired' }));
              }
            } else {
              socket.send(JSON.stringify({ type: 'ERROR', message: 'Reconnect failed: match not found' }));
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        logger.error({ err }, '[WS] Error processing message');
        // Never leave the client hanging on a rejected request: it has no
        // other way to learn the message failed and would wait forever.
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'ERROR', message: (err as Error).message } as ServerMessage));
        }
      }
    });

    socket.on('close', () => {
      activeWebSocketConnections.dec();
      logger.info({ userId }, '[WS] Client disconnected');
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
  await fastify.listen({ port: env.PORT, host: env.HOST });
  logger.info(`[RA4 Game Server] Authoritative Fastify Server running on http://${env.HOST}:${env.PORT}`);
}

// Graceful Shutdown Signal Handler
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, '[Shutdown] Initiating graceful shutdown...');

  // Stop active match timers
  for (const match of activeMatches.values()) {
    match.stop();
  }

  await fastify.close();
  await closeDb();
  await closeRedis();

  logger.info('[Shutdown] Server successfully shut down.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

main().catch(err => {
  logger.fatal({ err }, 'Fatal error during server startup');
  process.exit(1);
});
