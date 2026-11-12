#!/usr/bin/env bash
#
# Back up the self-hosted Tartly data stores.
#
#   ./backup.sh                 PostgreSQL + ClickHouse + .env
#   ./backup.sh --postgres-only  fast pre-deploy PostgreSQL dump
#
# Backups are written under $BACKUP_DIR (default /opt/tartly/backups) and kept
# for $BACKUP_RETENTION_DAYS days (default 14). They contain tenant data and
# the encrypted provider credentials, so the directory must be mode 700 and
# copied off-host by the operator. This script never prints a secret.
#
# Restore (PostgreSQL):
#   docker compose --env-file .env exec -T postgres \
#     pg_restore -U "$POSTGRES_USER" -d "tartly_restore" --no-owner --no-privileges < file.dump
#
# Restore (ClickHouse):
#   docker cp file.tar <clickhouse-container>:/var/lib/clickhouse/backups/name
#   clickhouse-client --query "RESTORE DATABASE talivia FROM Disk('backups','name')"
#   The target database must be empty, or set allow_non_empty_tables=1.

set -Eeuo pipefail
umask 077

RUNTIME_DIR="${RUNTIME_DIR:-/opt/tartly/runtime}"
BACKUP_DIR="${BACKUP_DIR:-/opt/tartly/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
POSTGRES_ONLY=0

case "${1:-}" in
  --postgres-only) POSTGRES_ONLY=1 ;;
  --help | -h)
    sed -n '2,20p' "$0"
    exit 0
    ;;
  "") ;;
  *)
    printf 'unknown argument: %s\n' "$1" >&2
    exit 2
    ;;
esac

log() {
  printf '[backup] %s\n' "$*" >&2
}

die() {
  log "ERROR: $*"
  exit 1
}

read_env_value() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$RUNTIME_DIR/.env" | tail -n 1 || true)
  [ -n "$line" ] || return 0
  line="${line#*=}"
  line="${line%$'\r'}"
  line="${line#\"}"
  line="${line%\"}"
  line="${line#\'}"
  line="${line%\'}"
  printf '%s' "$line"
}

[ -f "$RUNTIME_DIR/.env" ] || die "missing $RUNTIME_DIR/.env"
[ -f "$RUNTIME_DIR/docker-compose.yml" ] || die "missing $RUNTIME_DIR/docker-compose.yml"

cd "$RUNTIME_DIR"
COMPOSE=(docker compose --env-file .env -f docker-compose.yml)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

POSTGRES_USER=$(read_env_value POSTGRES_USER)
POSTGRES_DB=$(read_env_value POSTGRES_DB)
POSTGRES_USER="${POSTGRES_USER:-tartly}"
POSTGRES_DB="${POSTGRES_DB:-tartly}"

install -d -m 700 "$BACKUP_DIR" "$BACKUP_DIR/postgres" "$BACKUP_DIR/env"

POSTGRES_CONTAINER=$("${COMPOSE[@]}" ps -q postgres)
[ -n "$POSTGRES_CONTAINER" ] || die "postgres container is not running"

log "dumping PostgreSQL"
tmp="$BACKUP_DIR/postgres/.tartly-$STAMP.dump.tmp"
if ! "${COMPOSE[@]}" exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --no-owner \
  --no-privileges > "$tmp"; then
  rm -f "$tmp"
  die "pg_dump failed"
fi

[ -s "$tmp" ] || {
  rm -f "$tmp"
  die "pg_dump produced an empty file"
}

mv "$tmp" "$BACKUP_DIR/postgres/tartly-$STAMP.dump"
log "PostgreSQL backup written: $BACKUP_DIR/postgres/tartly-$STAMP.dump"

if [ "$POSTGRES_ONLY" -eq 0 ]; then
  CLICKHOUSE_DB=$(read_env_value CLICKHOUSE_DB)
  CLICKHOUSE_USER=$(read_env_value CLICKHOUSE_USER)
  CLICKHOUSE_PASSWORD=$(read_env_value CLICKHOUSE_PASSWORD)
  CLICKHOUSE_DB="${CLICKHOUSE_DB:-talivia}"
  CLICKHOUSE_USER="${CLICKHOUSE_USER:-talivia}"

  if [ -n "$CLICKHOUSE_PASSWORD" ]; then
    [[ "$CLICKHOUSE_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || die "invalid CLICKHOUSE_DB"
    CLICKHOUSE_CONTAINER=$("${COMPOSE[@]}" ps -q clickhouse)
    [ -n "$CLICKHOUSE_CONTAINER" ] || die "clickhouse container is not running"

    log "backing up ClickHouse database $CLICKHOUSE_DB"
    "${COMPOSE[@]}" exec -T clickhouse clickhouse-client \
      --user "$CLICKHOUSE_USER" \
      --password "$CLICKHOUSE_PASSWORD" \
      --query "BACKUP DATABASE $CLICKHOUSE_DB TO Disk('backups', 'tartly-$STAMP')"

    install -d -m 700 "$BACKUP_DIR/clickhouse"
    if docker cp "$CLICKHOUSE_CONTAINER:/var/lib/clickhouse/backups/tartly-$STAMP" \
      "$BACKUP_DIR/clickhouse/tartly-$STAMP"; then
      docker exec "$CLICKHOUSE_CONTAINER" \
        rm -rf "/var/lib/clickhouse/backups/tartly-$STAMP" >/dev/null 2>&1 || true
      log "ClickHouse backup written: $BACKUP_DIR/clickhouse/tartly-$STAMP"
    else
      die "copying the ClickHouse backup out of the container failed; it remains at /var/lib/clickhouse/backups/tartly-$STAMP"
    fi
  else
    log "CLICKHOUSE_PASSWORD is not set; skipping ClickHouse backup"
  fi

  install -m 600 "$RUNTIME_DIR/.env" "$BACKUP_DIR/env/tartly-$STAMP.env"
  log "runtime environment copy written (contains secrets; protect this directory)"
fi

find "$BACKUP_DIR/postgres" -type f -name 'tartly-*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -delete
find "$BACKUP_DIR/env" -type f -name 'tartly-*.env' -mtime +"$BACKUP_RETENTION_DAYS" -delete
if [ -d "$BACKUP_DIR/clickhouse" ]; then
  find "$BACKUP_DIR/clickhouse" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} +
fi

log "backup complete (retention ${BACKUP_RETENTION_DAYS}d)"
