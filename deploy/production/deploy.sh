#!/usr/bin/env bash
#
# Deterministic production deploy for the single-VPS Tartly stack.
#
# Run from the CI deploy job (preferred) or by an operator:
#   bash deploy.sh <40-char-main-commit-sha>
#
# Automatic deploys must target the current origin/main head. A deliberate
# rollback to an older commit sets ALLOW_NON_HEAD=1 and still requires the
# commit to be an ancestor of origin/main.
#
# Required on the host:
#   /opt/tartly/app/.git            clone of this repository
#   /opt/tartly/runtime/.env        production secrets, mode 600
#
# The script builds an immutable image tag from the commit SHA, copies the
# committed compose/Caddy configuration into the runtime directory, applies
# Prisma migrations with the direct URL, restarts only the app, and verifies
# readiness plus the exact running BUILD_VERSION. If readiness still fails it
# redeploys the previous commit. It never prints .env contents and never
# reverses a migration automatically.

set -Eeuo pipefail
umask 022

TARGET_SHA="${1:-}"
ALLOW_NON_HEAD="${ALLOW_NON_HEAD:-0}"
APP_DIR="${APP_DIR:-/opt/tartly/app}"
RUNTIME_DIR="${RUNTIME_DIR:-/opt/tartly/runtime}"
BACKUP_DIR="${BACKUP_DIR:-/opt/tartly/backups}"
APP_URL="${APP_URL:-}"
HEALTH_MAX_ATTEMPTS="${HEALTH_MAX_ATTEMPTS:-40}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-3}"

log() {
  printf '[deploy] %s\n' "$*" >&2
}

die() {
  log "ERROR: $*"
  exit 1
}

