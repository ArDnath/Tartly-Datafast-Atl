# Database audit

- **Audited revision:** `7e32b59`. **Method:** read-only inspection of `prisma/schema.prisma`,
  `prisma/migrations/`, and the query layer. No database connection, migration, or query was run.
- **Actual row counts / sizes / bloat are UNVERIFIED.** Everything below is schema- and
  migration-derived.
- **Concurrency:** schema and migrations were verified at `7e32b59`; neither changed during the audit, but re-check before writing a migration.

## 1. Snapshot

| Metric                             | Value | Command                                                                   |
| ---------------------------------- | ----- | ------------------------------------------------------------------------- |
| Prisma models                      | 53    | `grep -c "^model " prisma/schema.prisma`                                  |
| Tables created across migrations   | 53    | `grep -rn "CREATE TABLE" prisma/migrations \| wc -l`                      |
| Migration directories              | 17    | `ls -d prisma/migrations/*/ \| wc -l`                                     |
| Migration SQL lines                | 1,854 | `find prisma/migrations -name '*.sql' \| xargs wc -l \| tail -1`          |
| `CREATE [UNIQUE] INDEX` statements | 247   | `grep -rn "CREATE INDEX\|CREATE UNIQUE INDEX" prisma/migrations \| wc -l` |
| Foreign keys defined in SQL        | **0** | `grep -rn "FOREIGN KEY\|REFERENCES" prisma/migrations \| wc -l`           |
| `DROP TABLE` statements            | **0** | `grep -rn "DROP TABLE" prisma/migrations \| wc -l`                        |

Prisma is configured with `relationMode = "prisma"` (`prisma/schema.prisma:7-10`). The workspace
migration states the consequence explicitly: "foreign keys are enforced by the Prisma client rather
than PostgreSQL" (`prisma/migrations/20261104180000_workspaces/migration.sql:1-4`). There is no
database-level referential integrity.

## 2. Models and tenant keys

`workspace_id` is the tenant root. Event/payment data is keyed by `website_id`, which resolves to a
workspace through `website.workspace_id`. `NULL` in a tenant column is called out.

### 2.1 Tenant root and platform billing

| Model                       | Tenant key                                       | Notes / evidence                                                                                                 |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `Workspace`                 | `workspace_id` (PK)                              | Root tenant; `owner_id`, `plan_id`, `subscription_status`, `suspended_at`, `deleted_at` (`schema.prisma:20-50`). |
| `WorkspaceMembership`       | `workspace_id`                                   | Unique `(workspace_id, user_id)`, role string (`:213-228`).                                                      |
| `WorkspaceInvitation`       | `workspace_id`                                   | Unique `(workspace_id, email)`, hashed token, expiry (`:230-249`).                                               |
| `BillingCustomer`           | `workspace_id` (unique)                          | One provider customer per workspace (`:56-69`).                                                                  |
| `PlatformSubscription`      | `workspace_id` (unique)                          | One subscription per workspace; provider subscription id is **not** unique (`:74-109`).                          |
| `BillingEvent`              | `workspace_id` **nullable**                      | Raw webhook bookkeeping; `provider_event_id` is globally unique (`:113-129`).                                    |
| `BillingInvoice`            | `workspace_id`                                   | Unique `(provider_name, provider_invoice_id)` (`:133-155`).                                                      |
| `BillingSubscriptionChange` | `workspace_id`                                   | Plan-change audit (`:159-173`).                                                                                  |
| `UsagePeriod`               | `workspace_id`                                   | Unique `(workspace_id, period_start)` — the metering source of truth (`:177-195`).                               |
| `UsageReplaySession`        | `usage_period_id` → workspace; also `website_id` | No direct `workspace_id`; unique `(usage_period_id, session_id)` (`:199-211`).                                   |

### 2.2 Identity and auth

