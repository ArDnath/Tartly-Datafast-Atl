#!/usr/bin/env bash
#
# Deterministic production deploy for the single-VPS Tartly stack.
#
# Run from the CI deploy job (preferred) or by an operator:
#   bash deploy.sh <40-char-main-commit-sha>
#
# Required on the host:
#   /opt/tartly/app/.git            clone of this repository
#   /opt/tartly/runtime/.env        production secrets, mode 600
#
# The script builds an immutable image tag from the commit SHA, copies the
# committed compose/Caddy configuration into the runtime directory, applies
# Prisma migrations with the direct URL, restarts only the app, and verifies
# readiness. If readiness still fails it redeploys the previous commit. It
# never prints .env contents and never reverses a migration automatically.

set -Eeuo pipefail
umask 022

TARGET_SHA="${1:-}"
APP_DIR="${APP_DIR:-/opt/tartly/app}"
RUNTIME_DIR="${RUNTIME_DIR:-/opt/tartly/runtime}"
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

health_ok() {
  curl --fail --silent --show-error --max-time 10 "$HEALTH_URL" >/dev/null
}

wait_for_health() {
  local attempt
  for attempt in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
    if health_ok; then
      log "readiness passed (attempt $attempt)"
      return 0
    fi
    sleep "$HEALTH_SLEEP_SECONDS"
  done

  return 1
}

sync_runtime_config() {
  install -m 644 "$APP_DIR/deploy/production/docker-compose.yml" "$RUNTIME_DIR/docker-compose.yml"
  install -m 644 "$APP_DIR/deploy/production/Caddyfile" "$RUNTIME_DIR/Caddyfile"
}

rollback() {
  log "readiness failed; rolling back to $PREVIOUS_SHA"
  cd "$APP_DIR"
  git reset --hard "$PREVIOUS_SHA" >/dev/null
  sync_runtime_config
  export BUILD_VERSION="$PREVIOUS_SHA"
  cd "$RUNTIME_DIR"

  if "${COMPOSE[@]}" build --pull app </dev/null && "${COMPOSE[@]}" up -d --no-deps app </dev/null; then
    if wait_for_health; then
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

cd "$APP_DIR"
PREVIOUS_SHA=$(git rev-parse HEAD)

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

# Move the checkout before reading any configuration from it. Untracked runtime
# files are left alone, and the production .env is outside the repository.
git checkout --force -B main "$TARGET_SHA" >/dev/null

# Git applies the process umask on checkout. The build context and the
# container user must be able to read every committed file.
chmod -R u+rwX,go+rX "$APP_DIR"

TARTLY_DOMAIN=$(read_env_value TARTLY_DOMAIN)
HEALTH_URL="${APP_URL:-https://${TARTLY_DOMAIN}}"
HEALTH_URL="${HEALTH_URL%/}/api/health/ready"
[ -n "$TARTLY_DOMAIN" ] || [ -n "$APP_URL" ] || die "TARTLY_DOMAIN or APP_URL is required"

sync_runtime_config
cd "$RUNTIME_DIR"

export BUILD_VERSION="$TARGET_SHA"
COMPOSE=(docker compose --env-file .env -f docker-compose.yml)

log "building image tartly-app:$TARGET_SHA"
"${COMPOSE[@]}" build --pull app </dev/null

log "applying database migrations"
"${COMPOSE[@]}" --profile tools run --rm -T migrate </dev/null

log "starting app"
"${COMPOSE[@]}" up -d --no-deps app </dev/null

if ! wait_for_health; then
  rollback || true
  die "deployment of $TARGET_SHA failed readiness"
fi

log "deployed $TARGET_SHA successfully"
log "previous healthy commit was $PREVIOUS_SHA"