read_env_value() {
  # Read a single non-secret key without sourcing .env. Dotenv comments and the
  # common quoted forms are handled; values are never echoed.
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

env_is_set() {
  [ -n "$(read_env_value "$1")" ]
}

set_env_value() {
  # Update one non-secret key in place without echoing the file. Manual compose
  # commands read .env for the image tag, so it must follow the deployed SHA.
  local key="$1"
  local value="$2"
  local tmp
  tmp=$(mktemp "$RUNTIME_DIR/.env.XXXXXX")
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$RUNTIME_DIR/.env" > "$tmp"
  chmod 600 "$tmp"
  chown --reference="$RUNTIME_DIR/.env" "$tmp" 2>/dev/null || true
  mv "$tmp" "$RUNTIME_DIR/.env"
}

read_health_version() {
  local body
  body=$(curl --fail --silent --max-time 10 "$HEALTH_URL" 2>/dev/null) || return 1
  printf '%s' "$body" |
    sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
    head -n 1
}

health_ok() {
  # A 200 is not enough: the old container can still answer while the new one
  # is starting. Require the exact SHA that this deploy built.
  local expected="$1"
  local body

  body=$(curl --fail --silent --max-time 10 "$HEALTH_URL" 2>/dev/null) || return 1
  printf '%s' "$body" | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' || return 1
  printf '%s' "$body" | grep -Eq '"database"[[:space:]]*:[[:space:]]*"up"' || return 1
  printf '%s' "$body" | grep -Eq '"version"[[:space:]]*:[[:space:]]*"'"$expected"'"' || return 1
}

wait_for_health() {
  local expected="$1"
  local attempt

  for attempt in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
    if health_ok "$expected"; then
      log "readiness passed for $expected (attempt $attempt)"
      return 0
    fi
    sleep "$HEALTH_SLEEP_SECONDS"
  done

  return 1
}

sync_runtime_config() {
  install -m 644 "$APP_DIR/deploy/production/docker-compose.yml" "$RUNTIME_DIR/docker-compose.yml"
  install -m 644 "$APP_DIR/deploy/production/Caddyfile" "$RUNTIME_DIR/Caddyfile"
  install -d -m 755 "$RUNTIME_DIR/clickhouse"
  install -m 644 "$APP_DIR/deploy/production/clickhouse/low-memory.xml" \
    "$RUNTIME_DIR/clickhouse/low-memory.xml"
  install -m 755 "$APP_DIR/deploy/production/backup.sh" "$RUNTIME_DIR/backup.sh"
}

rollback() {
  log "readiness failed; rolling back to $PREVIOUS_SHA"
  cd "$APP_DIR"
  if ! git cat-file -e "${PREVIOUS_SHA}^{commit}" 2>/dev/null; then
    log "ERROR: previous commit $PREVIOUS_SHA is not present in the host clone"
    return 1
  fi
  git reset --hard "$PREVIOUS_SHA" >/dev/null
  sync_runtime_config
  export BUILD_VERSION="$PREVIOUS_SHA"
  cd "$RUNTIME_DIR"

  # The previous image normally still exists locally. Reuse it so a rollback
  # does not depend on a fresh build or registry availability.
  if ! docker image inspect "tartly-app:$PREVIOUS_SHA" >/dev/null 2>&1; then
    log "previous image is absent; rebuilding $PREVIOUS_SHA"
    if ! "${COMPOSE[@]}" build --pull app </dev/null; then
      log "ERROR: rollback image build failed; operator attention required"
      return 1
    fi
  fi

  if "${COMPOSE[@]}" up -d --no-deps --no-build app </dev/null; then
    if [ "${WORKER_ENABLED:-0}" -eq 1 ]; then
      "${COMPOSE[@]}" up -d --no-deps --no-build worker </dev/null || true
    fi
    if wait_for_health "$PREVIOUS_SHA"; then
      printf '%s\n' "$PREVIOUS_SHA" > "$RUNTIME_DIR/last-deploy"
      set_env_value BUILD_VERSION "$PREVIOUS_SHA"
      DEPLOY_SUCCEEDED=1
      log "rollback to $PREVIOUS_SHA is healthy"
      return 0
    fi
  fi

  log "ERROR: rollback did not become healthy; operator attention required"
  return 1
}

[ -n "$TARGET_SHA" ] || die "usage: deploy.sh <40-char-commit-sha>"
[[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]] || die "target must be a full lowercase commit SHA"
[ -d "$APP_DIR/.git" ] || die "missing git clone at $APP_DIR"
[ -f "$RUNTIME_DIR/.env" ] || die "missing production env at $RUNTIME_DIR/.env"

# The workflow serializes deploys, but an operator can also run this script
# directly. Hold a host-side lock so two checkouts can never race the same
# compose project and database migration.
exec 9>"$RUNTIME_DIR/deploy.lock"
flock -n 9 || die "another deploy is already running for $RUNTIME_DIR"

cd "$APP_DIR"

TARTLY_DOMAIN=$(read_env_value TARTLY_DOMAIN)
HEALTH_URL="${APP_URL:-https://${TARTLY_DOMAIN}}"
HEALTH_URL="${HEALTH_URL%/}/api/health/ready"
[ -n "$TARTLY_DOMAIN" ] || [ -n "$APP_URL" ] || die "TARTLY_DOMAIN or APP_URL is required"

# The running build, not the git checkout, is the rollback source of truth.
# A previous failed deploy may have left the checkout ahead of the running app.
PREVIOUS_SHA=$(git rev-parse HEAD)
RUNNING_VERSION=$(read_health_version || true)
LAST_DEPLOY_SHA=$(cat "$RUNTIME_DIR/last-deploy" 2>/dev/null || true)
if [[ "$RUNNING_VERSION" =~ ^[0-9a-f]{40}$ ]]; then
  PREVIOUS_SHA="$RUNNING_VERSION"
elif [[ "$LAST_DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  PREVIOUS_SHA="$LAST_DEPLOY_SHA"
fi

DEPLOY_SUCCEEDED=0
restore_checkout() {
  local status=$?
  if [ "$status" -ne 0 ] && [ "$DEPLOY_SUCCEEDED" -ne 1 ]; then
    log "deploy did not complete; restoring checkout to $PREVIOUS_SHA"
    git -C "$APP_DIR" reset --hard "$PREVIOUS_SHA" >/dev/null 2>&1 || true
    sync_runtime_config || true
  fi
}
trap restore_checkout EXIT

# Never wait on a credential prompt. The host reads the repository through a
# read-only SSH deploy key configured in the deploy user's ~/.ssh/config. An
# HTTPS remote with no credential helper must fail fast with a fixable error,
# not hang until the CI job times out.
export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o BatchMode=yes}"

ORIGIN_URL=$(git remote get-url origin 2>/dev/null || true)
[ -n "$ORIGIN_URL" ] || die "no 'origin' remote configured in $APP_DIR"

if ! git ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
  log "ERROR: cannot read origin/main from '$ORIGIN_URL' (missing key or network error)"
  log "The deploy user must fetch this repository non-interactively."
  log "One-time fix, as the deploy user:"
  log "  1. ssh-keygen -t ed25519 -N '' -C tartly-vps-deploy -f ~/.ssh/id_ed25519_github"
  log "  2. add ~/.ssh/id_ed25519_github.pub to the repository as a READ-ONLY deploy key"
  log "  3. ~/.ssh/config: Host github.com / User git / IdentityFile ~/.ssh/id_ed25519_github / IdentitiesOnly yes"
  log "  4. git remote set-url origin git@github.com:<owner>/<repo>.git"
  log "Never embed a personal access token in the remote URL. See docs/CI_CD.md."
  die "repository access preflight failed"
fi

log "fetching origin/main"
git fetch --prune origin '+refs/heads/main:refs/remotes/origin/main'

git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null || die "target commit is not present"
git merge-base --is-ancestor "$TARGET_SHA" origin/main || die "target commit is not on origin/main"

MAIN_SHA=$(git rev-parse origin/main)
if [ "$ALLOW_NON_HEAD" != "1" ]; then
  [ "$TARGET_SHA" = "$MAIN_SHA" ] ||
    die "target $TARGET_SHA is not the current origin/main head ($MAIN_SHA); automatic deploys must be current. Use ALLOW_NON_HEAD=1 only for a deliberate rollback"
else
  log "non-head deploy explicitly allowed (rollback mode)"
fi

# Move the checkout before reading any configuration from it. Untracked runtime
# files are left alone, and the production .env is outside the repository.
git checkout --force -B main "$TARGET_SHA" >/dev/null

# Git applies the process umask on checkout. The build context and the
# container user must be able to read every committed file.
chmod -R u+rwX,go+rX "$APP_DIR"

sync_runtime_config
cd "$RUNTIME_DIR"

export BUILD_VERSION="$TARGET_SHA"
COMPOSE=(docker compose --env-file .env -f docker-compose.yml)

# The Kafka -> ClickHouse writer is only needed when both paths are enabled.
# Keeping it behind a profile means a single-node install without Kafka can
# still start the rest of the stack.
WORKER_ENABLED=0
if env_is_set KAFKA_URL && env_is_set KAFKA_BROKER && env_is_set CLICKHOUSE_URL; then
  WORKER_ENABLED=1
  COMPOSE+=(--profile streaming)
fi

log "building image tartly-app:$TARGET_SHA"
"${COMPOSE[@]}" build --pull app </dev/null ||
  die "image build failed; the running app was not changed"

log "starting data services (postgres, redis, clickhouse, kafka)"
"${COMPOSE[@]}" up -d --wait --wait-timeout 240 postgres redis clickhouse kafka </dev/null ||
  die "data services failed to become healthy; the running app was not changed"

log "backing up PostgreSQL before migration"
RUNTIME_DIR="$RUNTIME_DIR" BACKUP_DIR="$BACKUP_DIR" \
  "$RUNTIME_DIR/backup.sh" --postgres-only </dev/null ||
  die "pre-deploy database backup failed; the running app was not changed"

log "applying database migrations"
"${COMPOSE[@]}" --profile tools run --rm -T migrate </dev/null ||
  die "migration failed; the running app was not restarted (previous: $PREVIOUS_SHA)"

log "applying ClickHouse migrations"
"${COMPOSE[@]}" --profile tools run --rm -T clickhouse-migrate </dev/null ||
  die "ClickHouse migration failed; the running app was not restarted (previous: $PREVIOUS_SHA)"

log "starting app"
"${COMPOSE[@]}" up -d --no-deps app </dev/null || {
  rollback || true
  die "starting $TARGET_SHA failed"
}

if [ "$WORKER_ENABLED" -eq 1 ]; then
  log "starting Kafka -> ClickHouse worker"
  "${COMPOSE[@]}" up -d --wait --wait-timeout 120 --no-deps worker </dev/null || {
    rollback || true
    die "starting the streaming worker failed"
  }
fi

# Caddy is normally already running. This also recovers a fresh host and
# applies a changed Caddyfile without touching TLS storage.
"${COMPOSE[@]}" up -d --no-deps caddy </dev/null ||
  log "WARNING: caddy did not start; the app is running but the public edge may be down"

if ! wait_for_health "$TARGET_SHA"; then
  rollback || true
  die "deployment of $TARGET_SHA failed readiness"
fi

printf '%s\n' "$TARGET_SHA" > "$RUNTIME_DIR/last-deploy"
set_env_value BUILD_VERSION "$TARGET_SHA"
DEPLOY_SUCCEEDED=1
log "deployed $TARGET_SHA successfully"
log "previous healthy commit was $PREVIOUS_SHA"