| Model                     | Tenant key        | Notes                                                                       |
| ------------------------- | ----------------- | --------------------------------------------------------------------------- |
| `User`                    | none (global)     | `username` unique, `google_id` unique, soft delete/suspension (`:251-286`). |
| `AuthSession`             | `user_id`         | SHA-512 `token_hash` unique; expiry/revocation/IP hash (`:288-304`).        |
| `EmailVerificationToken`  | `user_id`         | Hashed, single-use (`:306-319`).                                            |
| `PasswordResetToken`      | `user_id`         | Hashed, single-use (`:321-334`).                                            |
| `RateLimitBucket`         | none (global key) | Fixed-window counters (`:336-344`).                                         |
| `OssInstallationIdentity` | none (global)     | Legacy OSS installation id (`:12-18`).                                      |

### 2.3 Websites and analytics

| Model                      | Tenant key                        | Notes                                                                              |
| -------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| `Website`                  | `workspace_id` **nullable**       | `NULL` = pre-workspace legacy row; legacy `user_id`/`team_id` remain (`:392-445`). |
| `WebsiteImport`            | `website_id`                      | Unique `(website_id, source, file_checksum)` (`:448-477`).                         |
| `WebsiteHistoricalMetric`  | `website_id`                      | Imported aggregate metrics (`:479-505`).                                           |
| `WebsiteEvent`             | `website_id`                      | Main event table; no `workspace_id` (`:507-564`).                                  |
| `EventData`                | `website_id` + `website_event_id` | One row per flattened property (`:566-586`).                                       |
| `SessionData`              | `website_id` + `session_id`       | One row per session property; unique `(session_id, data_key)` (`:588-610`).        |
| `Session`                  | `website_id`                      | No `workspace_id`, no `last_seen`, no `ended_at` (`:346-390`).                     |
| `Visitor`                  | `website_id`                      | Unique `(website_id, token)`; first/last touch fields (`:881-923`).                |
| `VisitorIdentityLink`      | `website_id`                      | Connects visitor → customer identity (`:953-981`).                                 |
| `CustomerIdentity`         | `website_id`                      | Unique on external id / provider id / email hash per website (`:925-951`).         |
| `Revenue`                  | `website_id`                      | Event-level revenue (`:707-725`).                                                  |
| `Segment`                  | `website_id`                      | Saved segment/cohort (`:692-705`).                                                 |
| `Report`                   | `website_id` (+ `user_id`)        | Saved report; authorization derives from website, not user (`:671-690`).           |
| `WebsiteAttributionConfig` | `website_id` (unique)             | Currency, timezone, model default, toggles (`:842-863`).                           |
| `WebsiteDomain`            | `website_id`                      | Unique `(website_id, hostname)` (`:865-879`).                                      |
| `SessionReplay`            | `website_id`                      | Gzip `bytea` chunks; unique `(session_id, chunk_index)` (`:802-823`).              |
| `SessionReplaySaved`       | `website_id`                      | One saved replay per session (`session_id` unique) (`:825-840`).                   |

### 2.4 Payments and revenue attribution (analytics context B)

| Model                       | Tenant key                | Notes                                                                                                             |
| --------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `PaymentProviderConnection` | `website_id`              | Unique `(website_id, provider_name, provider_account_id)` (`:983-1009`).                                          |
| `ProviderEvent`             | `website_id`              | Unique `(website_id, provider_name, provider_event_key)`; raw payload retained (`:1083-1106`).                    |
| `Subscription`              | `website_id`              | Provider subscription state + MRR (`:1031-1081`).                                                                 |
| `Payment`                   | `website_id`              | Unique `(website_id, provider_name, transaction_id)`; visitor/session/identity links (`:1108-1165`).              |
| `PaymentMatch`              | `website_id`              | Unique `(payment_id, match_method)` (`:1254-1286`).                                                               |
| `PaymentAttribution`        | `website_id`              | Unique `(payment_id, attribution_model)`; two rows per payment (`:1288-1348`).                                    |
| `PaymentDetectionEvent`     | `website_id`              | Checkout return detection; unique `(website_id, provider_name, provider_checkout_id, visitor_id)` (`:1199-1230`). |
| `PaymentDispute`            | `website_id`              | Unique `(website_id, provider_name, provider_dispute_id)` (`:1167-1197`).                                         |
| `Refund`                    | `website_id`              | Unique `(website_id, provider_name, provider_refund_id)` (`:1232-1252`).                                          |
| `AttributionJob`            | `website_id`              | Queue/audit row; no deployed consumer (`:1350-1373`).                                                             |
| `ProviderWebhookCleanupJob` | `website_id` **nullable** | Remote endpoint cleanup retries (`:1011-1029`).                                                                   |

