import { defineConfig } from 'drizzle-kit';

// DATABASE_URL comes from the container environment (env_file in compose), so
// run drizzle-kit inside the container:
//   docker compose exec web npm run db:generate
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  strict: true,
  verbose: true,
});
