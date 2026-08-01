"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchTickDurationHistogram = exports.desyncEventsTotal = exports.rejectedCommandsTotal = exports.activeMatchesCount = exports.activeWebSocketConnections = exports.httpRequestsTotal = exports.register = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = __importDefault(require("prom-client"));
const env_js_1 = require("../config/env.js");
exports.logger = (0, pino_1.default)({
    level: env_js_1.env.LOG_LEVEL,
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
});
exports.register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
exports.httpRequestsTotal = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests count',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.register],
});
exports.activeWebSocketConnections = new prom_client_1.default.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
    registers: [exports.register],
});
exports.activeMatchesCount = new prom_client_1.default.Gauge({
    name: 'matches_active',
    help: 'Number of active matches currently running on server',
    registers: [exports.register],
});
exports.rejectedCommandsTotal = new prom_client_1.default.Counter({
    name: 'commands_rejected_total',
    help: 'Total number of rejected player commands by anti-cheat',
    labelNames: ['reason'],
    registers: [exports.register],
});
exports.desyncEventsTotal = new prom_client_1.default.Counter({
    name: 'desync_events_total',
    help: 'Total number of detected client-server desync events',
    registers: [exports.register],
});
exports.matchTickDurationHistogram = new prom_client_1.default.Histogram({
    name: 'match_tick_duration_seconds',
    help: 'Duration of server tick execution in seconds',
    buckets: [0.001, 0.005, 0.01, 0.02, 0.033, 0.05, 0.1],
    registers: [exports.register],
});
//# sourceMappingURL=metrics.js.map