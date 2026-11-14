# Technical debt and risk register

- **Audited revision:** `7e32b59` (audited after the replay and onboarding slices; the repository is being changed concurrently).
- **Method:** read-only source inspection. No test/build/dev/DB command was run, so every
  runtime claim is **UNVERIFIED** until `pnpm gate` executes on a machine with enough memory.
- Severity is judged by revenue or security impact, not code aesthetics.

## 1. Critical gaps, ranked

| #   | Gap                                                                                              | Impact                                                                                                                                                                                                                                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Most Pro entitlements are unenforced.**                                                        | Revenue: Starter users get Pro features; no expansion revenue.                                                                                                                                                                                      | `entitlementsHaveFeature` is used only for the replay switch (`src/features/websites/server/[websiteId]/handler.ts:120-129`). `api_access`, `full_backup`, `client_reporting`, `paymentConnectionLimit`, `journeys`, and `advanced_attribution` still have no server checks. Details in `MONETIZATION_AUDIT.md` section 4.                                                                                               |
| 2   | **Portfolio MRR by channel is computed but not rendered.**                                       | Revenue: missing portfolio view; per-site channel revenue already exists.                                                                                                                                                                           | Per-site revenue is delivered by `DashboardBreakdownPanel.tsx:18-95` and `dashboardBreakdown.ts:263-311`. `mrrByChannel` is computed but never rendered (`portfolioMrr.ts:16`; `website-overview.ts:108,245`). The dedicated `getRevenueAttributionReport` is only used by CSV export and an HTTP route.                                                                                                                 |
| 3   | **Visitor identity rotates monthly by default, so first-touch resets at each rotation.**         | Revenue correctness: a returning customer who crosses a month boundary gets a new visitor and a new first touch, so recurring revenue is attributed to the return channel (often direct). Cohorts, retention, and MRR-by-channel are window-scoped. | `send/handler.ts:316-322` derives the visitor from `getSalt` with a default monthly salt; `getSalt` buckets to start-of-month/week/day (`crypto.ts:106-112`). `visitor` rows are unique on `(website_id, token)` (`schema.prisma:913`). The UI now admits it: `metric-definitions.ts:14-15`.                                                                                                                             |
| 4   | **The public collector trusts client-supplied IP/UA, and origin enforcement is off by default.** | Security/abuse: rate-limit and bot bypass, quota burning, analytics poisoning.                                                                                                                                                                      | `getClientInfo` prefers `payload.ip`/`payload.userAgent` over headers (`detect.ts:128-140`); the payload schema accepts both (`send/handler.ts:51-92`); the rate limit keys on that IP (`send/handler.ts:208-221`); `isTrackerOriginAllowed` returns `true` unless `ENFORCE_TRACKER_ORIGIN=true` (`tracker-origin.ts:48-74`).                                                                                            |
| 5   | **Metering leaks.**                                                                              | Revenue: unbilled/uncounted usage and a false quota release.                                                                                                                                                                                        | Usage is reserved only when both `websiteId` and `workspaceId` are present (`send/handler.ts:263`). Legacy `workspace_id = NULL` websites, `/q/[slug]` links, and `/p/[slug]` pixels bypass entitlements. Imports bypass the counter (`src/features/websites/server/imports/**`). A failure after the event insert releases the reservation while the event remains (`saveEvent.ts:125-190`; `send/handler.ts:620-630`). |
| 6   | **No database foreign keys.**                                                                    | Security/integrity: orphan rows are possible; cascades are Prisma-only.                                                                                                                                                                             | `relationMode = "prisma"` (`schema.prisma:7-10`); migration comment (`20261104180000_workspaces/migration.sql:1-4`); `grep -rn "FOREIGN KEY" prisma/migrations` returns 0.                                                                                                                                                                                                                                               |
| 7   | **Billing period is not the subscription anniversary.**                                          | Revenue: first partial month gets a full allowance; downgrades cut off mid-period.                                                                                                                                                                  | Metering is the UTC calendar month (`usage.ts:68-73`), while provider periods are stored on `platform_subscription` (`schema.prisma:90-91`). The code comment still says periods become provider-driven when billing lands (`usage.ts:23-25`), but billing has landed.                                                                                                                                                   |
| 8   | **Provider webhook payloads and audit IPs are retained indefinitely.**                           | Security/privacy: PII/financial data with no retention policy.                                                                                                                                                                                      | `billing_event.payload` (`schema.prisma:120`); `provider_event.raw_payload` (`schema.prisma:1091`); `audit_event.ip_address` plain text (`schema.prisma:1405`, `queries/prisma/audit.ts:26-35`). No cron deletes them (`rg -n "billingEvent" src/features/system/cron` returns no matches).                                                                                                                              |
| 9   | **Events have no idempotency key.**                                                              | Revenue/data quality: a retried tracker or integration request is stored and billed twice.                                                                                                                                                          | `send/handler.ts:478` uses `payload.id` only as `distinctId`; `saveEvent` always generates a new UUID (`saveEvent.ts:69`). Only replay chunks are idempotent (`schema.prisma:820`).                                                                                                                                                                                                                                      |
| 10  | **Share dashboards never expire.**                                                               | Security/privacy: a leaked public link exposes analytics until manual deletion.                                                                                                                                                                     | `Share` has no `expiresAt` (`schema.prisma:788-800`); the view token is regenerated with a 7-day TTL (`share/[slug]/handler.ts:83-85`), but the slug itself is permanent.                                                                                                                                                                                                                                                |
| 11  | **Website cache is not invalidated on update.**                                                  | Security/correctness: tracker-origin and replay settings can be stale for 24 h.                                                                                                                                                                     | `fetchWebsite` caches for 86,400 seconds (`src/lib/load.ts:8-12`); `updateWebsite` updates the row and domain but never deletes the `website:<id>` cache key (`queries/prisma/website.ts:205-221`). `deleteWebsite`/`resetWebsite` do invalidate (`:358,402`).                                                                                                                                                           |
| 12  | **CSP allows unsafe-inline and unsafe-eval.**                                                    | Security: weakens XSS defence on every page.                                                                                                                                                                                                        | `next.config.ts:14`; `connect-src https:` is broad (`:16`).                                                                                                                                                                                                                                                                                                                                                              |
| 13  | **Server-rendered website layout does not authorize.**                                           | Information disclosure: shell renders for a website UUID the caller cannot read.                                                                                                                                                                    | `WebsiteLayoutRoute.tsx:17-27` calls `getWebsite(websiteId)` with no membership check. Data APIs still reject, so this is a nit, not a tenant leak.                                                                                                                                                                                                                                                                      |
| 14  | **Attribution worker is not deployed.**                                                          | Operational: queued `attribution_job` rows have no consumer.                                                                                                                                                                                        | `scripts/talivia-attribution-worker.ts` is only in `package.json:59`; no compose/cron/Dockerfile reference. Manual recalculation runs inline (`payment.ts:1286-1385`).                                                                                                                                                                                                                                                   |

