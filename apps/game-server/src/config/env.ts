import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  PROTOCOL_VERSION: z.string().default('1.0.0'),
  CONTENT_VERSION: z.string().default('1.0.0'),
  SIM_CORE_VERSION: z.string().default('1.0.0'),

  JWT_SECRET: z.string().default('dev-secret-key-do-not-use-in-prod-12345'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  ADMIN_SECRET_KEY: z.string().default('admin-secret-bootstrap-key'),

  DATABASE_URL: z.string().default('postgres://ra4user:ra4pass@localhost:5432/ra4db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  MAX_CONNECTIONS_PER_IP: z.coerce.number().default(20),
  RECONNECT_WINDOW_SECONDS: z.coerce.number().default(60),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
