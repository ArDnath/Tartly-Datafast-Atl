# Environment Setup

This document is complete enough to bring a new developer from a clean
checkout to a running app. It covers local, preview, and production.

- App: Next.js 16 / React 19 / Prisma 7 (see `package.json`).
- Database: PostgreSQL 17 locally and in production. Production runs its own
  PostgreSQL container on the VPS; there is no Neon dependency.
- Cache and analytics store: Redis, ClickHouse, and Kafka run as containers in
  production. Locally they are optional.
- Package manager: **pnpm 10** (`pnpm-lock.yaml`). Do not use npm/yarn.
- When `CLICKHOUSE_URL` is set, analytics queries read ClickHouse and events
  are mirrored to PostgreSQL for attribution. See
  `docs/SAAS_CONVERSION_AUDIT.md` §3 and `deploy/production/docker-compose.yml`.

---

## 1. Prerequisites

- Node.js 22.12+ or 24.x (`engines` in `package.json`).
- pnpm 10.10+ (`corepack enable` can provide it).
- PostgreSQL 17 (local Docker or the production Compose stack).
- Optional locally: Redis (website/session caching and collector helpers),
  ClickHouse + Kafka (event store and transport), S3-compatible storage. All
  four are provisioned by `deploy/production/docker-compose.yml`.

---

## 2. Variables

Copy `.env.example` to `.env`. The canonical list lives there with comments.
The minimum to boot:

| Variable                   | Required   | Purpose                                                                                  |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | yes        | Runtime PostgreSQL connection. In production: `postgres:5432`.                           |
| `DATABASE_URL_UNPOOLED`    | production | Direct connection for `prisma migrate` and the CLI. The Docker stack uses the same host. |
| `APP_SECRET`               | yes        | Signs auth tokens, encrypts provider credentials. At least 32 bytes.                     |
| `POSTGRES_PASSWORD`        | production | Password for the PostgreSQL container; must match both database URLs.                    |
| `REDIS_PASSWORD`           | production | Password for Redis; must match `REDIS_URL`.                                              |
| `CLICKHOUSE_PASSWORD`      | production | Password for the ClickHouse user; must match `CLICKHOUSE_URL`.                           |
| `CLICKHOUSE_URL`           | production | Enables ClickHouse analytics. The stack migrates the schema before the app starts.       |
| `KAFKA_URL`/`KAFKA_BROKER` | production | Enables Kafka transport and the Kafka-to-ClickHouse worker.                              |

Generate the secret:

```bash
openssl rand -hex 32
```

Changing `APP_SECRET` invalidates all sessions and makes previously stored
provider credentials undecryptable. Treat it as a long-lived key and rotate only
with a re-encryption plan.

Optional groups (see `.env.example`):

- Redis: `REDIS_URL`. Production also sets `REDIS_PASSWORD`.
- ClickHouse/Kafka: `CLICKHOUSE_URL`, `KAFKA_URL`, `KAFKA_BROKER`,
  `KAFKA_SASL_MECHANISM`. Production also sets `CLICKHOUSE_PASSWORD`.
- Self-hosted production passwords: `POSTGRES_PASSWORD`, `REDIS_PASSWORD`,
  `CLICKHOUSE_PASSWORD`. Compose reads these; the URLs read the same values.
- Analytics provider fallback secrets: `STRIPE_WEBHOOK_SECRET`,
  `LEMONSQUEEZY_WEBHOOK_SECRET`, `POLAR_WEBHOOK_SECRET`.
- Platform billing (context A): `DODO_PAYMENTS_API_KEY`,
  `DODO_PAYMENTS_WEBHOOK_SECRET`, `DODO_PAYMENTS_ENVIRONMENT`,
  `DODO_STARTER_PRODUCT_ID`, `DODO_PRO_PRODUCT_ID`, optional
  `DODO_STARTER_ANNUAL_PRODUCT_ID` / `DODO_PRO_ANNUAL_PRODUCT_ID`, and optional
  `DODO_PRODUCT_IDS_JSON` for exact traffic-tier products. These are separate
  from the per-website analytics Dodo connections. `pnpm billing:setup-dodo`
  uses the same `src/lib/plans.ts` source to create and print them. See
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

### Option B — remote PostgreSQL for local development (optional)