### 2.5 API, audit, and legacy

| Model                      | Tenant key                   | Notes                                                                                                                                    |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiKey`                   | `website_id` **nullable**    | Null keys are legacy user/team scoped and rejected by `authenticateApiKey` (`:1375-1395`, `src/features/websites/lib/api-key.ts:44-51`). |
| `AuditEvent`               | `website_id` **nullable**    | Also `user_id`/`team_id`; no workspace column (`:1397-1419`).                                                                            |
| `Team` / `TeamUser`        | legacy team id               | No workspace key; still referenced by `website.team_id` (`:612-647`).                                                                    |
| `WebsiteMember`            | legacy website id            | Read-only fallback for `workspace_id IS NULL` (`:649-669`, `src/permissions/website.ts:120-140`).                                        |
| `Link` / `Pixel` / `Board` | legacy `user_id`/`team_id`   | Create endpoints disabled; collection endpoints still live (`:727-786`).                                                                 |
| `Share`                    | polymorphic `entity_id` only | No workspace column and no expiry (`:788-800`).                                                                                          |

## 3. Indexes relevant to ingestion and query

Index counts per model (parsed from `@@index` blocks):

| Model                | Secondary indexes | Why it matters                                                          |
| -------------------- | ----------------: | ----------------------------------------------------------------------- |
| `PaymentAttribution` |                17 | Two rows per payment; 17 indexes make each attribution write expensive. |
| `WebsiteEvent`       |                14 | Every tracker event maintains 14 secondary indexes.                     |
| `Payment`            |                14 | Webhook-heavy table.                                                    |
| `Session`            |                13 | One row per session, plus dimension indexes.                            |
| `Subscription`       |                 9 |                                                                         |
| `Visitor`            |                 8 |                                                                         |
| `PaymentMatch`       |                 8 |                                                                         |

Key composite indexes:

- `website_event(website_id, created_at)` — dashboard scans (`schema.prisma:553`).
- Dimension variants `website_event(website_id, created_at, {url_path, referrer_domain,
  page_title, event_name, tag, hostname})` (`:554-562`).
- `website_event(website_id, session_id, created_at)` and `(website_id, visitor_id, created_at)`
  (`:560-561`).
- `session(website_id, created_at, {browser, os, device, screen, language, country, region, city})`
  (`:380-388`).
- `session_replay(session_id, chunk_index)` unique (`:820`).
- `visitor(website_id, token)` unique (`:913`).
- `payment_attribution(website_id, {calculated_at, attribution_model, first_touch_*, last_touch_*})`
  (`:1330-1342`).
- `provider_event(website_id, provider_name, provider_event_key)` unique
  (`:1101`); the earlier global unique was replaced in
  `20261113150000_provider_event_tenant_scope`.
- `usage_period(workspace_id, period_start)` unique (`:192`).

### 3.1 Missing or weak indexes

- `website(workspace_id, domain)` is not indexed and `domain` is not unique. Duplicate-domain
  prevention is an application read-then-write (`src/features/websites/server/websites/handler.ts:107-114`),
  so a race can create duplicates. Per-workspace row counts are small (≤20), so this is low risk.
- `billing_event(processing_status)` has no index; retry/debug scans are small but unindexed
  (`schema.prisma:126-127`).
- `session` has no `last_seen`/`ended_at`, so "open sessions" cannot be indexed or queried.
- `audit_event` has no `(workspace_id, created_at)` index because there is no workspace column;
  admin audit is scoped by `website_id`, `user_id`, or `team_id`.
- No partial indexes for `deleted_at IS NULL`, which almost every hot query filters on.

## 4. Migrations (17)

| Migration                                       | Purpose                                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_oss_baseline`                             | 38 inherited tables, 1360 lines, 203 indexes.                                                                                                       |
| `20260911173000_backfill_visitor_first_session` | Backfill visitor first/last session pointers.                                                                                                       |
| `20260924181000_oss_installation_identity`      | OSS installation singleton.                                                                                                                         |
| `20261104180000_workspaces`                     | Workspace/membership/invitation tables; `website.workspace_id`; backfill one personal workspace per user and attach user-owned websites (`:1-131`). |
| `20261104185008_auth_sessions`                  | `auth_session`, email verification, password reset, rate-limit bucket.                                                                              |
| `20261104190000_remove_default_admin`           | Removes the inherited default admin.                                                                                                                |
| `20261105120000_usage_metering`                 | `usage_period`, `usage_replay_session`.                                                                                                             |
| `20261105150000_platform_billing`               | Billing customer/subscription/event/invoice/change tables.                                                                                          |
| `20261106120000_abuse_suspension`               | User/workspace suspension columns.                                                                                                                  |
| `20261106130000_setup_allowance`                | Onboarding setup counters.                                                                                                                          |
| `20261109120000_google_oauth`                   | `user.google_id`.                                                                                                                                   |
| `20261109130000_workspace_logo`                 | `workspace.logo_url`.                                                                                                                               |
| `20261109140000_workspace_onboarding_completed` | `onboarding_completed_at`.                                                                                                                          |
| `20261112120000_platform_billing_traffic_tier`  | `platform_subscription.traffic_tier_index`.                                                                                                         |
| `20261113150000_provider_event_tenant_scope`    | Replaces the global provider-event unique with `(website_id, provider_name, provider_event_key)`.                                                   |
| `20261113151000_session_replay_chunk_unique`    | Unique `(session_id, chunk_index)` for replay idempotency.                                                                                          |
| `20261113152000_api_key_creator_backfill`       | Backfills `api_key.user_id` from `website.created_by` so keys can re-check membership.                                                              |

