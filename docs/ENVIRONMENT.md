# Environment Setup

This document is complete enough to bring a new developer from a clean
checkout to a running app. It covers local, preview, and production.

- App: Next.js 16 / React 19 / Prisma 7 (see `package.json`).
- Database: PostgreSQL 17 locally; **Neon PostgreSQL** in preview/production.
- Package manager: **pnpm 10** (`pnpm-lock.yaml`). Do not use npm/yarn.
- In this fork, analytics events and replay payloads are stored in PostgreSQL
  unless `CLICKHOUSE_URL` is set. See `docs/SAAS_CONVERSION_AUDIT.md` §3.

---

## 1. Prerequisites

- Node.js 22.12+ or 24.x (`engines` in `package.json`).
- pnpm 10.10+ (`corepack enable` can provide it).
- PostgreSQL 17 (local Docker or Neon).
- Optional: Redis (website/session caching and collector helpers), ClickHouse +
  Kafka (large event volumes), S3-compatible storage.

---

## 2. Variables

Copy `.env.example` to `.env`. The canonical list lives there with comments.
The minimum to boot:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Runtime connection. On Neon: **pooled** host. |
| `DATABASE_URL_UNPOOLED` | production/preview | **Direct** host for `prisma migrate` and the CLI. Falls back to `DATABASE_URL` locally. |
| `APP_SECRET` | yes | Signs auth tokens, encrypts provider credentials. At least 32 bytes. |

Generate the secret:

```bash
openssl rand -hex 32
```

Changing `APP_SECRET` invalidates all sessions and makes previously stored
provider credentials undecryptable. Treat it as a long-lived key and rotate only
with a re-encryption plan.

Optional groups (see `.env.example`):

- Redis: `REDIS_URL`.
- ClickHouse/Kafka: `CLICKHOUSE_URL`, `KAFKA_URL`, `KAFKA_BROKER`,
  `KAFKA_SASL_MECHANISM`.
- Analytics provider fallback secrets: `STRIPE_WEBHOOK_SECRET`,
  `LEMONSQUEEZY_WEBHOOK_SECRET`, `POLAR_WEBHOOK_SECRET`.
- Platform billing (context A): `DODO_PAYMENTS_API_KEY`,
  `DODO_PAYMENTS_WEBHOOK_SECRET`, `DODO_PAYMENTS_ENVIRONMENT`,
  `DODO_STARTER_PRODUCT_ID`, `DODO_PRO_PRODUCT_ID`, and optional
  `DODO_STARTER_ANNUAL_PRODUCT_ID` / `DODO_PRO_ANNUAL_PRODUCT_ID`. These are
  separate from the per-website analytics Dodo connections. See
  `docs/PLATFORM_BILLING.md`.
- Email: `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL` (public origin used in
  invitation, verification, and reset links). Without `RESEND_API_KEY`,
  development writes messages to `.dev-emails/outbox.log`; the application log
  never contains a token. Set `EMAIL_OUTBOX=true` to use the same outbox when
  testing a production build locally. Set `COOKIE_SECURE=true` to force the
  Secure cookie flag, or `false` to test a production build over local HTTP.
- Tuning/flags: `SKIP_DB_CHECK`, `SKIP_DB_MIGRATION`, `DISABLE_BOT_CHECK`,
  `CLIENT_IP_HEADER`, `IGNORE_IP`, `LOG_QUERY`, `SALT_ROTATION`, etc.

`.env` is gitignored (`.gitignore` line 50). Never commit real values. The
repo contains no production credentials; verify with:

```bash
git log -p -- .env .env.local 2>/dev/null | head
```

---

## 3. Local setup

### Option A — Docker PostgreSQL (recommended for a clean DB)

```bash
cp .env.example .env
# set APP_SECRET and DATABASE_URL
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm exec prisma migrate deploy
pnpm dev
```

`docker-compose.yml` publishes PostgreSQL on `${POSTGRES_PORT:-5432}`. If port
5432 is already in use:

```bash
POSTGRES_PORT=5433 docker compose up -d postgres
# then: DATABASE_URL=postgresql://talivia:talivia@localhost:5433/talivia_oss
```

The compose database is `talivia_oss`, user `talivia`, password `talivia`.
These are local-only credentials, not production credentials.

