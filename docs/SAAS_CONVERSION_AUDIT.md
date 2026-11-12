# SaaS Conversion Audit — Talivia → Tartly

- **Date:** 2026-11-04
- **Source:** `https://github.com/talivia-group/talivia` @ `9b7ad2a`
  (`fix(app): improve mobile dashboard layout`)
- **Local path:** `/home/ariyaman/Dev/fight/efforts/revenuelens`
- **Scope:** read-only audit. No application code was changed for this phase.

> Verified against the actual source. The README claims are only repeated here
> where the code confirms them.
>
> **Architecture update 2026-11-12:** production is now self-hosted on one VPS
> (PostgreSQL, Redis, ClickHouse, and Kafka in Docker). The Neon cost and
> architecture recommendations below are historical; see
> `deploy/production/docker-compose.yml` and `docs/BACKUP_AND_RECOVERY.md`.

---

## 1. Runtime and installed versions

| Component           | Version                                    | Evidence                                         |
| ------------------- | ------------------------------------------ | ------------------------------------------------ |
| Node.js             | 24.13.0                                    | `node -v`                                        |
| pnpm                | 10.10.0                                    | `pnpm -v`; `packageManager` in `package.json`    |
| Next.js             | 16.2.6                                     | `package.json`; `node_modules/next/package.json` |
| React / React DOM   | 19.2.5                                     | `package.json`                                   |
| Prisma Client / CLI | 7.6.0                                      | `package.json`, `@prisma/client`, `prisma`       |
| TypeScript          | 5.9.3                                      | `node_modules/typescript/package.json`           |
| PostgreSQL          | 17 (local Docker baseline)                 | `docker-compose.yml` uses `postgres:17-alpine`   |
| ClickHouse client   | `@clickhouse/client` ^1.18.2, **optional** | `package.json`, `src/lib/clickhouse.ts`          |
| Kafka client        | `kafkajs` ^2.1.0, **optional**             | `src/lib/kafka.ts`                               |
| Redis client        | `redis` ^4.5.1, **optional**               | `src/lib/redis.ts`                               |
| Bcrypt              | `bcryptjs` ^3.0.2, cost 10                 | `src/lib/password.ts`                            |
| Dodo SDK            | `dodopayments` ^2.42.2                     | `package.json`                                   |
| Stripe SDK          | `stripe` ^22.3.0                           | `package.json`                                   |
| Session replay      | `rrweb` + `rrweb-player` alpha             | `package.json`, `src/recorder/`                  |

The app is a Next.js App Router application (`src/app/`), built with webpack
(`next build --webpack` in `package.json`) and emitted as a standalone server
(`output: 'standalone'` in `next.config.ts`).

---

## 2. Architecture

Modular monolith:

```
Browser
  ├─ /script.js          tracker (src/tracker/index.js -> public/script.js)
  └─ /recorder.js        rrweb recorder (src/recorder/index.js)
        │
        ├─ POST /api/send     events, identify, performance, linker
        └─ POST /api/record   replay chunks (gzip)
                │
                ▼
        src/queries/sql/*.ts
                │
        src/lib/db.ts runQuery()
          ├─ Prisma (PostgreSQL)  default
          └─ ClickHouse (+ Kafka) if CLICKHOUSE_URL is set
                │
                ▼
        PostgreSQL tables: session, website_event, event_data,
        session_data, visitor, revenue, session_replay, ...
        or ClickHouse: talivia.website_event, talivia.session_replay
                │
                ▼
        /api/reports/*, /api/websites/[id]/*
                │
                ▼
        React dashboard (src/app/(main)/websites/[websiteId])
```

- **Tracker:** `src/tracker/index.js` (built to `public/script.js` by
  `rollup.tracker.config.js`). The collection endpoint is replaced at build
  time: `__COLLECT_API_ENDPOINT__` → `/api/send`.
- **Ingestion:** `src/app/api/send/route.ts`. Bot filtering via `isbot`,
  blocked-IP check, visitor/session identity, UTM/click-ID parsing, then
  `saveEvent` (`src/queries/sql/events/saveEvent.ts`).
