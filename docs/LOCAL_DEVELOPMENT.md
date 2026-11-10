# Local development without Docker

This repository can run its full analytics loop on an 8 GB machine without
Docker. The default local stack is:

| Process | Approx. RAM | Required |
| --- | --- | --- |
| Next.js dev server (Turbopack) | 1.0–1.3 GB | yes |
| PostgreSQL (user-owned cluster) | 150–250 MB | yes, unless you use Neon |
| Redis | 0 | no; the app falls back to PostgreSQL |
| ClickHouse / Kafka | 0 | no; this fork does not provision them |

No Docker daemon, no ClickHouse container, and no Kafka broker are needed for
local analytics development.

---

## 1. Prerequisites

```bash
node -v      # ^22.12 or >=24
pnpm -v      # ^10.10
psql --version
```

PostgreSQL client and server binaries must be present (`initdb`, `pg_ctl`,
`pg_isready`, `psql`). On Ubuntu/Debian:

```bash
sudo apt install postgresql postgresql-client
```

You do **not** need to enable or configure the system PostgreSQL service. The
local helper creates its own cluster inside the repository.

Install dependencies once:

```bash
cd /home/ariyaman/Dev/fight/efforts/revenuelens
pnpm install
```

Create the environment file once:

```bash
cp .env.example .env
```

Set a real `APP_SECRET` (at least 32 bytes):

```bash
openssl rand -hex 32
# paste the value into .env as APP_SECRET=...
```

---

## 2. Option A — local PostgreSQL (recommended for 8 GB)

The helper creates a PostgreSQL cluster in `.local/pgdata`, using the host,
port, user, password, and database from `DATABASE_URL`.

For the default `.env`:

```env
DATABASE_URL=postgresql://talivia:talivia@localhost:5433/talivia_oss
DATABASE_URL_UNPOOLED=postgresql://talivia:talivia@localhost:5433/talivia_oss
POSTGRES_PORT=5433
```

Start everything:

```bash
pnpm dev:local
```

What happens:

1. `.local/pgdata` is initialized on first run.
2. PostgreSQL starts on `127.0.0.1:5433`.
3. The `talivia` role and `talivia_oss` database are created if missing.
4. `pnpm dev` runs its `predev` step: environment check, `prisma migrate deploy`,
   ClickHouse skip, Prisma client generation.
5. Next.js starts on <http://localhost:3000>.

Open <http://localhost:3000>. Sign up at `/signup`. Verification email is
written to `.dev-emails/outbox.log` because `RESEND_API_KEY` is empty.

### Database commands

```bash
pnpm db:local start     # start (and initialize on first run)
pnpm db:local status    # show whether it is running
pnpm db:local stop      # stop the local cluster
pnpm db:local reset     # DESTRUCTIVE: delete .local/pgdata and recreate
```

`pnpm db:local reset` does not re-run migrations automatically. Run
`pnpm dev:local` afterwards; `predev` applies them.

### Where the data lives

- Cluster: `.local/pgdata`
- Socket: `.local/pgsocket`
- Log: `.local/postgres.log`
- The whole `.local/` directory is gitignored.

To remove all local data after stopping:

```bash
rm -rf .local
```

---

## 3. Option B — Neon PostgreSQL

Use this when you want the same database from multiple machines or you do not
want a local PostgreSQL process.

1. Create a Neon project and database.
2. Open **Connection Details** and copy both strings.
3. Set them in `.env`:

```env
# Runtime: pooled host, used by the Next.js app
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require

# Migrations: direct host, used by `prisma migrate deploy`
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/DBNAME?sslmode=require
```

Rules:

- `DATABASE_URL` must be the **pooled** host (usually contains `-pooler`).
- `DATABASE_URL_UNPOOLED` must be the **direct** host.
- URL-encode special characters in the password (`@` → `%40`, `#` → `%23`).
- Keep `sslmode=require`.
- Do not commit `.env`.

Apply migrations and start:

```bash
pnpm update-db-prisma     # optional: pnpm dev also runs this in predev
pnpm dev:local
```

`scripts/local-db.sh` detects a remote host and skips the local cluster.
`pnpm dev:local` therefore behaves correctly for Neon with no extra flags.

