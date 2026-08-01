import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

export let pool: pg.Pool | null = null;
export let db: ReturnType<typeof drizzle> | null = null;
export let isDbConnected = false;

export async function initDb(): Promise<boolean> {
  try {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 3000,
    });

    await pool.query('SELECT 1');
    db = drizzle(pool, { schema });
    isDbConnected = true;
    console.log('[DB] PostgreSQL connected successfully.');
    return true;
  } catch (error) {
    console.warn('[DB] Could not connect to PostgreSQL. Operating with in-memory fallback store:', (error as Error).message);
    isDbConnected = false;
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    isDbConnected = false;
  }
}