- **Replay ingestion:** `src/app/api/record/route.ts` → `saveRecording`
  (`src/queries/sql/replays/saveRecording.ts`). Payload is gzipped and written
  to `session_replay.events` (`Bytes`) when ClickHouse is disabled.
- **Read path:** `src/queries/sql/*` uses `runQuery()` to select Prisma raw SQL
  or ClickHouse SQL. Dashboard routes sit under `src/app/api/reports/` and
  `src/app/api/websites/[websiteId]/`.
- **Cron:** `src/lib/cron/index.ts`; only `provider-webhook-cleanup`
  (`src/lib/cron/jobs/provider-webhook-cleanup.ts`). Runs only in production.
- **Uploads/object storage:** `src/lib/storage.ts` supports S3-compatible
  object storage (used for provider raw payloads and imports; inspect before
  production).
- **Auth:** JWT signed and AES-GCM-encrypted (`src/lib/jwt.ts`,
  `src/lib/crypto.ts`), returned by `/api/auth/login`, stored in browser
  `localStorage` under `talivia.auth` (`src/lib/storage.ts`,
  `src/lib/client.ts`), sent as `Authorization: Bearer …`
  (`src/components/hooks/useApi.ts`).

---

## 3. Where events and replays are actually stored

**Default (and the configuration this fork ships): PostgreSQL via Prisma.**

- Events: `session`, `website_event`, `event_data`, `session_data`,
  `visitor`, `visitor_identity_link`, `revenue` (`prisma/schema.prisma`).
- Replays: `session_replay` (gzipped `Bytes`), `session_replay_saved`.
- ClickHouse is **optional** and is not provisioned by `docker-compose.yml`
  (only `app` and `postgres`). The ClickHouse schema exists in
  `db/clickhouse/schema.sql` plus migrations, and `src/lib/db.ts` switches to
  ClickHouse when `CLICKHOUSE_URL` is set. Even then, `saveEvent` mirrors the
  event into PostgreSQL so revenue attribution and the revenue journey
  debugger keep working (`src/queries/sql/events/saveEvent.ts`).
- With ClickHouse enabled, replays go to ClickHouse (or Kafka topic
  `session_replay`) instead of PostgreSQL.

**Commercial consequence:** with no ClickHouse, event volume and replay bytes
share the same database as billing/tenant data. The Neon plan must therefore
not be the event store at scale. Phase 1 documents the split; Phase 3/7 must
add a retention policy and an event-store abstraction before high volume.

---

## 4. Database schema and tenant ownership

`prisma/schema.prisma` has 39 models. There is **no workspace model**. Tenancy
is currently expressed through `website.user_id` (a user owns websites
directly) and `website.team_id` (team-owned websites). Collaborators are
`website_member` rows or `team_user` rows.

### Tenant-owned models lacking a workspace link

All tenant data below is reachable through `website_id` (or through
`session_id` → `website_id`, or `team_id`/`user_id`) but **none has a
`workspace_id`**. Phase 2 must add one ownership path and Phase 3 must prove
every path is scoped.