### Neon notes

- The first query after Neon suspends the compute can take a few seconds. The
  app retries idempotent reads with `withDbRetry`.
- Use one database or Neon branch per developer/environment. Do not point two
  developers at the same database when testing tenant isolation.
- Never run `pnpm db:local reset` while `DATABASE_URL` points at Neon; the
  helper exits before touching anything, but do not rely on that by accident.

---

## 4. Verify the analytics core

With the dev server running:

```bash
pnpm smoke:local
```

The smoke test uses the public HTTP API only:

```
register → workspace → website → POST /api/send → GET /api/websites/:id/stats
```

Expected output:

```json
{
  "websiteId": "...",
  "pageviews": 1,
  "visitors": 1,
  "visits": 1
}
OK: ingestion and analytics query are working.
```

Each run creates a new account, and signup is rate-limited to 5 attempts per
IP per hour. To reuse an account instead:

```bash
SMOKE_EMAIL=you@example.com SMOKE_PASSWORD='your-password' pnpm smoke:local
```

The smoke test reuses the account's first website if one already exists.

Manual equivalent:

```bash
# Health
curl -s http://localhost:3000/api/health/ready

# Send an event (use a browser User-Agent; plain curl is filtered as a bot)
curl -s -H 'Content-Type: application/json' \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0.0.0 Safari/537.36' \
  -d '{
    "type": "event",
    "payload": {
      "website": "<website-id>",
      "hostname": "example.com",
      "url": "https://example.com/?utm_source=manual",
      "visitorId": "visitor-1",
      "sessionId": "session-1"
    }
  }' \
  http://localhost:3000/api/send
```

Then open the website dashboard at `/app/<website-id>`.

---

## 5. Everyday workflow

```bash
# Start
pnpm dev:local

# In another terminal: verify
pnpm smoke:local

# Stop Next.js with Ctrl+C
# Stop PostgreSQL when you are done for the day
pnpm db:local stop
```

Useful commands:

```bash
pnpm gate                 # format, lint, typecheck, tests, build
pnpm test                 # unit tests
pnpm typecheck            # tsc --noEmit
pnpm exec prisma migrate dev --name my_change   # after editing schema.prisma
pnpm build-db             # regenerate Prisma client after schema changes
```

If the machine is under memory pressure, cap the dev server heap:

```bash
NODE_OPTIONS="--max-old-space-size=1536" pnpm dev:local
```

---

## 6. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `role "talivia" does not exist` | The port is served by a different PostgreSQL instance. Check `pnpm db:local status`, or change the port in `.env` and run `pnpm db:local reset`. |
| `port 5433 already in use` | Another Postgres is running. Either use it (if it has the role/database) or stop it, then `pnpm db:local reset`. |
| `ECONNREFUSED 127.0.0.1:5433` | Local cluster is stopped. Run `pnpm db:local start`. |
| `{"beep":"boop"}` from `/api/send` | `isbot` detected the client. Send a browser `User-Agent` or set `DISABLE_BOT_CHECK=true` in `.env` for local testing. |
| ClickHouse migration skipped | Expected. `CLICKHOUSE_URL` is unset in local development. |
| Email not delivered | Expected locally. Read `.dev-emails/outbox.log`. |
| First page load is slow | Turbopack compiles routes on demand. Later requests are fast. |
| Neon query is slow after idle | Neon compute woke up. Retry; the app retries idempotent reads. |
| `APP_SECRET must be ...` | `.env` has a missing/placeholder secret. Generate one with `openssl rand -hex 32`. |

---

## 7. What is intentionally off locally

- **Redis** — optional cache. Without it, website/session lookups go to
  PostgreSQL. Auth sessions and rate limits already use PostgreSQL.
- **ClickHouse** — optional analytics store. Without it, all analytics SQL runs
  on PostgreSQL through `src/features/analytics/server/queries/sql`.
- **Kafka** — only used with ClickHouse.
- **Cron scheduler** — `src/instrumentation.ts` starts it only when
  `NODE_ENV=production`. Local retention/notice jobs do not run.
- **Payment webhooks** — providers cannot reach `localhost`. Use the manual
  payment endpoint or a tunnel if you need to exercise a live webhook.
