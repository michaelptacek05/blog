/**
 * Applies committed migrations at container start.
 *
 * Plain .mjs on purpose: drizzle-kit is a devDependency and is not present in
 * the production image, while drizzle-orm's migrator and pg both are. This
 * never generates anything — `drizzle-kit generate` runs locally and its output
 * is committed.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1 });

try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  await pool.end();
}
