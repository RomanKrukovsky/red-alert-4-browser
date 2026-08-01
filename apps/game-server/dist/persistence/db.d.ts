import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
export declare let pool: pg.Pool | null;
export declare let db: ReturnType<typeof drizzle> | null;
export declare let isDbConnected: boolean;
export declare function initDb(): Promise<boolean>;
export declare function closeDb(): Promise<void>;
//# sourceMappingURL=db.d.ts.map