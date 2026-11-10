#!/usr/bin/env bash
#
# Local PostgreSQL helper for development without Docker.
#
# Usage:
#   bash scripts/local-db.sh start    # init (first run) and start
#   bash scripts/local-db.sh stop     # stop the local cluster
#   bash scripts/local-db.sh status   # show whether it is running
#   bash scripts/local-db.sh reset    # stop, delete, and recreate (destructive)
#
# The cluster lives in .local/pgdata and listens on the port from DATABASE_URL.
# If DATABASE_URL points at a remote host (for example Neon), this script does
# nothing and the remote database is used directly.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="$ROOT_DIR/.local/pgdata"
PGSOCKET="$ROOT_DIR/.local/pgsocket"
PGLOG="$ROOT_DIR/.local/postgres.log"
ACTION="${1:-start}"
EXTERNAL_SERVER=0

die() {
  echo "error: $*" >&2
  exit 1
}

find_bin() {
  local name="$1"

  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return
  fi

  local candidate
  candidate="$(ls /usr/lib/postgresql/*/bin/"$name" 2>/dev/null | tail -n 1 || true)"
  [ -n "$candidate" ] || die "$name not found. Install PostgreSQL client/server tools."
  printf '%s\n' "$candidate"
}

INITDB="$(find_bin initdb)"
PG_CTL="$(find_bin pg_ctl)"
PG_ISREADY="$(find_bin pg_isready)"
PSQL="$(find_bin psql)"
CREATEDB="$(find_bin createdb)"

read_db_config() {
  [ -f "$ROOT_DIR/.env" ] || die ".env is missing. Copy .env.example to .env first."

  local parsed
  parsed="$(
    cd "$ROOT_DIR"
    node -e '
      require("dotenv").config({ quiet: true });
      const raw = process.env.DATABASE_URL;
      if (!raw) {
        console.error("DATABASE_URL is not set");
        process.exit(1);
      }
      const url = new URL(raw);
      const fields = [url.hostname, url.port || "5432", url.username, url.password, url.pathname.slice(1)];
      process.stdout.write(fields.map(value => encodeURIComponent(value)).join("\t"));
      process.stdout.write("\n");
    '
  )" || die "Could not parse DATABASE_URL from .env"

  IFS=$'\t' read -r DB_HOST DB_PORT DB_USER DB_PASS DB_NAME <<<"$parsed"
  DB_HOST="$(node -e 'process.stdout.write(decodeURIComponent(process.argv[1]))' "$DB_HOST")"
  DB_USER="$(node -e 'process.stdout.write(decodeURIComponent(process.argv[1]))' "$DB_USER")"
  DB_PASS="$(node -e 'process.stdout.write(decodeURIComponent(process.argv[1]))' "$DB_PASS")"
  DB_NAME="$(node -e 'process.stdout.write(decodeURIComponent(process.argv[1]))' "$DB_NAME")"
}

is_local_host() {
  case "$1" in
    localhost | 127.0.0.1 | ::1) return 0 ;;
    *) return 1 ;;
  esac
}

is_running() {
  [ -d "$PGDATA" ] && "$PG_CTL" status -D "$PGDATA" >/dev/null 2>&1
}

is_ready() {
  "$PG_ISREADY" -h 127.0.0.1 -p "$DB_PORT" -q
}

start_cluster() {
  mkdir -p "$PGSOCKET"

  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing local PostgreSQL cluster in .local/pgdata..."
    "$INITDB" -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null
  fi

  if is_running; then
    echo "PostgreSQL is already running on port $DB_PORT."
    return
  fi

  if is_ready; then
    # Something else already listens on this port. It may be another local
    # cluster or an auto-started Docker container. Use it only when the
    # configured credentials actually work; never prompt in a script.
    if "$PSQL" -w -h 127.0.0.1 -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -tAc 'select 1' >/dev/null 2>&1; then
      echo "Port $DB_PORT already has a reachable PostgreSQL server; using it."
      EXTERNAL_SERVER=1
      return
    fi

    die "Port $DB_PORT is already used by another PostgreSQL (often a Docker container) and the configured credentials do not work. Stop that server first, for example: docker stop revenuelens-postgres-1"
  fi

  echo "Starting PostgreSQL on 127.0.0.1:$DB_PORT (data: .local/pgdata)..."
  "$PG_CTL" -D "$PGDATA" -l "$PGLOG" -o \
    "-p $DB_PORT -k $PGSOCKET -c listen_addresses=127.0.0.1 -c max_connections=30 -c shared_buffers=128MB -c work_mem=4MB -c maintenance_work_mem=64MB" \
    start >/dev/null

  for _ in $(seq 1 30); do
    if is_ready; then
      echo "PostgreSQL is ready."
      return
    fi
    sleep 0.5
  done

  die "PostgreSQL did not become ready. See .local/postgres.log"
}

ensure_role_and_database() {
  local role="$DB_USER"
  local database="$DB_NAME"

  # Keep identifiers predictable for psql variable interpolation.
  [[ "$role" =~ ^[A-Za-z0-9_]+$ ]] || die "Unsupported role name in DATABASE_URL: $role"
  [[ "$database" =~ ^[A-Za-z0-9_]+$ ]] || die "Unsupported database name in DATABASE_URL: $database"

  local role_exists
  role_exists="$("$PSQL" -w -h 127.0.0.1 -p "$DB_PORT" -U postgres -d postgres -tAc \
    "select 1 from pg_roles where rolname = '$role'" 2>/dev/null || true)"

  if [ "$role_exists" != "1" ]; then
    echo "Creating database role '$role'..."
    local escaped_pass="${DB_PASS//\'/\'\'}"
    "$PSQL" -w -h 127.0.0.1 -p "$DB_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 \
      -c "create role \"$role\" login password '$escaped_pass' createdb;" >/dev/null
  fi

  local database_exists
  database_exists="$("$PSQL" -w -h 127.0.0.1 -p "$DB_PORT" -U postgres -d postgres -tAc \
    "select 1 from pg_database where datname = '$database'" 2>/dev/null || true)"

  if [ "$database_exists" != "1" ]; then
    echo "Creating database '$database'..."
    "$PSQL" -w -h 127.0.0.1 -p "$DB_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 \
      -c "create database \"$database\" owner \"$role\";" >/dev/null
  fi
}

stop_cluster() {
  if is_running; then
    echo "Stopping local PostgreSQL..."
    "$PG_CTL" -D "$PGDATA" stop -m fast >/dev/null
    echo "Stopped."
  else
    echo "Local PostgreSQL is not running."
  fi
}

read_db_config

if ! is_local_host "$DB_HOST"; then
  echo "DATABASE_URL points at remote host '$DB_HOST'; no local PostgreSQL is needed."
  exit 0
fi

case "$ACTION" in
  start)
    start_cluster
    if [ "$EXTERNAL_SERVER" != "1" ]; then
      ensure_role_and_database
    fi
    ;;
  stop)
    stop_cluster
    ;;
  status)
    if is_running; then
      echo "running (127.0.0.1:$DB_PORT, database: $DB_NAME)"
    else
      echo "stopped"
    fi
    ;;
  reset)
    stop_cluster
    rm -rf "$PGDATA" "$PGSOCKET" "$PGLOG"
    start_cluster
    if [ "$EXTERNAL_SERVER" != "1" ]; then
      ensure_role_and_database
    fi
    echo "Reset complete. Run 'pnpm dev:local' to apply migrations."
    ;;
  *)
    die "Unknown action '$ACTION'. Use start, stop, status, or reset."
    ;;
esac
