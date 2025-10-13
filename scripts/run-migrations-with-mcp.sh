#!/usr/bin/env bash
set -euo pipefail

MIG_NUM=${1:-}
if [[ -z "$MIG_NUM" ]]; then
  echo "Usage: $0 <migration_number>"
  exit 1
fi

MIG_FILE="database/migrations/${MIG_NUM}_*.sql"
BACKUP_DIR="database/backups"
mkdir -p "$BACKUP_DIR"

echo "== Pre-migration validation =="
psql "$DATABASE_URL" -c "SELECT CURRENT_DATE;" >/dev/null
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables;" || true

echo "== Creating backup =="
ts=$(date +%Y%m%d_%H%M%S)
backup="$BACKUP_DIR/backup_${ts}.sql"
pg_dump "$DATABASE_URL" > "$backup"
echo "Backup saved to $backup"

echo "== Running migration ${MIG_NUM} =="
for f in $MIG_FILE; do
  echo "Applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "== Post-migration verification =="
case "$MIG_NUM" in
  006)
    psql "$DATABASE_URL" -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'core' AND indexname LIKE 'idx_%';" || true
    ;;
  007)
    psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'core' AND table_name = 'supplier' AND column_name = 'contact_person';" || true
    ;;
esac

echo "Migration ${MIG_NUM} completed."







