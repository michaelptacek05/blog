import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../lib/env';
import * as schema from './schema';

type Database = NodePgDatabase<typeof schema>;

/**
 * The pool is created on first use, not at import time: `next build` imports
 * these modules without a reachable database.
 *
 * In development the instance is cached on globalThis so hot reloads do not
 * leak a new pool on every edit.
 */
const globalForDb = globalThis as unknown as {
  __pool?: Pool;
  __db?: Database;
};

export function getDb(): Database {
  if (globalForDb.__db) {
    return globalForDb.__db;
  }

  const pool =
    globalForDb.__pool ??
    new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
    });

  const db = drizzle(pool, { schema });

  globalForDb.__pool = pool;
  globalForDb.__db = db;

  return db;
}

export { schema };
