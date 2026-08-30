#!/bin/sh
set -e

# Migrations run before the server accepts traffic. depends_on: service_healthy
# in compose guarantees the database is already up.
echo "Running migrations..."
node scripts/migrate.mjs

echo "Starting Next.js..."
exec node server.js