Open <http://localhost:3000> and create an account at `/signup`. The obsolete
bootstrap `admin` / `admin` row is disabled by migration
`20261104190000_remove_default_admin`; there is no default credential.

Authentication uses durable PostgreSQL sessions behind an HttpOnly,
SameSite=Lax cookie (`rl_session`). Password changes and resets revoke every
session. Login, signup, password-reset, and resend endpoints are rate limited in
PostgreSQL, so Redis is not required for brute-force protection.

### Option B — Neon development branch

Use the `development` branch connection strings (see
`docs/NEON_BRANCHING.md`):

```dotenv
DATABASE_URL=postgresql://...-pooler.../revenuelens?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://...direct.../revenuelens?sslmode=require
```

Then:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm dev
```

Never point a local `.env` at the production branch.

### Install note

`sharp@0.34.5` ships prebuilt binaries. Its postinstall script may attempt a
source build and fail on machines without `node-gyp`. The app still works
because the prebuilt `@img/sharp-*` packages are installed. `package.json`
declares `sharp` under `pnpm.ignoredBuiltDependencies` so a frozen install
does not run that script. If sharp is ever missing:

```bash
pnpm rebuild sharp
```

---

## 4. Database commands

```bash
pnpm exec prisma generate          # regenerate the client into src/generated/prisma
pnpm exec prisma migrate deploy    # apply committed migrations (uses DATABASE_URL_UNPOOLED)
pnpm exec prisma migrate dev       # create a new migration (development only)
pnpm exec prisma studio            # inspect data
```

`prisma.config.ts` selects `DATABASE_URL_UNPOOLED` first and falls back to
`DATABASE_URL`. The runtime Prisma client (`src/lib/prisma.ts`) always uses
`DATABASE_URL` (pooled). This split is deliberate: migrations need a direct
session; serverless runtime needs pooling.

---

## 5. Health checks

- `GET /api/health` — readiness. Runs `select 1` and returns
  `{ ok, service, database, version }`. Returns 503 with no error details when
  the database is unreachable.
- `GET /api/heartbeat` — process liveness only (no database).

```bash
curl -s http://localhost:3000/api/health
```

---

## 6. Preview and production

### Build

```bash
pnpm build
```

`build` runs `check-env`, `prisma generate`, `check-db` (connectivity + version
+ pending migrations), the tracker/recorder bundles, `next build`, and
`postbuild`. `check-db` applies migrations unless `SKIP_DB_MIGRATION` is set.

### Production variables

Set these in the host's secret manager, not in the repository:

- `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct, for deploy jobs).
- `APP_SECRET` (32+ random bytes).
- `REDIS_URL` if using multiple instances (sessions, rate limits, cache).
- Provider/platform keys when those phases ship.

### Deployment notes

- Use `output: 'standalone'` (already configured) if running containers.
- The tracker and recorder are served from `public/script.js` and
  `public/recorder.js`; allow cross-origin access to `/script.js`.
- Provider webhook URLs are derived from the incoming request origin. Behind a
  proxy, forward `Host` and `X-Forwarded-Proto`.
- Do not run preview deployments against the production database. Use a Neon
  preview branch (see `docs/NEON_BRANCHING.md`).

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `APP_SECRET must be ...` | missing/short/placeholder | `openssl rand -hex 32`, restart |
| `Can't reach database server` | wrong host/port, Neon compute suspended | check `DATABASE_URL`; the app retries reads on cold start |
| `prepared statement already exists` | transaction pooling without `pgbouncer=true` | use the Neon **pooled** string for runtime and direct for migrations |
| Migrations hang in production | migration job used the pooled host | set `DATABASE_URL_UNPOOLED` |
| `sharp` install error | source build attempted | ignored via `pnpm.ignoredBuiltDependencies`; `pnpm rebuild sharp` if needed |
| Events not arriving | ad blocker/CSP/wrong domain | see onboarding troubleshooting (Phase 8) |

---

## 8. Verified baseline

On 2026-11-04, with Node 24.13.0, pnpm 10.10.0 and PostgreSQL 17:

- `pnpm exec prisma migrate deploy` applied all 3 baseline migrations to an
  empty database.
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` passed.
- `pnpm test`: 479 passed / 3 pre-existing failures (see `docs/PHASES.md`).
