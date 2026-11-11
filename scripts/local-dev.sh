#!/usr/bin/env bash
#
# Start local development without Docker.
#
#   1. Start the user-owned PostgreSQL cluster on the port in DATABASE_URL.
#   2. Hand over to `pnpm dev`, whose predev step applies migrations and
#      regenerates the Prisma client.
#
# If DATABASE_URL points at Neon, step 1 is skipped and the remote database is
# used. Stop the database later with `pnpm db:local stop`.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Keep the dev server inside a predictable heap on 8 GB machines.
if [ -z "${NODE_OPTIONS:-}" ]; then
  export NODE_OPTIONS="--max-old-space-size=2048"
fi

bash "$ROOT_DIR/scripts/local-db.sh" start

cd "$ROOT_DIR"
exec pnpm dev