## 2. Tracker identity and cookie behaviour — exactly as implemented

### 2.1 Current tracker (committed in `caa8399`)

- **The tracker sets no cookies.** `rg -n "document\\.cookie" src/tracker/index.js` → no match.
  The retired cookie names still exist as unused constants in
  `src/features/analytics/lib/tracking-identity.ts:3-5`.
- **Session token:** `s_<uuid>` (or `s_<hex>` fallback) stored in `sessionStorage` under
  `talivia.session`, JSON `{ id, lastSeen }`, with a **30-minute idle** expiry, per tab
  (`src/tracker/index.js:67,112-162`). When storage is blocked, it stays in memory.
- **Visitor token:** never sent by the tracker. The server derives it on a cache miss:
  `hash(websiteId, ip || 'unknown', userAgent || 'unknown', getSalt(SALT_ROTATION || 'month', createdAt), secret())`
  (`send/handler.ts:316-322`). `hash` is SHA-512 hex (`crypto.ts:49-51`); `secret()` is
  SHA-512 of `APP_SECRET` (`crypto.ts:88-92`); `getSalt` buckets by day/week/month
  (`crypto.ts:106-112`). Default is **monthly**.
- **Derived IDs:** `visitor_id = uuid(websiteId,'visitor',token)` and
  `session_id = uuid(websiteId,'session',token)` (UUIDv5) (`tracking-identity.ts:13-19`).