| Model / table               | Current tenancy link                          | Workspace link          |
| --------------------------- | --------------------------------------------- | ----------------------- |
| `Website` / `website`       | `user_id`, `team_id`                          | **missing**             |
| `WebsiteImport`             | `website_id`                                  | missing                 |
| `WebsiteHistoricalMetric`   | `website_id`                                  | missing                 |
| `WebsiteEvent`              | `website_id` (+ `session_id`)                 | missing                 |
| `EventData`                 | `website_id`, `website_event_id`              | missing                 |
| `Session`                   | `website_id`                                  | missing                 |
| `SessionData`               | `website_id`, `session_id`                    | missing                 |
| `Visitor`                   | `website_id`                                  | missing                 |
| `CustomerIdentity`          | `website_id`                                  | missing                 |
| `VisitorIdentityLink`       | `website_id`                                  | missing                 |
| `Revenue`                   | `website_id`, `session_id`                    | missing                 |
| `Segment`                   | `website_id`                                  | missing                 |
| `Report`                    | `website_id`, `user_id`                       | missing                 |
| `SessionReplay`             | `website_id`, `session_id`                    | missing                 |
| `SessionReplaySaved`        | `website_id`, `session_id`                    | missing                 |
| `WebsiteAttributionConfig`  | `website_id`                                  | missing                 |
| `WebsiteDomain`             | `website_id`                                  | missing                 |
| `PaymentProviderConnection` | `website_id`                                  | missing                 |
| `ProviderWebhookCleanupJob` | optional `website_id`                         | missing                 |
| `ProviderEvent`             | `website_id`                                  | missing                 |
| `Subscription`              | `website_id`                                  | missing                 |
| `Payment`                   | `website_id`                                  | missing                 |
| `PaymentDispute`            | `website_id`                                  | missing                 |
| `PaymentDetectionEvent`     | `website_id`                                  | missing                 |
| `Refund`                    | `website_id`                                  | missing                 |
| `PaymentMatch`              | `website_id`                                  | missing                 |
| `PaymentAttribution`        | `website_id`                                  | missing                 |
| `AttributionJob`            | `website_id`                                  | missing                 |
| `ApiKey`                    | `website_id` or `team_id` or `user_id`        | missing                 |
| `AuditEvent`                | `website_id` or `team_id` or `user_id`        | missing                 |
| `Share`                     | `entity_id` only; entity type gives the owner | missing                 |
| `Board`                     | `user_id`, `team_id`                          | missing                 |
| `Link`                      | `user_id`, `team_id`                          | missing                 |
| `Pixel`                     | `user_id`, `team_id`                          | missing                 |
| `WebsiteMember`             | `website_id`, `user_id`                       | missing                 |
| `TeamUser`                  | `team_id`, `user_id`                          | missing                 |
| `Team`                      | standalone team                               | missing                 |
| `User`                      | global identity                               | n/a (needs memberships) |
| `OssInstallationIdentity`   | installation-level                            | n/a                     |

### Schema-level warning

`prisma/schema.prisma` uses `relationMode = "prisma"`. That means PostgreSQL
foreign keys are **not** enforced by the database; Prisma emulates relations in
the client. Cross-tenant references and orphan rows therefore cannot be caught
by the database today. This is a major isolation risk. Options:

1. switch the schema to native foreign keys (requires a migration and checking
   every relation), or
2. add explicit composite constraints/triggers for the tenant keys we depend
   on.

This must be decided in Phase 2/3 and documented.

---

## 5. Authentication and authorization model

- **Identity:** `User` (global username, bcrypt password, single `role`).
- **Roles today:** `admin`, `user`, `view-only`, plus team roles
  (`team-owner`, `team-manager`, `team-member`, `team-view-only`) in
  `src/lib/constants.ts` (`ROLES`, `ROLE_PERMISSIONS`).
- **Admin bypass:** `user.isAdmin` is set from `role === 'admin'`; many
  permission functions return full access for admins
  (`src/permissions/website.ts`).
- **Session transport:** the token is **not an HttpOnly cookie**. It is written
  to `localStorage` (`setClientAuthToken` in `src/lib/client.ts`) and sent by
  the client (`src/components/hooks/useApi.ts`). Any XSS can exfiltrate it.
- **Logout:** deletes the Redis-backed auth key only when Redis is enabled
  (`src/app/api/auth/logout/route.ts`); the stateless JWT remains valid until
  expiry otherwise.
- **Bootstrap account:** `prisma/migrations/0001_oss_baseline/migration.sql`
  inserts `admin` with a bcrypt hash of `admin` and role `admin`.
- **Authorization:** 73 of 102 API route files call a website permission helper
  (`canViewWebsite` 61, `getWebsiteAccess` 4, etc.). The remaining files are
  heartbeat, provider webhooks, and public share routes. Webhooks authenticate
  by provider signature, not by user, and are scoped by `websiteId` in the URL.
- **Centralization:** authorization is _not_ centralized in one SaaS-style
  module. It is split across `src/permissions/{website,user,team?,...}.ts` and
  called ad hoc. Some reads use `getWebsite()` and then query child tables by
  `websiteId`; that is acceptable only after a workspace-scoped check.

---

## 6. Analytics capabilities (verified in code)

