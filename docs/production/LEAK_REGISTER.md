# Leak register

A "leak" is any path where one tenant can read, change, delete, or infer another
tenant's data, or where customer data outlives its promised retention. This
register is the contract between the security claims and the code. Every row
names the file that enforces the control and the test that fails if the control
is removed.

Update this file when a control changes. A row without an automated proof is a
finding, not a pass.

**Status values:** VERIFIED (live or integration proof), UNVERIFIED (code +
unit proof only), OPEN (no control), N/A (with trigger).

| ID  | Leak class                | Control                                                                                                                                  | Enforced in                                                                                  | Automated proof                                                                  | Live proof                                                | Status     |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------- |
| L1  | Cross-workspace read      | Every tenant read goes through workspace membership; no query takes an id alone                                                          | `src/permissions/index.ts`, `src/permissions/website.ts`                                     | `src/lib/tenant-boundaries.test.ts`, `src/permissions/website.workspace.test.ts` | Local A/B probe (2026-11-13)                              | UNVERIFIED |
| L2  | Cross-tenant write/delete | Mutations re-check the workspace role inside the handler and the transaction                                                             | `src/lib/workspace-auth.ts`, `src/queries/prisma/*`                                          | Route/handler tests per domain                                                   | Not run on production                                     | UNVERIFIED |
| L3  | Share-link scope          | A share token is resolved with its share context; links expire after 30 days; filters are redacted                                       | `src/lib/share-policy.ts`, `src/lib/share-redaction.ts`, `src/lib/share-sections.ts`         | `src/lib/share-policy.test.ts`, `src/lib/share-redaction.test.ts`                | Expired-token check not run                               | UNVERIFIED |
| L4  | API-key scope             | Keys are bound to their creator, revoked on member removal and user suspension; Pro-only read tools                                      | `src/lib/request.ts`, `src/features/developer/server/context.ts`                             | `src/lib/feature-access.test.ts`, developer handler tests                        | Not run on production                                     | UNVERIFIED |
| L5  | Collector abuse           | Origin allowlist, Redis rate limit, body cap, timestamp bounds, per-website event idempotency                                            | `src/features/analytics/server/send/handler.ts`, `src/lib/rate-limit.ts`                     | `src/lib/rate-limit.test.ts`, collector tests                                    | Ingest works; abuse controls not load-tested              | UNVERIFIED |
| L6  | Secret exposure           | Env-only configuration, AES-256-GCM provider secrets, log redaction, no secret in responses                                              | `src/lib/crypto.ts`, `src/features/payments/server/provider-secrets.ts`, `src/lib/logger.ts` | `src/lib/crypto.test.ts`, `provider-secrets.test.ts`, `logger.test.ts`           | Gitleaks in CI                                            | VERIFIED   |
| L7  | Analytics PII             | No tracker cookies; keyed rotating visitor hash; no raw IP stored; salt rotation `month`                                                 | `src/features/analytics/lib/*`, tracker build                                                | Tracker tests + `document.cookie` assertion                                      | Cookie-free build checked; production storage not audited | UNVERIFIED |
| L8  | Session replay            | Input masking by default, consent gate, chunk and byte limits, plan + per-session meter                                                  | `src/recorder/privacy.js`, replay ingest handler                                             | `src/recorder/privacy.test.ts`, replay handler tests                             | Recorder not browser-tested                               | UNVERIFIED |
| L9  | Billing context confusion | Platform billing (`features/billing`) never shares secrets, tables, or webhook secrets with analytics integrations (`features/payments`) | `src/features/billing/server/*`, `src/features/payments/server/*`                            | Billing + payments suites                                                        | Dodo webhook accepted (test payload, 2026-11-12)          | UNVERIFIED |
| L10 | Webhook forgery/replay    | HMAC over raw body, constant-time compare, timestamp tolerance, per-website secret, provider-event dedupe                                | `src/features/billing/lib/standard-webhook.ts`, `src/features/payments/server/webhooks/*`    | Webhook handler tests                                                            | Not exercised by a real provider                          | UNVERIFIED |
| L11 | Admin/operator overreach  | Platform-admin allowlist, audited suspension, OSS telemetry restricted to admins                                                         | `src/lib/platform-admin.ts`, `src/features/account/server/admin/*`                           | `src/lib/platform-admin.test.ts`, admin handler tests                            | Not run on production                                     | UNVERIFIED |
| L12 | Data outlives retention   | Plan-based retention for PostgreSQL and ClickHouse; global TTLs as a safety net                                                          | `src/features/system/cron/jobs/analytics-retention.ts`, `src/lib/clickhouse-retention.ts`    | `analytics-retention.test.ts`, `clickhouse-retention.test.ts`                    | TTLs applied; job never run                               | UNVERIFIED |
| L13 | Backup exfiltration       | Backups are compressed, `.env` encrypted at rest, 14-day retention, on-host directory                                                    | `deploy/production/backup.sh`                                                                | Deploy-script parse check                                                        | Off-host copy missing                                     | OPEN       |
| L14 | Dependency compromise     | Gitleaks, CodeQL, dependency review, Trivy filesystem and image scans block merges                                                       | `.github/workflows/ci.yml`                                                                   | CI required checks                                                               | CI green on `8068012`                                     | VERIFIED   |

## How this register stays honest

1. A new tenant-owned table or route requires a row here (or an explicit note
   under the owning row) in the same pull request.
2. Downgrading a row to OPEN is a release blocker; it is not a documentation
   edit.
3. "Live proof" means production. A local probe is recorded as UNVERIFIED and
   listed in `docs/PRODUCTION_READINESS.md` phase PR-1.
4. When a control is removed, the linked test must fail. If it does not, the
   test is not a control — fix the test or delete the row.