- **Collector cache:** a 7-day JWT with `websiteId`, `visitorId`, `sessionId`, optional
  `workspaceId` (`collector-cache.ts:12-27`). The tracker holds it in memory only (`cache`
  variable), so a page reload falls back to IP+UA derivation.
- **Cross-domain linker:** a 5-minute JWT carrying visitor/session tokens
  (`cross-domain-linker.ts:8-30`).
- **Consent:** opt-in gate. `data-consent="required"` sets `consentGranted=false`; otherwise
  events flow immediately (`src/tracker/index.js:46,690-706,883`; install snippet does not add
  the attribute — `install-guides.ts:90-110`).
- **DNT:** opt-in via `data-do-not-track="true"` (`src/tracker/index.js:37,302-305,596-603`).
- **Global Privacy Control:** honored by default; `navigator.globalPrivacyControl === true`
  disables tracking (`src/tracker/index.js:15,600`).

### 2.2 What this fixes

The previous model set `talivia_visitor_id` for 365 days and `talivia_session_id` for 30 minutes.
Because both were written by page JavaScript (`document.cookie`) on the customer's own domain,
Safari's ITP would cap them to roughly 7 days despite the advertised max-age. The cookieless model
removes that persistent client-side identifier and the storage dependency. It does **not** remove
the need for consent: a keyed hash of IP + user agent is still pseudonymous personal data, and the
tracker still sends by default unless `data-consent="required"` is set.

Commit `8955423` also fixed the cross-domain identity bug: the visitor token is now truncated to
the stored width **before** the UUID is derived, and the linker uses the same constant
(`send/handler.ts:334-341`, `cross-domain-linker.ts:48-51`, `tracking-identity.ts:7-11`).

### 2.3 What it breaks or risks

1. **Monthly visitor reset (highest impact).** The default salt is monthly, so the same person gets
   a new `visitor` row at each month boundary and every `first_touch_*` field resets. Revenue from
   a returning customer is attributed to the channel of the return visit. Cohorts, retention, and
   "returning visitors" are window-scoped. The UI definition now says so
   (`metric-definitions.ts:14-15`).
2. **NAT / shared-IP collisions.** All visitors behind one IP with the same user agent in a salt
   window collapse into one visitor. Mobile networks and offices are the common case.
3. **User-agent changes split identity.** A browser update, an in-app webview, or a UA-reducing
   privacy tool creates a new visitor.
4. **Client-controlled identity.** A caller can POST arbitrary `ip` and `userAgent` values, which
   both derive the visitor and select the rate-limit bucket. This is not just analytics pollution:
   it lets one client mint unlimited "visitors" and evade the per-IP ceiling.
5. **Multi-tab sessions.** `sessionStorage` is per tab, so three open tabs produce three session
   tokens (and three visits) for one person.
6. **Dead constants.** `TALIVIA_VISITOR_COOKIE`/`TALIVIA_SESSION_COOKIE` still ship and tests assert
   them (`tracking-identity.test.ts:30-31`), even though the tracker no longer uses cookies. Any
   future reader will assume cookies still exist.

**Recommendation for the master:** decide the identity contract before building on it. Either
(a) keep cookieless and persist a stable visitor ID in a first-party, consent-aware way, or
(b) make the salt window match the sales/attribution promise (for example 90 days) and document
that first touch is window-scoped. Do not build MRR-by-channel on monthly-rotating identity without
stating that limitation on the dashboard.

## 3. Documentation vs code