Notes:

- There are **no down migrations**; every change is forward-only.
- `prisma/schema.prisma` is generated/maintained with `prisma db pull` available as
  `pnpm build-db-schema` (`package.json:32`). That creates a drift risk if a developer pulls a
  database that is ahead of, or behind, the committed migrations.
- Sixteen of the 17 migrations post-date the SaaS conversion; the analytics schema itself is the
  inherited OSS baseline.

## 5. Legacy schema that was never removed

No migration drops a table (`DROP TABLE` count = 0). Still present:

| Legacy object                        | Current use                                                    | Evidence                                                            |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `team`, `team_user`                  | Read fallback for websites with `NULL workspace_id`; no UI.    | `prisma/schema.prisma:612-647`, `src/permissions/website.ts:80-116` |
| `website_member`                     | Read fallback membership.                                      | `:649-669`, `:120-140`                                              |
| `link`, `pixel`                      | Create disabled; GET lists; collection endpoints still ingest. | `src/features/legacy/server/links/handler.ts:19-23`                 |
| `board`                              | No UI; create disabled.                                        | `src/app/api/boards/route.ts`                                       |
| `share`                              | **Active** public share feature.                               | `src/features/websites/server/[websiteId]/shares/handler.ts`        |
| `report.user_id`                     | Set on creation but not used for authorization.                | `src/features/analytics/lib/report-permissions.ts:8-24`             |
| `website.user_id`, `website.team_id` | Legacy ownership fallback.                                     | `src/permissions/website.ts:103-116`                                |
| `api_key.team_id`, `api_key.user_id` | Legacy key scopes; website keys are the supported path.        | `src/features/websites/lib/api-key.ts:20-84`                        |
| `OssInstallationIdentity`            | OSS update identity.                                           | `schema.prisma:12-18`                                               |