Present and working in this fork:

- Visits, visitors, pageviews, sessions, bounce rate, duration
  (`src/queries/sql/getWebsiteStats.ts`, `src/queries/sql/pageviews/*`).
- Breakdowns: browser, OS, device, screen, language, country, region, city,
  referrer, landing/exit path, UTM, events, tags
  (`src/queries/sql/reports/getBreakdown.ts`, `getUTM.ts`).
- Real-time dashboard (`src/queries/sql/getRealtimeData.ts`,
  `/api/realtime/[websiteId]`, `REALTIME_INTERVAL = 10000`).
- Funnels, retention, journeys (`getFunnel.ts`, `getRetention.ts`,
  `getJourney.ts`).
- Revenue + attribution: first-touch and last-touch, identity matching,
  subscriptions, renewals, refunds, disputes
  (`src/queries/prisma/attribution.ts`, `revenueAttribution.ts`,
  `payment.ts`, schema models above).
- Session replay via rrweb, gated per website by `Website.replayEnabled`
  (`src/app/api/record/route.ts`).
- Importers: Plausible, Umami, Talivia, backup/export
  (`src/lib/analytics-imports/`, `src/app/api/websites/[websiteId]/imports/`).
- Share links for public dashboards (`Share` model, `/share/[slug]`,
  `/api/share/[slug]`).
- API keys (`ApiKey`) for programmatic access.

Not present in the OSS fork (Cloud-only per README, not verified beyond README):

- Google Search Console, Bing Webmaster Tools, GitHub activity, social
  mentions. Do not advertise these.

---

## 7. Payment integrations (analytics context)

Verified provider routes:

| Provider      | Route                                                            | Signature verification                                          |
| ------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Stripe        | `src/app/api/payments/stripe/[websiteId]/webhook/route.ts`       | yes (`src/lib/stripe-webhook.ts`)                               |
| Dodo          | `src/app/api/payments/dodo/[websiteId]/webhook/route.ts`         | yes (`DodoPayments.webhooks.unwrap`, `src/lib/dodo-webhook.ts`) |
| Lemon Squeezy | `src/app/api/payments/lemonsqueezy/[websiteId]/webhook/route.ts` | yes (`src/lib/lemonsqueezy-webhook.ts`)                         |
| Polar         | `src/app/api/payments/polar/[websiteId]/webhook/route.ts`        | yes (`src/lib/polar-webhook.ts`)                                |
| Yolfi         | `src/app/api/payments/yolfi/[websiteId]/webhook/route.ts`        | yes (`src/lib/yolfi-webhook.ts`)                                |
| Manual        | `src/app/api/payments/manual/route.ts`                           | authenticated API                                               |

- Credentials and webhook secrets are stored encrypted with
  `APP_SECRET` (`src/lib/provider-secrets.ts`, `enc:` prefix).
- Events are deduplicated through `ProviderEvent` unique
  `(provider_name, provider_event_key)`.
- The Dodo code here is **analytics only**. It must not be reused for platform
  billing. Platform billing gets its own `BillingProvider` and models in
  Phase 5.
- Provider webhook URLs include the `websiteId`; they are not workspace-aware.

---

## 8. Features to keep / modify / adequate / missing

### Keep unchanged (verified working)

- Tracker format and `/api/send` API (`src/tracker/index.js`,
  `src/app/api/send/route.ts`).
- Recorder and `/api/record` (`src/recorder/index.js`).
- Attribution engine and revenue models (`src/queries/prisma/attribution*.ts`,
  `payment*.ts`).
- Provider webhook verification and normalization.
- Dashboard query layer and chart components.
- Import/export and share links (with isolation fixes).

### Modify for SaaS

- Add `Workspace`, `WorkspaceMembership`, `WorkspaceInvitation`.
- Add `Website.workspaceId` and all tenant-scoped checks.
- Replace localStorage JWT with HttpOnly session cookies and proper expiry /
  revocation.
- Remove bootstrap admin and add registration/login/reset/verification.
- Add platform billing models and routes (Dodo, separate from analytics Dodo).
- Add usage metering and plan entitlements around ingestion.
- Add tenant-aware caching keys and retention jobs.
- Remove the global `admin` bypass from customer paths (keep a separate
  platform-admin role).
