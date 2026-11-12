# Backup and recovery

Production is self-hosted on one VPS. PostgreSQL holds every tenant, billing,
usage, audit, and attribution row. ClickHouse holds the analytics event store,
event/session data, and replay payloads. There is no managed point-in-time
restore; the operator owns the backup and restore process.

## Targets

| Item                           | Target                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| Recovery point objective (RPO) | ≤ 6 hours with the backup timer; ≤ 1 deploy with pre-deploy dump |
| Recovery time objective (RTO)  | ≤ 2 hours for a full restore; ≤ 30 minutes for a bad deploy      |
| Backup retention               | 14 days locally (`BACKUP_RETENTION_DAYS`)                        |
| Off-host copy                  | Required, not yet configured (**UNVERIFIED**)                    |
| Restore rehearsal              | Before launch, then quarterly                                    |

The backup timer is installed by the operator:

```cron
# /etc/cron.d/tartly-backup
17 */6 * * * deploy cd /opt/tartly/runtime && BACKUP_DIR=/opt/tartly/backups ./backup.sh >> /var/log/tartly-backup.log 2>&1
```

The pre-deploy dump is automatic and blocks a deploy if it fails.

## What is backed up

| Item                              | Location                                  | Notes                                           |
| --------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| PostgreSQL (all Prisma tables)    | `/opt/tartly/backups/postgres/*.dump`     | custom-format `pg_dump`, compressed             |
| ClickHouse (analytics + replay)   | `/opt/tartly/backups/clickhouse/tartly-*` | native `BACKUP DATABASE ... TO Disk('backups')` |
| Runtime environment               | `/opt/tartly/backups/env/*.env`           | contains secrets, mode 600                      |
| Commit/image identity             | `/opt/tartly/runtime/last-deploy`         | the running `BUILD_VERSION` and image tag       |
| Caddy TLS state                   | Docker volume `tartly_caddy_data`         | recoverable by re-issuing certificates          |
| Domain/DNS/provider configuration | registrar and provider dashboards         | export manually                                 |

**The backup directory contains secrets and tenant data.** Keep it mode 700.
Do not commit it, attach it to a ticket, or copy it to an unencrypted bucket.
`APP_SECRET` is required to decrypt provider credentials; a database restore
without the same `APP_SECRET` cannot use the stored integrations.

## Run a backup manually

```bash
cd /opt/tartly/runtime
BACKUP_DIR=/opt/tartly/backups ./backup.sh
```

PostgreSQL only (what the deploy script runs):

```bash
BACKUP_DIR=/opt/tartly/backups ./backup.sh --postgres-only
```

List what exists:

```bash
find /opt/tartly/backups -maxdepth 2 -type f -printf '%p %s bytes\n' | sort
```

## Off-host copy

The backup directory is on the same VPS as the database. That is not a complete
backup: a disk loss takes both. The operator must copy it to encrypted
off-host storage (object storage, a second host, or encrypted removable media)
and record the destination and retention policy. No credentials for an offsite
target are configured in this repository, so this remains **UNVERIFIED** until
the human sets it up.

Recommended shape:

```bash
# Example only; use the provider's CLI and encryption.
age -r <recipient> -o tartly-backup.tar.age tartly-backup.tar
rclone copy tartly-backup.tar.age remote:tartly-backups/
```

Never upload the raw `.dump` or `.env` unencrypted.

## Restore PostgreSQL

1. Stop the app so it cannot write during the restore:

   ```bash
   cd /opt/tartly/runtime
   docker compose --env-file .env stop app worker
   ```

2. Create a fresh database (the existing `tartly` database can be renamed
   first if a rollback is needed):

   ```bash
   docker compose --env-file .env exec -T postgres \
     createdb -U tartly tartly_restore
   ```

3. Restore the newest dump:

   ```bash
   docker compose --env-file .env exec -T postgres \
     pg_restore -U tartly -d tartly_restore --no-owner --no-privileges \
     < /opt/tartly/backups/postgres/tartly-YYYYMMDDTHHMMSSZ.dump
   ```