| Document claim                                                                                         | Code reality                                                                         | Evidence                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Pro has **50** websites (`PRICING_ECONOMICS.md:9,34,52,71`; `LAUNCH_CHECKLIST.md:9`)                   | Pro has **20**                                                                       | `plans.ts:167`                                                                                        |
| Pro has **5** members (`TENANCY.md:66`)                                                                | Pro has **10**                                                                       | `plans.ts:168`                                                                                        |
| Signup creates "the user, personal workspace, OWNER membership … in one transaction" (`TENANCY.md:57`) | Signup creates the **user only**; workspace is created in onboarding                 | `registration.ts:37-44`; `onboarding.ts:86-118`                                                       |
| "MRR by first-touch channel on `/app`" is done (`PHASES.md:1954-1958`)                                 | `mrrByChannel` is computed server-side but no UI renders it                          | `portfolioMrr.ts:16`; `website-overview.ts:245`; no `mrrByChannel` in `src/features/portfolio`        |
| "No ClickHouse deployment" (`AGENTS.md:55-57`)                                                         | Production compose runs ClickHouse **and** Kafka; queries switch on `CLICKHOUSE_URL` | `deploy/production/docker-compose.yml:111-180`; `src/lib/db.ts:19-31`                                 |
| "Only accepted, valid, **deduplicated**, non-bot events are counted" (`usage.ts:20`)                   | No event-level dedupe exists; `payload.id` is a distinct id, not an event id         | `send/handler.ts:478` (`distinctId: id`); `saveEvent` always generates a new UUID (`saveEvent.ts:69`) |
| Billing periods will "become provider-driven when platform billing lands" (`usage.ts:23-25`)           | Billing has landed; metering is still the UTC calendar month                         | `usage.ts:68-73`                                                                                      |
| Workspace creation is blocked "until platform billing exists" (`workspaces/handler.ts:55-57`)          | It is blocked because one owned workspace is the product rule; billing exists        | `workspaces/handler.ts:58-67`                                                                         |
| 225 test files (`PHASES.md:85`)                                                                        | 228 test files on disk                                                               | `find src -name '*.test.ts*' \| wc -l`                                                                |

The pattern is drift, not fabrication. The plan-limit drift is the dangerous one because the
pricing page reads code while the market docs and sales collateral may quote 50.

## 4. Other debt worth tracking

### 4.1 Ingestion and data

