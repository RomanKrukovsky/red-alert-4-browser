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
const matchmaker = new Matchmaker();
const activeMatches = new Map<string, AuthoritativeMatchRuntime>();

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
          switch (envelope.kind) {
            case WireKind.SUBMIT_COMMANDS: {
              if (currentMatch) {
                for (const command of decodeCommandList(envelope.payload)) {
                  const res = currentMatch.submitCommand(playerIndex, command);
                  if (!res.valid) {
                    rejectedCommandsTotal.inc({ reason: res.reason || 'invalid' });
                  }
                }
              }
              break;
            }
            case WireKind.CHECKSUM_REPORT: {
              if (currentMatch) {
                const report = decodeChecksum(envelope.payload);
                currentMatch.reportChecksum(playerIndex, report.tick, report.checksum);
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

            socket.send(JSON.stringify({
              type: 'LOBBY_STATE',
              state: roomManager.getLobbyState(result.room),
            } as ServerMessage));
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
                const matchPlayers = room.slots.map(s => ({
                  playerIndex: s.index,
                  name: s.name,
                  factionId: s.factionId,
                  team: s.team,
                  type: s.type,
                  ws: s.index === playerIndex ? socket : null,
                  isConnected: true,
                  lastAckTick: 0,
                  reconnectToken: `token-${s.index}`,
                }));

                const runtime = new AuthoritativeMatchRuntime(room.mapId, matchPlayers);
                activeMatches.set(runtime.matchId, runtime);
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
            const match = activeMatches.get(msg.roomId);
            if (match) {
              const ok = match.handleReconnect(msg.playerIndex, `token-${msg.playerIndex}`, msg.lastTick, socket);
              if (ok) {
                currentMatch = match;
                playerIndex = msg.playerIndex;
              } else {
                socket.send(JSON.stringify({ type: 'ERROR', message: 'Reconnect failed: invalid token' }));
              }
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        logger.error({ err }, '[WS] Error processing message');
      }
    });

    socket.on('close', () => {
      activeWebSocketConnections.dec();
      logger.info({ userId }, '[WS] Client disconnected');
      if (currentRoomId) {
        roomManager.leaveRoom(currentRoomId, playerIndex);
      }
      if (currentMatch) {
        currentMatch.handleDisconnect(playerIndex);
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