- Rebrand all customer-facing surfaces.

### Already adequate

- Prisma singleton with `globalThis` cache (`src/lib/prisma.ts`).
- `@prisma/adapter-pg` is already in use (no Neon adapter needed initially).
- Migration tooling (`prisma migrate deploy`) and env checker.
- Provider secret encryption.
- Bot/IP filtering on ingestion.
- Structured `debug` namespaces (partially; no request IDs or JSON logs).

### Missing SaaS functionality

- Workspaces, memberships, invitations, workspace switching.
- Self-serve signup and email lifecycle.
- Platform subscription billing, invoices, portal.
- Plan entitlements and usage limits.
- Tenant-aware rate limiting (no rate limits implemented today; only a Redis
  helper in `src/lib/redis.ts`).
- Data deletion / GDPR export.
- Audit UI and platform-admin console.
- Health endpoint with DB check (current `/api/heartbeat` returns a static ok).
- Error tracking, structured request logs.
- CI workflow (`.github/` exists but inspect; no isolation suite).
- Tenant isolation tests.

---

## 9. Technical risks

| Risk                                                     | Where                                                              | Severity         | Notes                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------- |
| Cross-tenant access via website IDs                      | `src/permissions/website.ts`, all `/api/websites/[websiteId]/*`    | Critical         | Authorization is per-route; no workspace invariant. ID swapping must be tested.    |
| `relationMode = "prisma"`                                | `prisma/schema.prisma`                                             | Critical         | No DB foreign keys; orphan/cross-tenant references possible.                       |
| Default `admin`/`admin`                                  | `0001_oss_baseline/migration.sql`                                  | Critical         | Public bootstrap credentials ship in the schema.                                   |
| Token in `localStorage`                                  | `src/lib/client.ts`, `src/hooks/useApi.ts`                         | High             | XSS token theft; no HttpOnly/Secure/SameSite cookie.                               |
| No session revocation without Redis                      | `src/lib/auth.ts`                                                  | High             | Logout does not invalidate stateless JWT.                                          |
| No rate limiting                                         | `src/app/api/auth/*`                                               | High             | Brute force / signup abuse.                                                        |
| Public share tokens never expire                         | `Share` model                                                      | Medium           | Anyone with a slug gets a signed token; no expiry/revocation UI.                   |
| CSP allows `unsafe-inline`/`unsafe-eval`                 | `next.config.ts`                                                   | Medium           | Weak XSS mitigation.                                                               |
| Replay payloads in the same DB as tenant data            | `session_replay`                                                   | High             | Cost + blast radius; no retention job today.                                       |
| Event tables grow unbounded                              | `website_event`, `session`                                         | High             | No retention cron; only provider webhook cleanup runs.                             |
| Cache keys lack workspace                                | `src/lib/load.ts` (`website:${websiteId}`, `session:${websiteId}`) | Medium           | IDs are globally unique, but adding workspace makes contamination checks explicit. |
| `ua-parser-js` is AGPL-3.0-or-later                      | `src/lib/detect.ts`                                                | High (licensing) | Hosted SaaS may trigger network-copyleft obligations. See license audit.           |
| AGPL/MPL/LGPL transitive dependencies                    | dependency tree                                                    | Medium           | See `docs/LICENSE_AND_BRAND_AUDIT.md`.                                             |
| `prisma migrate deploy` runs automatically in `check-db` | `scripts/check-db.js`                                              | Medium           | Production/preview must point at the right branch.                                 |

---

## 10. Performance bottlenecks

1. **Events in PostgreSQL.** Dashboard queries join `website_event` and
   `session` with many indexes; at millions of rows this competes with tenant
   and billing traffic. ClickHouse is optional but adds Kafka/ops cost.
2. **Replay bytes in PostgreSQL.** `session_replay.events` is `Bytes`; large
   rrweb chunks bloat the primary database and backups.
3. **Raw SQL with many date filters.** `src/lib/prisma.ts` builds SQL
   dynamically (`getFilterQuery`, `getCohortQuery`, etc.). Queries are indexed
   but untested at scale.
