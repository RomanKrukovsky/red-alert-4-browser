"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(8080),
    HOST: zod_1.z.string().default('0.0.0.0'),
    LOG_LEVEL: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    PROTOCOL_VERSION: zod_1.z.string().default('1.0.0'),
    CONTENT_VERSION: zod_1.z.string().default('1.0.0'),
    SIM_CORE_VERSION: zod_1.z.string().default('1.0.0'),
    JWT_SECRET: zod_1.z.string().default('dev-secret-key-do-not-use-in-prod-12345'),
    JWT_EXPIRES_IN: zod_1.z.string().default('24h'),
    REFRESH_TOKEN_EXPIRES_IN: zod_1.z.string().default('7d'),
    ADMIN_SECRET_KEY: zod_1.z.string().default('admin-secret-bootstrap-key'),
    DATABASE_URL: zod_1.z.string().default('postgres://ra4user:ra4pass@localhost:5432/ra4db'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    MAX_CONNECTIONS_PER_IP: zod_1.z.coerce.number().default(20),
    RECONNECT_WINDOW_SECONDS: zod_1.z.coerce.number().default(60),
});
function parseEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('Invalid environment configuration:', result.error.format());
        process.exit(1);
    }
    return result.data;
}
exports.env = parseEnv();
//# sourceMappingURL=env.js.map