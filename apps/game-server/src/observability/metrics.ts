import pino from 'pino';
import client from 'prom-client';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Prometheus Registry & Metrics Definitions
export const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests count',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeWebSocketConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const activeMatchesCount = new client.Gauge({
  name: 'matches_active',
  help: 'Number of active matches currently running on server',
  registers: [register],
});

export const rejectedCommandsTotal = new client.Counter({
  name: 'commands_rejected_total',
  help: 'Total number of rejected player commands by anti-cheat',
  labelNames: ['reason'],
  registers: [register],
});

export const desyncEventsTotal = new client.Counter({
  name: 'desync_events_total',
  help: 'Total number of detected client-server desync events',
  registers: [register],
});

export const matchTickDurationHistogram = new client.Histogram({
  name: 'match_tick_duration_seconds',
  help: 'Duration of server tick execution in seconds',
  buckets: [0.001, 0.005, 0.01, 0.02, 0.033, 0.05, 0.1],
  registers: [register],
});