4. **Real-time polling every 10 s** per open dashboard
   (`REALTIME_INTERVAL`); many concurrent users multiply queries.
5. **No response caching layer for reports.** Redis caching exists only for
   `getWebsite`/`getSession` (`src/lib/load.ts`).
6. **Cron runs in-process** (`src/lib/cron/index.ts`); with multiple instances
   every instance may run the same job (Croner `protect` is per-process only).
7. **No pagination guards on some endpoints**; check `pageSize` handling before
   launch.

---

## 11. Potential security issues (beyond tenancy)

- Default admin credentials in the migration (critical).
- JWT in localStorage, no HttpOnly cookie (high).
- No CSRF tokens; bearer auth is not CSRF-prone by itself, but moving to cookies
  requires CSRF protection.
- Share links are permanent and unauthenticated by design; no expiry.
- Provider webhook endpoints are public by necessity; signature checks exist,
  but ensure raw body handling stays correct behind proxies.
- CSP is weak (`unsafe-inline`, `unsafe-eval`).
- CORS is `*` on all `/api/*`; any site can call the API, though auth still
  applies. Restrict to app origin where possible.
- No rate limits on auth, ingestion, or exports.
- `APP_SECRET` doubles as the encryption key for provider credentials; rotation
  is manual and has no key-version envelope.
- Error responses may include provider errors; check redaction
  (`src/lib/redact.ts` exists).

---

## 12. Baseline build and test results (2026-11-04)

Environment: Node 24.13.0, pnpm 10.10.0, PostgreSQL 17 (`postgres:17-alpine`
container), empty database.

| Check                  | Command                           | Result                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install                | `pnpm install --frozen-lockfile`  | **exit 1** — `sharp@0.34.5` postinstall tried a source build and failed (`node-gyp` missing). All packages were linked; `require('sharp')` works and `pnpm install --ignore-scripts` completes in 6.5 s.                |
| Prisma generate        | `pnpm exec prisma generate`       | pass                                                                                                                                                                                                                    |
| Migrations on empty DB | `pnpm exec prisma migrate deploy` | pass — 3 migrations applied (`0001_oss_baseline`, `20260911173000_backfill_visitor_first_session`, `20260924181000_oss_installation_identity`)                                                                          |
| Build                  | `pnpm build`                      | **pass** (exit 0) — tracker + recorder + Next production build + postbuild                                                                                                                                              |
| Lint                   | `pnpm lint` (Biome)               | **pass** — 918 files checked                                                                                                                                                                                            |
| Typecheck              | `pnpm exec tsc --noEmit`          | **pass**                                                                                                                                                                                                                |
| Tests                  | `pnpm test` (Vitest)              | **3 failed / 479 passed** (120 files; 117 passed). Pre-existing failures: `src/lib/date.test.ts` bucket count (expected 24, got 25); `WebsiteRevenueSettings.test.tsx` and `WebsiteSettings.test.tsx` timed out at 5 s. |

The three test failures are recorded as pre-existing. Do not "fix" them by
loosening assertions without understanding the cause; address them in Phase 11
unless they block a phase.

---

## 13. Hosting recommendation (sources fetched 2026-11-04)

### App (Next.js standalone)

| Option            | Monthly cost                                                                                         | Notes                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel Pro**    | **$20/mo** including $20 of included usage credit; extra usage billed                                | Best fit for Next.js 16; Fluid Compute; global CDN. Source: <https://vercel.com/pricing> (fetched 2026-11-04).                                     |
| **Railway Hobby** | **$5/mo** including $5 usage credit; Pro **$20/mo** including $20 credit; usage beyond credit billed | Simpler container hosting, persistent worker for cron, no Next-specific optimizations. Source: <https://railway.com/pricing> (fetched 2026-11-04). |
| Self-hosted VPS   | VPS price + ops time (not priced here)                                                               | Avoid until volume justifies it; the in-process cron and standalone build make it feasible later.                                                  |

**Recommendation:** Vercel Pro for the app at launch. Use Railway if we need a
long-running worker/cron process or want to keep the app next to the database.
Budget **$20/mo** at launch, plus overage.

