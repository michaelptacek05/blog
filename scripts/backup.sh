#!/usr/bin/env bash
#
# Backs up the database and the uploads volume, then prunes anything older than
# KEEP_DAYS. Run it from the host (cron), not from inside a container.
#
#   ./scripts/backup.sh
#   STACK=blog BACKUP_DIR=/srv/backups/blog ./scripts/backup.sh
#   DB_CONTAINER=blog-db UPLOADS_VOLUME=blog_uploads ./scripts/backup.sh
#
# Restore is documented in README.md.
set -euo pipefail

STACK="${STACK:-blog}"
BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
DB_USER="${DB_USER:-blog}"
DB_NAME="${DB_NAME:-blog}"

# The compose file sets container_name explicitly, so the container is
# "<stack>-db" rather than compose's default "<stack>-db-1". Both are
# overridable if you rename things.
DB_CONTAINER="${DB_CONTAINER:-${STACK}-db}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-${STACK}_uploads}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Container $DB_CONTAINER not found. Set STACK to your stack name." >&2
  exit 1
fi

db_file="$BACKUP_DIR/db-$TIMESTAMP.sql.gz"
uploads_file="$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz"

echo "Dumping database..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip > "$db_file"

# A dump that produced almost nothing means something went wrong; do not let it
# quietly rotate a good backup out.
if [ "$(wc -c < "$db_file")" -lt 100 ]; then
  echo "Database dump looks empty — aborting before rotation." >&2
  rm -f "$db_file"
  exit 1
fi

echo "Archiving uploads..."
# The volume is mounted read-only into a throwaway container, so this works
# whether or not the app is running.
docker run --rm \
  -v "${UPLOADS_VOLUME}:/uploads:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine:3 tar czf "/backup/$(basename "$uploads_file")" -C /uploads . 

echo "Pruning backups older than ${KEEP_DAYS} days..."
find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sql.gz' -mtime "+${KEEP_DAYS}" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime "+${KEEP_DAYS}" -delete

echo "Done:"
ls -lh "$db_file" "$uploads_file" | awk '{print "  " $5 "  " $9}'