4. Verify before switching:

   ```bash
   docker compose --env-file .env exec -T postgres psql -U tartly -d tartly_restore -c "
     select 'workspace', count(*) from workspace
     union all select 'website', count(*) from website
     union all select 'event', count(*) from website_event
     union all select 'subscription', count(*) from platform_subscription
     union all select 'audit', count(*) from audit_event;"
   ```

   `pg_restore` must report zero errors. Then point `DATABASE_URL` and
   `DATABASE_URL_UNPOOLED` at `tartly_restore`, start the app, and run the
   checks below. Rename databases only after the restored copy is verified.

5. Apply any newer migrations and start the app:

   ```bash
   docker compose --env-file .env --profile tools run --rm migrate
   docker compose --env-file .env up -d --no-deps app
   ```

## Restore ClickHouse

ClickHouse backups are native `BACKUP` directories. `RESTORE DATABASE` creates
the database, so the target must not already exist. On ClickHouse 25.3 a
pre-created empty `talivia` database makes the restore fail; drop it first
after confirming the backup is present.

1. Stop the app and worker so they cannot write during the restore:

   ```bash
   cd /opt/tartly/runtime
   docker compose --env-file .env stop app worker
   ```

2. Copy the backup directory back into the ClickHouse container and make it
   readable by the ClickHouse user:

   ```bash
   NAME=tartly-YYYYMMDDTHHMMSSZ
   docker cp "/opt/tartly/backups/clickhouse/$NAME" \
     "$(docker compose --env-file .env ps -q clickhouse):/var/lib/clickhouse/backups/"
   docker compose --env-file .env exec -u root clickhouse \
     chown -R clickhouse:clickhouse "/var/lib/clickhouse/backups/$NAME"
   ```

3. Drop the existing analytics database and restore:

   ```bash
   docker compose --env-file .env exec -T clickhouse clickhouse-client \
     --user talivia --password "$CLICKHOUSE_PASSWORD" \
     --query "DROP DATABASE IF EXISTS talivia"

   docker compose --env-file .env exec -T clickhouse clickhouse-client \
     --user talivia --password "$CLICKHOUSE_PASSWORD" \
     --query "RESTORE DATABASE talivia FROM Disk('backups', '$NAME')"
   ```

   The restore must report `RESTORED`. If it does not, do not start the app.

4. Verify table counts and run the application checks below. Then start the
   app and worker:

   ```bash
   docker compose --env-file .env up -d --no-deps app
   docker compose --env-file .env --profile streaming up -d --wait --no-deps worker
   ```

Events are also mirrored to PostgreSQL with the same `event_id` while
ClickHouse is enabled, so a partial ClickHouse loss can be diagnosed against
`website_event`. Session data and replay payloads exist only in ClickHouse.

## Verification after any restore

```bash
curl -fsS https://tartly.in/api/health/live
curl -fsS https://tartly.in/api/health/ready
```

Readiness must report `ok: true`, `database: "up"`, and the running version.
Then:

1. Sign in with Google.
2. Open a dashboard and a report.
3. Send one test event and confirm it appears in the dashboard.
4. Confirm the ClickHouse worker is healthy if Kafka is enabled.
5. Record the Restore SHA, dump name, ClickHouse backup name, and elapsed time
   in `docs/PHASES.md`.

Do not claim a restore succeeded because a command exited 0.

## Bad deploy rollback

1. Redeploy the previous known-good commit:
   `gh workflow run deploy.yml -f sha=<previous-sha> -f allow_previous=true`.
2. If the deploy included a migration, prefer a corrective forward migration.
   If data must be restored, use the pre-deploy dump above; migrations are
   forward-only.
3. Re-run readiness and the smoke checks.
4. Record the incident and both SHAs in `docs/PHASES.md`.

## Secrets

`APP_SECRET` cannot be recovered from the database. Keep a copy in the
encrypted environment backup and in the operator's secret manager. Rotation is
covered in `docs/SECRETS_ROTATION.md`.