`scripts/legacy-table-drop.ts` is a rehearsal tool with preconditions, not a migration. It does not
run automatically.

## 6. Integrity, cascades, and retention

- **No database FK constraints.** `onDelete: Cascade` / `Restrict` in `schema.prisma` are emulated
  by the Prisma client only. Raw SQL deletes bypass them. Examples that matter:
  - `SessionReplay` and `SessionReplaySaved` declare `onDelete: Cascade` on `session`
    (`schema.prisma:814,834`).
  - `Visitor` first/last session pointers use `onDelete: Restrict` (`:902-903`).
  - `EventData` / `SessionData` have no cascade; retention deletes them explicitly before sessions
    (`src/features/system/cron/jobs/analytics-retention.ts:93-163`).
- The retention job is the only bulk purge. It deletes events, event data, session data, replays,
  revenue, then sessions for a website, detaching payment/attribution links first
  (`analytics-retention.ts:82-169`). It runs daily at 03:30 UTC in production
  (`src/features/system/cron/index.ts:33-37`).
- Deleted websites/workspaces are purged immediately by the same job (`:237-247`).
- `BillingEvent.payload` and `ProviderEvent.rawPayload` have **no retention policy**. They hold full
  provider webhook bodies, which can include customer names, emails, amounts, and addresses.
  No cron job deletes them (`rg -n "billingEvent|providerEvent" src/features/system/cron` → no
  matches).

## 7. Scale and storage risks

1. **Write amplification on the hot path.** One event insert touches 14 secondary indexes
   (`WebsiteEvent`). A custom event with properties adds one `event_data` row per flattened key.
   There is no partitioning and no batch insert in the default Postgres path
   (`src/features/analytics/server/queries/sql/events/saveEvent.ts:125-190`).
2. **Pool size.** Each app process opens at most 10 Postgres connections
   (`src/lib/prisma.ts:401-405`). The collector does a website cache lookup, entitlement reads,
   usage reservation, session/visitor writes, and the event write per request.
3. **Visitor-row cardinality.** The cookieless identity rotates on a monthly salt by default
   (`src/features/analytics/server/send/handler.ts:316-322`, `src/lib/crypto.ts:106-112`), so a
   returning visitor creates a new `visitor` row at each rotation boundary. This multiplies
   `visitor` rows and makes visitor uniqueness window-scoped.
4. **Replay storage.** `SessionReplay.events` is compressed `bytea` in Postgres
   (`schema.prisma:802-823`). Limits are 10 MB per chunk, 500 chunks per session
   (`saveRecording.ts:3-4,64-79`). The Pro replay switch now makes this reachable; a single
   session can theoretically store gigabytes.
5. **Retention arithmetic.** Starter retains 90 days, Pro 365 days
   (`src/lib/plans.ts:152,170`). At 1M events/month a Pro workspace reaches 12M event rows plus
   index entries per year, with no partition drop; the nightly delete is the only reclamation.
6. **Attribution duplication.** Every payment writes two `PaymentAttribution` rows (first + last
   touch) into a table with 17 indexes (`payment.ts:965-988`).

## 8. UNVERIFIED

- Applied migration history in any real database (`_prisma_migrations`), table sizes, index bloat,
  dead tuples, and connection counts: **UNVERIFIED** (no DB access).
- Whether production runs the Postgres-only or ClickHouse/Kafka stack: **UNVERIFIED**; the code
  supports both (`src/lib/db.ts:19-31`), and the deploy compose runs the full stack.
- Whether the `website.workspace_id` backfill has any remaining `NULL` rows: **UNVERIFIED**.
