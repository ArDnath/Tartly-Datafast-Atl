# Existing architecture — source-verified audit

- **Audited revision:** `7e32b59` on `autonomous/saas-buildout` (`git log -1 --format='%h %s'`).
- **Method:** read-only inspection (`rg`, `sed`, `git show`, `git diff`). No tests, build, dev
  server, migrations, or database commands were run (7 GB RAM constraint).
- **Consequence:** every statement below is source-verified, not runtime-verified. Items that
  require an execution or live credentials are marked **UNVERIFIED**.
- **Tracker note:** the identity model changed in `caa8399` ("cookieless tracker with rotating
  salted visitor identity"). Section 5.1 describes the current code, not the retired cookie model.
- **Concurrency:** the repository is being changed by other agents. Line numbers were verified at `7e32b59`; re-run the cited `rg`/`sed` before acting.

## 1. Runtime topology

| Layer                  | Implementation                                                                               | Evidence                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| HTTP app               | Next.js `16.4.5` App Router, React `19.2.5`, standalone output                               | `package.json:158`, `next.config.ts:131`                                                  |
| Relational store       | PostgreSQL via Prisma `7.6.0` + `@prisma/adapter-pg`                                         | `package.json:123,164`, `src/lib/prisma.ts:389-407`                                       |
| Cache                  | Redis is optional; enabled only when `REDIS_URL` is set                                      | `src/lib/redis.ts:105-107`, `src/lib/load.ts:6-24`                                        |
| Event store (optional) | ClickHouse, selected whenever `CLICKHOUSE_URL` is set                                        | `src/lib/db.ts:19-31`, `src/lib/clickhouse.ts:20`                                         |
| Stream (optional)      | Kafka producer; falls back to a direct ClickHouse insert                                     | `src/lib/kafka.ts`, `src/features/analytics/server/queries/sql/events/saveEvent.ts:72-80` |
| Background             | In-process `croner` jobs (production only) plus a separate Kafka→ClickHouse worker container | `src/features/system/cron/index.ts:24-46`, `deploy/production/docker-compose.yml:209-212` |
| Edge                   | Caddy terminates TLS and strips caller-supplied forwarding headers                           | `deploy/production/Caddyfile:13-30`                                                       |
| Local OSS stack        | `docker-compose.yml` starts only `app` + `postgres`                                          | `docker-compose.yml:2-27`                                                                 |

Two deployment stories coexist: the repository-root compose file is Postgres-only, while
`deploy/production/docker-compose.yml` runs Postgres, Redis, ClickHouse, Kafka, a streaming worker,
and Caddy. `docs/PHASES.md:29-31` describes the latter; `AGENTS.md:55-57` says the fork has no
ClickHouse deployment. Treat the production compose file and `src/lib/db.ts` as the code truth.

## 2. Code layout and size

| Metric          | Value                    | Command                                    |
| --------------- | ------------------------ | ------------------------------------------ |
| Prisma models   | 53                       | `grep -c "^model " prisma/schema.prisma`   |
| API route files | 141                      | `find src/app/api -name route.ts \| wc -l` |
| Feature modules | 17 top-level dirs        | `src/features/*`                           |
| Test files      | 228                      | `find src -name '*.test.ts*' \| wc -l`     |
| Migrations      | 17 migration directories | `ls -d prisma/migrations/*/ \| wc -l`      |
| Tracker source  | 915 lines                | `src/tracker/index.js`                     |

`src/app` is routing glue: most route files are one-line re-exports into `src/features/**/server`.
Example: `src/app/api/send/route.ts:1` re-exports `src/features/analytics/server/send/handler.ts`.
Shared kernels live in `src/lib` and `src/queries` (enforced by `src/lib/app-structure.test.ts`).

## 3. Request authentication and authorization layers

1. **Edge guard** — `src/proxy.ts:21-35` redirects to `/login` when a protected path has no
   `rl_session` cookie. It checks presence only, never validity; the API is the real boundary.
2. **Request parsing** — `parseRequest()` authenticates via `checkAuth()` and enforces CSRF on
   cookie-authenticated unsafe methods (`src/lib/request.ts:105-170`).
3. **Identity resolution** — `checkAuth()` prefers the HttpOnly session cookie, then a bearer
   token, then a Redis-backed legacy auth key, then a share token (`src/lib/auth.ts:27-104`).
4. **Tenant resolution** — `requireWorkspaceAccess(user, workspaceId, role)` and
   `requireWebsiteAccess(user, websiteId, role)` return `null` rather than throwing, so callers
   choose 403 vs 404 (`src/lib/workspace-auth.ts:140-210`).
5. **Inherited route helpers** — `canViewWebsite` / `canUpdateWebsite` / `canDeleteWebsite`
   resolve workspace membership for workspace-owned websites and fall back to legacy
   owner/team/member rows only when `website.workspace_id` is `NULL`
   (`src/permissions/website.ts:103-185`).
6. **Platform admin** — requires the legacy `admin` role **and** an allowlist entry in
   `PLATFORM_ADMIN_EMAILS`; an empty list disables the console in production
   (`src/lib/platform-admin.ts:15-33`).

`src/lib/tenant-boundaries.test.ts:60-80` statically asserts that every route under
`websites/`, `reports/`, `users/`, `workspaces/` calls an authorization helper. Routes outside
those roots (`/api/realtime/[websiteId]`, `/api/payments/*`, `/api/developer/*`, `/api/share/*`)
are not covered by that static test and were checked manually for this audit.

## 4. End-to-end journey: signup → revenue

### 4.1 Signup / login → session

| Step                   | Code                                                          | Evidence                                                                                                    |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Signup page posts JSON | `src/features/auth/**`                                        | `src/app/signup/page.tsx`                                                                                   |
| Account creation       | `registerAccount()` → `createPersonalAccount()`               | `src/features/auth/server/registration.ts:46-77`, handler `src/features/auth/server/register/handler.ts:80` |
| Durable session        | `createAuthResponse()` → `createAuthSession()`                | `src/lib/auth-user.ts:34-64`, `src/lib/auth-session.ts`                                                     |
| Browser credential     | `rl_session`, HttpOnly, SameSite=Lax, 30 days, Secure in prod | `src/lib/auth-cookie.ts:10-64`                                                                              |
| Login                  | `src/features/auth/server/login/handler.ts`                   | same cookie path                                                                                            |
| Google OAuth           | state cookie + signed state, callback issues the same session | `src/features/auth/server/google/callback/handler.ts`, `docs/GOOGLE_OAUTH.md:15-27`                         |

A workspace is deliberately **not** created at registration (`src/features/auth/server/registration.ts:37-44`).
After sign-in, `resolvePostSignInPath()` sends a user with no completed owned workspace to
`/onboarding` (`src/features/auth/server/post-signin.ts:9-61`).

### 4.2 Workspace and first website

| Step                             | Code                                                                                                         | Evidence                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Onboarding step 1 posts a domain | `POST /api/onboarding/website`                                                                               | `src/app/api/onboarding/website/route.ts`, `src/features/onboarding/server/website/handler.ts:59-82` |
| Workspace created invisibly      | `ensureOnboardingWorkspace()` → `createWorkspaceForUser()` (workspace + OWNER membership in one transaction) | `src/features/onboarding/server/queries/onboarding.ts:86-118`, `src/lib/workspace-auth.ts:258-318`   |
| Website created                  | `createOnboardingWebsite()` enforces `getWebsiteLimit()`                                                     | `src/features/onboarding/server/queries/onboarding.ts:156-190`                                       |
| Onboarding finished              | `markOnboardingComplete()`                                                                                   | `src/features/onboarding/server/complete/handler.ts:31-50`                                           |
| Resume logic                     | `resolveOnboardingStep()` = website → tracker → payments                                                     | `src/features/onboarding/lib/steps.ts:15-35`                                                         |

The website row carries the tenant key: `website.workspace_id`
(`prisma/schema.prisma:392-445`). A user may own only one workspace while platform billing exists
(`src/features/workspaces/server/workspaces/handler.ts:58-67`).

### 4.3 Snippet and tracker

- The copy-paste snippet is `<script defer src="…/script.js" data-website-id="…">`
  built by `snippetAttributes()` (`src/features/docs/install-guides.ts:90-110`).
- The script is built from `src/tracker/index.js` by `rollup.tracker.config.js` and served from
  `public/script.js` (`next.config.ts:6,84-89`).
- Install verification polls `GET /api/websites/[id]/onboarding/verify`, which counts
  `website_event` rows for that website (`src/features/websites/server/[websiteId]/onboarding/verify/handler.ts:22-55`).
- A live bottom-corner reminder and first-party proxy guides exist
  (`src/features/websites/components/TrackerReminder.tsx`, `src/features/docs/first-party-proxies.ts:1-60`).

Tracker capabilities are inventoried in `CURRENT_FEATURE_INVENTORY.md` §3.

### 4.4 Collector path

Entry: `POST /api/send` → `src/features/analytics/server/send/handler.ts` (723 lines, unauthenticated).
`POST /api/batch` loops the same handler up to 100 times
(`src/features/analytics/server/batch/handler.ts:18-46`).

Order of operations inside `send.POST`:

1. Validate the Zod envelope; exactly one of `website`, `link`, `pixel` is required
   (`handler.ts:50-105`).
2. Resolve the website through the Redis-backed `fetchWebsite()` (24 h TTL) and read
   `workspace_id` + `domain` (`handler.ts:138-155`, `src/lib/load.ts:6-24`).
3. Derive client IP/UA/geo; **payload values override headers** (`handler.ts:173-177`,
   `src/features/analytics/lib/detect.ts:128-140`).
4. Optional tracker-origin check (off unless `ENFORCE_TRACKER_ORIGIN=true`)
   (`handler.ts:179-196`, `src/features/analytics/lib/tracker-origin.ts:48-74`).
5. Bot check (`isbot`) and blocked-IP check (`handler.ts:198-206`).
6. Redis per-IP ceiling, 1,200 events/min (`handler.ts:208-221`).
7. Reject event timestamps older than 7 days or more than 5 minutes in the future
   (`handler.ts:223-237`).
8. Resolve workspace entitlements; reject unpaid workspaces for billable events; reserve one
   event from the monthly allowance **before** writing anything (`handler.ts:259-300`,
   `src/lib/usage.ts:133-181`).
9. Resolve visitor/session identity (`handler.ts:302-353`; see §5.1).
10. Ensure visitor + session rows exist (`handler.ts:355-383`), then write the event and its
    properties (`handler.ts:468-517` → `saveEvent()`).
11. Optionally create a payment-return detection row (`handler.ts:521-538`).
12. Return a 7-day signed collector cache token, a 5-minute cross-domain linker, and the
    visitor/session tokens (`handler.ts:596-619`).

### 4.5 Persistence and queueing

Default (no `CLICKHOUSE_URL`): every event is one Prisma insert into `website_event`, followed by
`createMany` into `event_data` and an insert into `revenue` when the event carries
`revenue` + `currency` (`src/features/analytics/server/queries/sql/events/saveEvent.ts:68-190`,
`saveEventData.ts:20-40`, `saveRevenue.ts:19-40`). There is **no queue** in this mode.

With `CLICKHOUSE_URL`: `saveEvent()` writes a relational mirror in PostgreSQL and the event in
ClickHouse in parallel (`saveEvent.ts:72-78`). If Kafka is enabled, the ClickHouse write goes
through `sendMessage('event', …)`; otherwise it inserts directly (`saveEvent.ts:250-270`).
The production compose runs the Kafka→ClickHouse bridge as the `worker` service
(`deploy/production/docker-compose.yml:205-230`).

### 4.6 Aggregation

Aggregation is **read-time SQL**, not materialized rollups. `runQuery()` dispatches to Postgres
or ClickHouse (`src/lib/db.ts:19-31`). Postgres queries run through
`prisma.rawQuery()` with named `{{param}}` placeholders converted to `$n` parameters
(`src/lib/prisma.ts:273-301`). Column names come from allowlists (`FILTER_COLUMNS`,
`SESSION_COLUMNS`) rather than user input (`src/lib/prisma.ts:100-130`).

Examples: `getWebsiteStats` (`src/features/analytics/server/queries/sql/getWebsiteStats.ts:18-41`), `getFunnel`
(`src/features/analytics/server/queries/sql/reports/getFunnel.ts:29-53`), `getJourney` (`src/features/analytics/server/queries/sql/reports/getJourney.ts:30-48`),
`getRetention`, `getGoal`, `getUTM`, `getPerformance`.

### 4.7 Dashboard

- `/app/[websiteId]` renders `WebsitePage` → `useWebsiteStatsQuery`
  (`src/app/(main)/app/[websiteId]/page.tsx`, `src/features/analytics/workbench/WebsitePage.tsx`).
- Stats handler authorizes with `canViewWebsite`, then fans out to `getWebsiteStats`,
  `getSessionStats`, `getActiveVisitors`, `getRevenueOverviewReport`, and historical metrics
  (`src/features/analytics/server/[websiteId]/stats/handler.ts:96-180`).
- Report pages call `POST /api/reports/<type>` through `useResultQuery`
  (`src/features/analytics/hooks/useResultQuery.ts:46`), which dispatches in
  `src/features/analytics/server/reports/handler.ts` and per-type handlers.
- The app shell gates the UI on `/api/billing/access`; it never grants access itself
  (`src/features/app-shell/AppBillingGate.tsx:20-90`).
- Revenue by channel/campaign/referrer/landing page is delivered through the overview
  breakdown cards: `DashboardBreakdownPanel` merges traffic and payment attribution and
  `DualMetricTable` can sort by revenue (`DashboardBreakdownPanel.tsx:18-95`,
  `dashboardBreakdown.ts:263-311`). The separate `getRevenueAttributionReport` is used only
  by export and an HTTP route.

### 4.8 Billing entitlement

`getWorkspaceEntitlements()` reads `platform_subscription` first and the workspace mirror second,
then resolves the purchased traffic tier (`src/lib/entitlements.ts:35-87`). "Active" is defined
only by `billingSubscriptionHasAccess()` (`src/lib/billing-lifecycle.ts:112-139`). Ingestion,
replay ingestion, website creation, member invitations, and retention all consume this module
(enforcement matrix in `MONETIZATION_AUDIT.md` §4).

Checkout: `POST /api/billing/checkout` requires OWNER, resolves an exact Dodo product per
plan/interval/tier, and returns a provider URL (`src/features/billing/server/checkout/handler.ts:32-160`).
Webhook: `POST /api/billing/webhook/dodo` verifies a Standard Webhooks signature, claims the event
idempotently, resolves the tenant by provider subscription → provider customer → metadata, and
upserts `platform_subscription` + the workspace mirror
(`src/features/billing/server/webhook/dodo/handler.ts:17-91`,
`src/features/billing/server/service.ts:123-171,320-402,527-605`).

## 5. Identity and session semantics

### 5.1 Tracker identity (current implementation)

- No cookies and no persistent identifier: `document.cookie` does not appear in
  `src/tracker/index.js` (`rg -n "document\\.cookie" src/tracker/index.js` → no match).
- A random session token (`s_<uuid>`) lives in `sessionStorage` under `talivia.session`, with a
  30-minute idle expiry, per tab (`src/tracker/index.js:67,112-162`).
- Every request sends only that session token. On the first request (no collector cache), the
  server synthesizes a visitor token:
  `hash(websiteId, ip, userAgent, getSalt(SALT_ROTATION || 'month', createdAt), secret())`
  (`src/features/analytics/server/send/handler.ts:316-322`).
- `hash()` is SHA-512 hex (`src/lib/crypto.ts:49-51`); `secret()` is SHA-512 of `APP_SECRET`
  (`src/lib/crypto.ts:88-92`); `getSalt()` buckets by day/week/month
  (`src/lib/crypto.ts:106-112`). Default is **monthly**.
- Tokens are truncated to 100 characters **before** the UUID is derived, and the cross-domain
  linker carries the same width (`send/handler.ts:334-341`,
  `tracking-identity.ts:7-11`, `cross-domain-linker.ts:48-51`).
- Tokens become deterministic UUIDs: `uuid(websiteId, 'visitor', token)` and
  `uuid(websiteId, 'session', token)` via UUIDv5 (`src/features/analytics/lib/tracking-identity.ts:13-19`,
  `src/lib/crypto.ts:94-100`).
- The collector cache is a 7-day JWT carrying the resolved visitor/session UUIDs and workspace id
  (`src/features/analytics/lib/collector-cache.ts:12-27`). The tracker keeps it in memory only.
- Cross-domain identity is carried by a 5-minute signed linker
  (`src/features/analytics/lib/cross-domain-linker.ts:8-30`).

Consequences are analysed in `TECHNICAL_DEBT.md` §2.

### 5.2 Product session identity

The signed-in product uses a separate `rl_session` cookie, random 256-bit token, stored as a
SHA-512 hash in `auth_session` (`src/lib/auth-cookie.ts:10-64`, `src/lib/auth-session.ts`).
Session TTL is 30 days; password change/reset revoke all sessions
(`src/features/account/server/account/handler.ts` and `src/lib/auth-session.ts`).

## 6. Tenant isolation enforcement points

| Surface                                | Enforcement                                                                               | Evidence                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Workspace CRUD / members / invitations | `requireWorkspaceAccess` + role map                                                       | `src/lib/workspace-auth.ts:34-88,140-210`                                                     |
| Website analytics/report routes        | `canViewWebsite` → workspace membership (legacy fallback only for `workspace_id IS NULL`) | `src/permissions/website.ts:103-185`                                                          |
| Website create/update/delete           | role check + plan website limit                                                           | `src/features/websites/server/websites/handler.ts:60-115`, `[websiteId]/handler.ts:60-110`    |
| Reports                                | permission derived from `report.websiteId`, never `report.userId`                         | `src/features/analytics/lib/report-permissions.ts:8-24`                                       |
| Session/replay/revenue/payment rows    | always queried with `websiteId`                                                           | e.g. `src/features/payments/server/queries/payment.ts:104-111`, `saveRecording.ts:43-61`      |
| Webhooks                               | tenant resolved from the website id in the URL plus a per-website secret                  | `src/features/payments/server/stripe/[websiteId]/webhook/handler.ts:768-800`                  |
| Share tokens                           | website-scoped, read-only, section allowlist; private endpoints rejected                  | `src/lib/auth.ts:25-55,150-200`, `src/lib/request.ts:17-36,150-190`                           |
| API keys                               | website-scoped; live user + workspace membership re-checked on every call                 | `src/features/websites/lib/api-key.ts:20-84`                                                  |
| Exports / backups / imports            | website permission helper                                                                 | `src/features/websites/server/[websiteId]/export/handler.ts:24-36`, `backup/handler.ts:18-30` |
| Admin console                          | `isPlatformAdmin` (role + allowlist), separate from tenant roles                          | `src/lib/platform-admin.ts:15-33`                                                             |

Weak point: `src/features/analytics/workbench/WebsiteLayoutRoute.tsx:17-27` fetches a website by id
in a server component without an authorization check. It only decides whether to render the shell;
the data APIs still reject non-members, so this is a UI/information-disclosure nit, not a tenant
data leak.

## 7. Deployment and operational shape

- Production is a single VPS Docker stack (Postgres, Redis, ClickHouse, Kafka, app, Caddy) with
  memory limits: app 1 GB, ClickHouse 2 GB, Kafka 1 GB, Postgres 1 GB
  (`deploy/production/docker-compose.yml`).
- Migrations run as a one-shot `prisma migrate deploy` against `DATABASE_URL_UNPOOLED`
  (`deploy/production/docker-compose.yml:233-247`, `prisma.config.ts:1-24`).
- Analytics retention and auth maintenance run as in-process cron jobs, only when
  `NODE_ENV=production` (`src/features/system/cron/index.ts:67-90`).
- `scripts/talivia-attribution-worker.ts` exists but is not wired into compose, cron, or the
  Dockerfile (`rg -n "attribution-worker" deploy scripts Dockerfile package.json` → only the
  `package.json` script). Manual recalculation runs inline instead
  (`src/features/payments/server/queries/payment.ts:1286-1385`).

## 8. Why this matters for the buildout

The inherited engine is real and reasonably layered, but it is a **self-hosted analytics product**
with a billing/workspace layer bolted on. The SaaS-critical gaps are not the collector; they are
(a) most Pro entitlements are unenforced, (b) portfolio-level MRR by channel is computed but not
rendered, and (c) visitor identity is window-scoped. Session replay is now switchable and gated.
See `TECHNICAL_DEBT.md` §1.

## 9. UNVERIFIED

- Actual production topology and whether ClickHouse/Kafka are currently healthy: **UNVERIFIED**
  (no deploy access; `docs/PHASES.md:29-31,398` claims a healthy worker).
- Whether the test suite currently passes: **UNVERIFIED** (not run; `pnpm gate` would build).
- Whether Dodo/Resend/provider credentials are live: **UNVERIFIED** (no credential use).
- Database row counts, table sizes, index bloat: **UNVERIFIED** (no DB connection used).