### Relational data (Neon PostgreSQL)

Neon paid plans are usage-based. The published rate at fetch time:
**$0.106/CU-hour**, storage **$0.35/GB-month**, with no monthly minimum
(Launch). Neon's own page estimates **about $15/month on Launch for a small
database**. Free plan exists but is not acceptable for a paid SaaS with
customer billing data. Source: <https://neon.com/pricing> (fetched
2026-11-04).

**Recommendation:** Neon Launch, budget **$15–40/mo** at launch depending on
compute hours. Use the pooled host for runtime and the direct host for
migrations (Phase 1).

### Event store

At launch, keep events in a **separate PostgreSQL database** (Neon or another
managed Postgres) before considering ClickHouse. The current code supports
ClickHouse only as an optional path; switching requires Kafka or direct insert
operations and new migrations.

| Option                                     | Monthly cost                                                                          | Notes                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate Neon/Postgres database for events | ~$15–40/mo at small volume (same Neon rates)                                          | Minimal change: point the event queries at a second database. Needs a real event-store abstraction; today one `DATABASE_URL` serves everything. |
| ClickHouse Cloud Basic                     | **$0.2181/unit-hour** compute; **$25.30/TB-month** storage; $300/30-day trial credits | Only worth it after event volume makes Postgres queries slow. Source: <https://clickhouse.com/pricing> (fetched 2026-11-04).                    |

**Recommendation:** ship on PostgreSQL; add a dedicated event database before
the first 1,000 paying customers or when p95 dashboard latency exceeds the
target. Do not provision ClickHouse at launch.

### Rough launch budget

| Item                          | Monthly                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| Vercel Pro                    | $20                                                        |
| Neon (Launch)                 | $15–40                                                     |
| Email (Resend or similar)     | $0–20 (free tier likely enough at launch)                  |
| Domain                        | ~$1–2 amortized                                            |
| Dodo Payments                 | percentage per transaction (verify current fee in Phase 5) |
| **Total before payment fees** | **~$36–82/mo**                                             |

At 100 Starter customers ($799 MRR) this is a healthy gross margin before
event-store growth; at 500 customers the event store becomes the main variable.

---

## 14. Recommended implementation order

1. **Phase 1:** Neon/Prisma/env split + health check. Keep the build green.
2. **Phase 2:** Workspace ownership + central authorization + registration
   transaction. Do not build billing before the tenant invariant exists.
3. **Phase 3:** Isolation suite + DB constraints + CI. This is the gate for
   every later feature.
4. **Phase 4:** Replace localStorage JWT with HttpOnly sessions; remove
   bootstrap admin; add signup/reset/verification and rate limits.
5. **Phase 5:** Platform billing behind `BillingProvider`; never reuse the
   analytics Dodo integration.
6. **Phase 6:** Plan config + metering + usage UI (two plans only).
7. **Phase 7:** Validate analytics/attribution per tenant; gate replay; add
   retention jobs.
8. **Phase 8:** Onboarding + install verification + agent docs.
9. **Phase 9:** Rebrand + Tartly-derived UI/onboarding.
10. **Phase 10:** Compliance/abuse/email/ops.
11. **Phase 11:** Hardening, load test, deployment, launch checklist.
12. **Phase 12:** GTM.

---

## 15. Open questions / UNVERIFIED

- **UNVERIFIED:** exact Neon and Dodo billing behavior at our projected volume.
  The numbers above are published list prices fetched on 2026-11-04, not quotes.
- **UNVERIFIED:** whether `ua-parser-js` v2 AGPL obligations can be satisfied
  by the hosted-service boundary without releasing source. Treat as a legal
  question; replace or buy a commercial license before launch.
- **UNVERIFIED:** Talivia Cloud's current feature set and price — the marketing
  site was not audited in this phase. Phase 6 must fetch it.
- **UNVERIFIED:** whether the existing `prisma` relation mode can be switched
  to native FKs without breaking the import/share code. Phase 2 spike required.
- **UNVERIFIED:** actual event volume per customer; the pricing model in Phase 6
  must state its assumptions.
