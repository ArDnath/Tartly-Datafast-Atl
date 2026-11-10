# Backup and recovery

Tartly stores every durable record in PostgreSQL (Neon in production).
There is no separate event-store backup at launch: events, sessions, replay
payloads, billing, usage, audit, and tenant rows all live in the same database.

## Targets

| Item                           | Launch target                                               |
| ------------------------------ | ----------------------------------------------------------- |
| Recovery point objective (RPO) | ≤ 5 minutes (Neon point-in-time restore)                    |
| Recovery time objective (RTO)  | ≤ 2 hours for a full restore; ≤ 30 minutes for a bad deploy |
| Backup retention               | 7 days minimum, 30 days recommended                         |
| Restore rehearsal              | once before launch, then quarterly                          |

These are targets, not measured guarantees. Record the actual Neon plan and
restore timing in the launch checklist.

## What must be backed up

1. PostgreSQL database (all tables and Prisma migrations).
2. Environment/secrets (stored in the host's secret manager, not in git).
3. The deployed container image or Next.js build artifact, tagged with the
   commit SHA.
4. DNS and domain configuration (exported from the registrar/edge provider).
5. Provider configuration references: Dodo product IDs, webhook endpoints,
   Resend domain, Neon project/branch IDs. Secrets stay in the secret manager.

## Neon point-in-time restore

Neon keeps a history window that depends on the project plan. For a production
incident:

1. Confirm the target timestamp **before** the bad write/deploy.
2. Create a new branch from that timestamp. Do not overwrite the primary.
3. Point a staging app at the restored branch and run the smoke checks below.
4. Only then promote/switch the production connection string.
5. Keep the old primary available until the new one is verified.

Exact Neon console/API steps must be recorded with the Neon project once the
production project exists. This repository cannot verify a Neon restore
without credentials; mark that rehearsal **UNVERIFIED** until run.

## Logical backup (portable)

Use the **direct/unpooled** URL, not the pooled host.

```bash
pg_dump "$DATABASE_URL_UNPOOLED" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "tartly-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Restore into a fresh database:

```bash
createdb tartly_restore
pg_restore --no-owner --no-privileges --dbname tartly_restore backup.dump
DATABASE_URL=postgresql://.../tartly_restore pnpm exec prisma migrate deploy
```

`pg_restore` should report zero errors. A custom-format dump is preferred over
plain SQL because it can be restored selectively and verified.

## Verification after any restore

Run these against the restored database before switching traffic:

```bash
pnpm exec prisma migrate status
pnpm check-db
TZ=UTC pnpm test
RUN_PHASE7_DB_SMOKE=1 \
  PHASE7_DATABASE_URL="$RESTORED_URL" \
  pnpm exec vitest run --config vitest.phase7.config.ts \
  src/features/analytics/server/queries/phase7-analytics-smoke.test.ts
```

Then check row counts for the critical tenant tables and confirm that a known
website ID still resolves inside exactly one workspace:

```sql
select count(*) from workspace where deleted_at is null;
select count(*) from website where deleted_at is null;
select count(*) from website_event;
select count(*) from platform_subscription;
select count(*) from audit_event;
```

Do not claim a restore succeeded because the command exited 0. Confirm the
application can sign in, read a dashboard, and ingest one event.

## Bad deploy rollback

1. Roll back to the previous image/build tagged with the prior commit SHA.
2. If the deploy included a forward-only migration, do **not** run a down
   migration blindly. Restore the pre-deploy branch or ship a corrective
   forward migration. Prisma migrations are forward-only here.
3. Re-run `/api/health/ready` and the smoke checks.
4. Record the incident and the exact SHA pair in `docs/PHASES.md`.

## Secrets backup

Provider credentials are encrypted with `APP_SECRET`. A database restore is
useless without the same key. Store `APP_SECRET` in the secret manager with the
database backup metadata. Rotation is covered in `docs/SECRETS_ROTATION.md`.
