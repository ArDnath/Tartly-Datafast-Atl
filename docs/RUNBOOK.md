# Operations runbook

Short, concrete procedures for the on-call operator. Every command assumes the
repository and production environment variables are available. Never paste
secrets into a ticket or chat.

## 1. Deploy

Automatic path: merge a green PR to `main`. The `CI` workflow must pass, then
`Deploy production` runs `deploy/production/deploy.sh` for the exact merged SHA
after the `production` environment approval. It builds an immutable image tagged
with the commit SHA, runs `prisma migrate deploy`, restarts only the app
container, and waits for `/api/health/ready`. See `docs/CI_CD.md` for the
one-time host and secret setup.

Manual path (same script, same guarantees):

```bash
gh workflow run deploy.yml -f sha=<40-char-main-sha>
```

After either path:

1. Confirm `/api/health/live` and `/api/health/ready` return 200.
2. Sign in, open one dashboard, and confirm one event arrives from a test
   website.
3. Keep the previous commit SHA for rollback.

If all five deploy values are missing, the job skips when `DEPLOY_ENABLED` is
not `true`; it never attempts an unauthenticated or unpinned-host deploy.

## 2. Roll back

1. Redeploy the previous known-good commit SHA:

   ```bash
   gh workflow run deploy.yml -f sha=<previous-40-char-main-sha>
   ```
2. `deploy.sh` redeploys that SHA automatically when readiness fails during a
   deploy. A manual rollback must use a SHA that is already on `origin/main`.
3. Do not reverse a Prisma migration automatically. If the bad deploy included
   a migration, restore the pre-deploy Neon branch or ship a corrective forward
   migration.
4. Confirm readiness and the smoke checks above.
5. Record the incident and SHAs in `docs/PHASES.md`.

## 3. Readiness fails (database down)

- `/api/health/ready` returns 503 and `database: "down"`.
- Check the Neon project status and connection limits first.
- Check the pooled vs direct URL: runtime must use the pooled host; migrations
  must use the direct host.
- If the pool is exhausted, reduce app concurrency or raise the pool limit; do
  not point the app at the migration URL.
- The app logs a generic failure; detailed driver errors must not be exposed.

## 4. Event ingestion spike or abuse

Symptoms: event volume far above plan, one IP/domain dominating, Redis/DB
latency, 429s, or usage-limit emails firing early.

1. Confirm the spike is real and tied to one website/IP:

   ```sql
   select website_id, count(*) from website_event
   where created_at > now() - interval '15 minutes'
   group by 1 order by 2 desc limit 10;
   ```
2. The plan meter pauses billable ingestion at the hard limit; reads stay up.
3. Block an abusive IP with `IGNORE_IP` and redeploy, or suspend the account in
   **Settings → Platform ops**.
4. If a public website ID is being injected from foreign hosts, turn on
   `ENFORCE_TRACKER_ORIGIN=true` after confirming the website domain.
5. Record the action in the audit log (the suspension endpoint does this
   automatically) and notify the owner if legitimate.

## 5. Billing webhook failures

1. Check `billing_event` for `failed` rows and the provider dashboard delivery
   log.
2. Invalid signature: confirm the webhook secret and that the raw body reached
   the handler unmodified (no proxy body rewrite).
3. Replay/duplicate: the unique `webhook-id` makes reprocessing safe. Do not
   delete the event row to "retry"; let the provider retry or re-send.
4. Unknown product ID: checkout fails closed. Add the product ID to the
   environment; never map unknown products to Starter.
5. Past-due/expired: access follows `platform_subscription`. Do not grant access
   from a checkout redirect.

## 6. Payment integration (customer revenue) webhook failures

1. Open the website's **Integrations** settings and check connection status.
2. Confirm the per-website signing secret is present and decrypts.
3. Provider events are deduplicated by provider event ID; a duplicate is safe.
4. If `APP_SECRET` was rotated, confirm the previous key window and run
   `pnpm rotate:provider-secrets`.

## 7. Account compromise or leaked key

1. Suspend the user in **Settings → Platform ops**; this revokes sessions.
2. Revoke website API keys.
3. Rotate the affected provider key or `APP_SECRET` per
   `docs/SECRETS_ROTATION.md`.
4. Preserve audit rows. Do not delete the account until the investigation ends.

## 8. Suspended account

- A suspended user cannot sign in and existing sessions stop resolving.
- A suspended workspace disappears from workspace lists and tenant access
  checks.
- Data is retained. Unsuspend from the same console; the user must sign in
  again.

## 9. Restore

Follow `docs/BACKUP_AND_RECOVERY.md`. A restore is not complete until the app
signs in, reads a dashboard, and ingests one event against the restored
database.

## 10. Health endpoints

| Endpoint            | Meaning                             |
| ------------------- | ----------------------------------- |
| `/api/health/live`  | process responds; no database check |
| `/api/health/ready` | database reachable; 503 when not    |
| `/api/health`       | same readiness check (legacy alias) |

Use `live` for container restarts and `ready` for load-balancer traffic.

## 11. Logs and traces

- Logs are JSON lines on stdout/stderr. Each entry has `at`, `level`, `event`,
  and redacted fields.
- Set `ERROR_TRACKING_WEBHOOK` to forward unhandled errors to a collector. A
  reporting failure never breaks a request.
- Search by `event` and tenant IDs, never by a raw secret. If a secret appears
  in a log, rotate it and fix the call site.

## 12. Daily checks

- Readiness green for 24 h.
- Failed billing events = 0, or explained.
- Usage-limit notices sent once per workspace per period.
- Retention job ran at 03:30 UTC; usage notices at 04:00 UTC.
- No unexpected growth in `audit_event`, `billing_event`, or replay storage.
