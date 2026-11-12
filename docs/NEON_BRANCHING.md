# Neon Branching and Migration Promotion

> **Superseded 2026-11-12.** Production no longer uses Neon. The self-hosted
> Docker stack in `deploy/production/docker-compose.yml` runs PostgreSQL,
> Redis, ClickHouse, and Kafka on the VPS. This document is retained only as
> historical reference for an optional managed-Postgres setup.

Tartly uses Neon PostgreSQL as the primary relational database. This
document defines the branch model, connection strings, and how migrations move
from development to production.

Status: **design + local verification.** No Neon project is connected in this
environment. Phase 1 acceptance is proven against local PostgreSQL 17; the Neon
run remains for the human (see §6).

---

## 1. Branch model

| Branch         | Purpose                         | Data                                           | Who deploys           |
| -------------- | ------------------------------- | ---------------------------------------------- | --------------------- |
| `production`   | Live customer data              | Real                                           | Release workflow only |
| `staging`      | Pre-release rehearsal           | Copy of production, refreshed before a release | Release workflow      |
| `development`  | Shared integration branch       | Synthetic/test                                 | Developers            |
| `preview/<pr>` | One per pull request (optional) | Schema + anonymized subset or empty            | CI                    |
| local          | Developer machine               | Synthetic                                      | Developer             |

Rules:

- Local `.env` points at **local PostgreSQL** or the `development` branch.
  Never at `production` or `staging`.
- Preview deployments get a **preview branch**, never the production branch.
- `production` is only written by the release workflow. No developer laptop
  has its connection string in `.env`.
- Branch protection: require CI (lint, typecheck, test, build, isolation suite)
  before merging to `main`.

---

## 2. Connection strings

For each branch, Neon exposes two hosts:

| Variable                | Host                         | Used by                                                           |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`          | **pooled** (`...-pooler...`) | Next.js runtime, Prisma client                                    |
| `DATABASE_URL_UNPOOLED` | **direct**                   | `prisma migrate deploy`, `prisma migrate dev`, seed/backfill jobs |

Why:

- PgBouncer in transaction mode does not support long-lived session state or
  all prepared statements. Migrations need a direct session.
- Serverless functions open many short connections; pooling is required to
  avoid exhausting compute.

Local fallback: if `DATABASE_URL_UNPOOLED` is empty, `prisma.config.ts` uses
`DATABASE_URL`. That is convenient locally and unacceptable in production —
set both there.

Example (`development` branch):

```dotenv
DATABASE_URL=postgresql://user:pass@ep-dev-123-pooler.us-east-2.aws.neon.tech/tartly?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@ep-dev-123.us-east-2.aws.neon.tech/tartly?sslmode=require
```

Do not commit these. Store them in the host's secret manager and in a password
manager for humans.

---

## 3. Migration flow

```
feature branch
  └─ prisma migrate dev --name <change>      # writes prisma/migrations/<ts>_<name>
       └─ PR -> CI: migrate deploy on preview/development branch
            └─ merge to main
                 └─ staging: migrate deploy (direct host)
                      └─ smoke test
                           └─ production: migrate deploy (direct host)
```

### Rules

1. **Never edit an applied migration.** Add a new ordered migration.
2. **Migrations must be backwards-compatible for one release.** Deploy in this
   order: migration → app, so an old app can run against the new schema during
   rollout. Destructive changes are two releases (add/backfill, then drop).
3. **No data-only backfills in the schema migration** unless they are safe for
   the largest table. Use a script in `scripts/` with batching and a progress
   log.
4. **Test on a copy.** Before production, restore a recent production backup
   into `staging`, run `migrate deploy`, and run the smoke suite.
5. **Rollback:** Prisma has no down-migrations. Roll back by deploying the
   previous app version and, if the schema changed destructively, restoring the
   branch from a Neon restore point. Record the restore point before deploying.

### Neon restore points

Neon keeps instant restore points. Before a production migration:

```bash
# In the Neon console: create a restore point / note the current timestamp
# Then run:
DATABASE_URL_UNPOOLED=... pnpm exec prisma migrate deploy
```

If the migration fails or corrupts data, restore the production branch to the
recorded point, then fix forward on a new migration.

---

## 4. Preview branches

For each PR that changes the schema or billing logic:

1. Create a Neon branch from `production` (schema only) or from
   `development` (schema + test data).
2. Set `DATABASE_URL` / `DATABASE_URL_UNPOOLED` on the preview deployment.
3. Run `prisma migrate deploy` in the preview build step.
4. Delete the branch when the PR closes (Neon TTL or CI cleanup).

Do not copy real customer PII into preview branches without anonymization.

---

## 5. Production checklist

- [ ] Neon project is on a paid plan (Launch or Scale), not Free.
- [ ] `production` branch has a retention/restore policy documented.
- [ ] Runtime uses the pooled host; deploy job uses the direct host.
- [ ] `APP_SECRET` stored in the secret manager and backed up offline.
- [ ] `DATABASE_URL_UNPOOLED` is **not** exposed to the Next.js runtime.
- [ ] Migrations run as a separate deploy step, not during every cold start.
- [ ] Connection pool `max` (10 per instance) matches the Neon compute limit.
- [ ] Alerts on connection saturation, storage, and compute hours.
- [ ] A restore rehearsal has been performed (Phase 11).

---

## 6. What is verified vs. still needed

**Verified locally (2026-11-04):**

- `prisma migrate deploy` applies all 3 committed migrations to an empty
  PostgreSQL 17 database.
- The Prisma CLI reads `DATABASE_URL_UNPOOLED` first via `prisma.config.ts`;
  locally it falls back to `DATABASE_URL`.
- `/api/health` performs a real `select 1` and returns 503 without details when
  the database is down (see Phase 1 proof in `docs/PHASES.md`).

**Needs the human (no Neon credentials in this environment):**

1. Create the Neon project and the `production`, `staging`, `development`
   branches.
2. Paste the pooled/direct strings into the deployment secret manager (not
   chat, not git).
3. Run `DATABASE_URL_UNPOOLED=<direct> pnpm exec prisma migrate deploy` once
   against the empty `production` branch and record the output.
4. Create a preview branch for the first PR and confirm the preview deploy
   applies migrations.