- **One insert per event into a 14-index table.** `saveEvent` creates one `website_event` row,
  then `event_data` rows per property, then `revenue`. No transaction, no batch insert in the
  default Postgres path (`saveEvent.ts:68-190`). A partial failure can leave an event without its
  properties and release the quota (§1 #5).
- **`/api/batch` is a loop, not a batch.** It re-creates a `Request` and calls `send.POST` per item
  (`batch/handler.ts:18-46`), so N events cost N HTTP parses plus N inserts.
- **No partitioning or rollups.** Dashboards aggregate raw rows at read time
  (`getWebsiteStats.ts:18-41`). Retention is a nightly delete (`analytics-retention.ts:211-280`).
- **No event idempotency.** A client retry duplicates an event; only replay chunks are idempotent
  (`schema.prisma:820`).
- **`UsageReplaySession` is never deleted with its website.** `deleteWebsiteData` does not touch
  it and there is no FK (`queries/prisma/website.ts:223-335`; `schema.prisma:199-211`).
- **No real `event_data` bound.** A 1 MB JSON body can flatten into thousands of rows per event
  (`saveEventData.ts:20-40`). The only cap is the body limit.
- **Stale website cache** (§1 #11). `record` deliberately bypasses it with `getWebsite`
  (`record/handler.ts:65-70`), which confirms the shared cache is not trusted for
  entitlement-sensitive reads.

### 4.2 Security and privacy

- **Collector origin check is opt-in.** `ENFORCE_TRACKER_ORIGIN` defaults off, so a public
  `data-website-id` can be replayed from any host (`tracker-origin.ts:48-74`).
- **Share links have no expiry** (§1 #10) and a share token is accepted only with the
  `x-talivia-share-context: 1` header (`auth.ts:44-48`), which is a UI convention, not a secret.
- **Audit rows store plain IP and user agent indefinitely** (`schema.prisma:1405-1407`;
  `queries/prisma/audit.ts:26-35`). No retention job.
- **Billing/provider payloads are stored raw** (§1 #8). Useful for replay/debug, but needs a
  retention window and a documented legal basis.
- **CSP is permissive** (§1 #12). `script-src` allows inline/eval in production, not just dev.
- **`scripts/legacy-table-drop.ts` is destructive if misused.** It has preconditions and a
  `--apply` gate, but it is a manual script, not a migration (`scripts/legacy-table-drop.ts:1-40`).

### 4.3 Architecture and operations

- **Two deployment stories.** Root `docker-compose.yml` is app+Postgres; the production compose
  adds Redis/ClickHouse/Kafka/Caddy. `AGENTS.md` still describes Neon with no ClickHouse. A new
  engineer will pick the wrong one.
- **Optional infrastructure is silently optional.** `REDIS_URL`, `CLICKHOUSE_URL`, `KAFKA_URL`
  each change behaviour at runtime (`redis.ts:105-107`, `db.ts:19-31`, `kafka.ts`). Tests run
  without them, so the ClickHouse/Kafka paths are under-tested.
- **Attribution worker not deployed** (§1 #14).
- **Only `en-US` is registered** (`src/i18n/request.ts`, `src/lib/lang.ts:3-7`), so the `next-intl`
  dependency is currently overhead.
- **OpenAPI is partial:** 19 documented paths vs 141 route files (`grep -c "^  /" openapi.yaml`).
- **Dead code / dead fields:** `CollectorCachePayload.workspaceId` is written but never read
  (`collector-cache.ts:8-13`; `rg -n "cache.workspaceId" src` → no match), and the cookie-name
  constants are unused (§2.3).
- **`App.tsx` performs a navigation side effect during render** (`window.location.href` in the
  component body, `src/features/app-shell/App.tsx:55-57`). It works, but it is not idiomatic and
  can double-fire.
- **Test confidence is unknown.** 228 test files exist and coverage floors are 65/50/60/65
  (`vitest.config.ts:23-36`), but the suite was not executed here. Many analytics tests are
  unit-level with mocked Prisma; the real SQL paths are exercised only by
  `phase7-analytics-smoke` when a database is available.

## 5. Positive controls worth preserving

- Tenant authorization is centralized and fails closed: `requireWorkspaceAccess` returns `null`
  for deleted/suspended workspaces, unknown roles, or missing membership
  (`workspace-auth.ts:140-180`). Platform admin is deliberately separate (`platform-admin.ts:15-33`).
- API keys are website-scoped and re-check the creator's live workspace membership on every call
  (`api-key.ts:20-84`).
- Payment webhooks require a per-website secret and reject a global fallback
  (`stripe/[websiteId]/webhook/handler.ts:788-800`).
- Platform-billing webhooks verify a Standard Webhooks signature, dedupe by event id, order by
  `(timestamp, priority)`, and resolve the tenant from provider IDs before metadata
  (`billing/service.ts:123-171,173-222,343-351`).
- Usage reservation is atomic and fails closed (`usage.ts:133-181`).
- Collector timestamps are now bounded to 7 days old / 5 minutes future (`send/handler.ts:223-237`).
- First-party proxy templates strip cookies/authorization and enforce path/method/body limits
  (`features/docs/first-party-proxies.ts:19-60`).
- SSRF-safe outbound install checks pin DNS and block private ranges
  (`src/lib/safe-fetch.ts:1-20,172-190`).

## 6. UNVERIFIED

- Test suite pass/fail, coverage, and `pnpm gate`: **UNVERIFIED** (not run).
- Whether the monthly identity rotation materially changes first-touch numbers for real customers:
  **UNVERIFIED** (no production data).
- Whether Redis/ClickHouse/Kafka are enabled in the deployed environment: **UNVERIFIED**.
- Actual provider payload contents and retention obligations: **UNVERIFIED** (no live data).