A developer may use any remote PostgreSQL 17+ database for local development.
This is not the production architecture; production runs its own PostgreSQL
container on the VPS.

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_URL_UNPOOLED=postgresql://user:password@host:5432/database
```

Then:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm dev
```

Never point a local `.env` at the production database.

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
`DATABASE_URL`. This split is deliberate: migrations need a direct session,
while runtime traffic may go through a pooler. The production Docker stack uses
the internal PostgreSQL service for both values.

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

- pending migrations), the tracker/recorder bundles, `next build`, and
  `postbuild`. `check-db` applies migrations unless `SKIP_DB_MIGRATION` is set.

### Production variables

The production runtime is the self-hosted Compose stack in
`deploy/production/docker-compose.yml`. Set these in
`/opt/tartly/runtime/.env` (mode 600), not in the repository:

- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `CLICKHOUSE_PASSWORD` (32+ random
  bytes each). Generate with `openssl rand -hex 32`.
- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` pointing at
  `postgres:5432`, with the same PostgreSQL password.
- `REDIS_URL` pointing at `redis:6379`, with the same Redis password.
- `CLICKHOUSE_URL` pointing at `clickhouse:8123/talivia` (leave it empty to
  keep analytics in PostgreSQL).
- `KAFKA_URL` and `KAFKA_BROKER` pointing at `kafka:9092` (leave them empty to
  write directly to ClickHouse).
- `APP_SECRET` (32+ random bytes; never rotate casually).
- Google OAuth, Resend, and Dodo platform-billing credentials.
- `APP_URL`, `TARTLY_DOMAIN`, `ACME_EMAIL`, `TARTLY_APP_DIR`.

The complete template is `deploy/production/.env.example`.

### Deployment notes

- `deploy.sh` builds `tartly-app:<sha>`, starts the data services, backs up
  PostgreSQL, applies Prisma and ClickHouse migrations, restarts the app and
  worker, and verifies the exact running SHA. See `docs/CI_CD.md`.
- Use `output: 'standalone'` (already configured) if running containers.
- The tracker and recorder are served from `public/script.js` and
  `public/recorder.js`; allow cross-origin access to `/script.js`.
- Provider webhook URLs are derived from the incoming request origin. Behind a
  proxy, forward `Host` and `X-Forwarded-Proto`.
- Do not run preview deployments against the production database. Use a copy
  restored from `docs/BACKUP_AND_RECOVERY.md`.
- The daily backup cron writes to `/opt/tartly/backups`; copy that directory
  off-host with encryption. See `docs/BACKUP_AND_RECOVERY.md`.

---

## 7. Troubleshooting

| Symptom                            | Cause                                           | Fix                                                                                                  |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `APP_SECRET must be ...`           | missing/short/placeholder                       | `openssl rand -hex 32`, restart                                                                      |
| `Can't reach database server`      | PostgreSQL container down or wrong URL          | `docker compose ps postgres`; check logs and `DATABASE_URL`                                          |
| Verified password authentication   | URL password does not match `POSTGRES_PASSWORD` | update both values in `.env` and recreate `postgres`; never change the DB password in place          |
| Migrations hang in production      | `DATABASE_URL_UNPOOLED` is missing/wrong        | set it to the internal `postgres` URL                                                                |
| ClickHouse health stays `starting` | user-level setting in `config.d` or OOM         | check `clickhouse-server.err.log`; only server-level settings belong in `config.d`                   |
| Events missing from ClickHouse     | worker down while Kafka is enabled              | `docker compose --profile streaming ps worker`; inspect logs; events fall back only on Kafka failure |
| `sharp` install error              | source build attempted                          | ignored via `pnpm.ignoredBuiltDependencies`; `pnpm rebuild sharp` if needed                          |
| Events not arriving                | ad blocker/CSP/wrong domain                     | see onboarding troubleshooting (Phase 8)                                                             |

---

## 8. Verified baseline

On 2026-11-04, with Node 24.13.0, pnpm 10.10.0 and PostgreSQL 17:

- `pnpm exec prisma migrate deploy` applied all 3 baseline migrations to an
  empty database.
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` passed.
- `pnpm test`: 479 passed / 3 pre-existing failures (see `docs/PHASES.md`).
