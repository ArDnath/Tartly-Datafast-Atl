# Reference inventory — `/home/ariyaman/Dev/fight/efforts/References`

Status: read-only triage completed 2026-11-14. No file inside References was
written, formatted, installed, built or run.

Scope: the eleven directories that actually exist on disk, enumerated with
`ls -1`, not a list copied from a prompt or README.

Method: `git log -1`, `du -sh --exclude=node_modules --exclude=.git`, direct
reads of `LICENSE`/`LICENCE`/`LICENSE.md`/`LICENSE.txt`, static search for test
files (`*.test.*`, `*.spec.*`, `*_test.go`, `*Test.php`, `test_*.exs`), and
`sed`/`rg` reads of the tracker, collector, schema and aggregation files cited
below. Test counts are static file counts, not executed suites.

License classes: **A** = permissive, **B** = copyleft or network copyleft,
**C** = unclear.

## Summary table

| #   | Directory                | Category                | Stack                                                              | Last commit | License file / SPDX                      | Class | Size | Tests              | Package manager                   |
| --- | ------------------------ | ----------------------- | ------------------------------------------------------------------ | ----------- | ---------------------------------------- | ----- | ---- | ------------------ | --------------------------------- |
| 1   | `ActivateIQ`             | dashboard-UI / other    | React 19 + Vite + TypeScript                                       | 2026-01-02  | **no LICENSE file**; README claims MIT   | **C** | 136K | none               | npm (`package.json`, no lockfile) |
| 2   | `analytics` (Plausible)  | web analytics           | Elixir/Phoenix + ClickHouse + PostgreSQL                           | 2026-11-13  | `LICENSE.md` / AGPL-3.0                  | **B** | 27M  | 77 test files + CI | mix (`mix.exs`)                   |
| 3   | `analytics.js` (Segment) | tracker-SDK             | JavaScript (browser SDK)                                           | 2021-09-30  | `License.md` / MIT                       | **A** | 916K | none               | npm (`package.json`, no lockfile) |
| 4   | `datagoat`               | revenue analytics       | TypeScript + Hono + Cloudflare Workers/D1 + React                  | 2026-11-11  | `LICENSE` / MIT                          | **A** | 7.3M | 117 test files     | npm (`package-lock.json`)         |
| 5   | `minilytics`             | revenue analytics       | TypeScript + Hono + Cloudflare Workers/D1                          | 2026-11-03  | `LICENSE` / MIT                          | **A** | 2.5M | 2 test files       | npm (`package-lock.json`)         |
| 6   | `openanalytics`          | web analytics + revenue | TypeScript monorepo + Postgres + ClickHouse + Redis                | 2026-10-22  | `LICENSE` / AGPL-3.0-only                | **B** | 21M  | 259 test files     | pnpm (`pnpm-lock.yaml`)           |
| 7   | `Open-Web-Analytics`     | web analytics           | PHP + MySQL                                                        | 2026-11-12  | `LICENCE` / GPL-2.0                      | **B** | 15M  | 304 test files     | Composer + npm                    |
| 8   | `pixelmoth`              | revenue analytics       | TypeScript + Hono + Cloudflare Workers/D1                          | 2026-10-25  | `LICENSE` / MIT                          | **A** | 4.2M | 1 test file        | npm (`package-lock.json`)         |
| 9   | `talivia`                | revenue analytics       | Next.js + TypeScript + Prisma + PostgreSQL (+ optional ClickHouse) | 2026-10-25  | `LICENSE` / MIT                          | **A** | 7.7M | 120 test files     | pnpm (`pnpm-lock.yaml`)           |
| 10  | `trckable`               | web analytics + revenue | Go + SQLite + DuckDB + React + TypeScript tracker                  | 2026-11-14  | `LICENSE` / AGPL-3.0-only (tracker: MIT) | **B** | 27M  | 810 test files     | pnpm + Go modules                 |
| 11  | `umami`                  | web analytics           | Next.js + TypeScript + Prisma + PostgreSQL (+ optional ClickHouse) | 2026-11-12  | `LICENSE` / MIT                          | **A** | 16M  | 221 test files     | pnpm (`pnpm-lock.yaml`)           |

Source dates and sizes were read from each repository on 2026-11-14.

---

## 1. ActivateIQ

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/ActivateIQ`
- **Purpose:** Marketing/demo UI for an "activation-focused churn and retention"
  SaaS. Screens for activation setup, churn risk, insights and a mock dashboard.
- **Stack/language:** React 19, TypeScript, Vite, Tailwind, Recharts,
  Framer Motion, React Three Fiber. Front end only.
- **Last commit:** 2026-01-02 — `2962473 feat: Initialize ActivateIQ project setup`
  (single-commit history).
- **License:** No `LICENSE`, `LICENCE`, `COPYING` or metadata file. `README.md`
  line 103 says "MIT License", but the acceptance rule requires a license file.
  **SPDX: none verified. Class C (unclear).**
- **Size:** 136K (excluding `.git`/`node_modules`; no `node_modules` present).
- **Tests:** none found.
- **Package manager:** npm (`package.json`; no lockfile).
- **Top-level directories:** `components`, `context`, `views`.
- **Category:** dashboard-UI / other (not an analytics engine).

### Engine inspection

| Layer             | Finding                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| Tracker           | None. No tracker, snippet or collector directory.                       |
| Ingestion handler | None. No server code.                                                   |
| Event schema      | None. `types.ts` and `context/AppContext.tsx` hold mock UI types/state. |
| Aggregation query | None. `views/Dashboard.tsx` renders static/context demo data.           |

### Notable files

- `views/Dashboard.tsx`, `views/ChurnRisk.tsx`, `components/ui.tsx` — only
  reusable visual patterns; no data logic worth porting.

### Reject reason

No license file (class C), no backend, no tracker or event pipeline, mock data
only. **Reject for harvesting.** Do not copy UI or branding.

---

## 2. analytics (Plausible)

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/analytics`
- **Purpose:** Full self-hosted Plausible Analytics server (privacy-first web
  analytics) with tracker, ingestion, ClickHouse storage, stats API and
  dashboard.
- **Stack/language:** Elixir/Phoenix, Ecto, ClickHouse (ingest + stats),
  PostgreSQL, Oban, TypeScript tracker.
- **Last commit:** 2026-11-13 — `8e5982c237 Show the deletion date in deletion notice subjects (#6882)`
- **License:** `LICENSE.md` — GNU Affero General Public License v3.0.
  `composer.json` is not used; `mix.exs` does not declare an SPDX string.
  **SPDX: AGPL-3.0. Class B.**
  **Critical exception:** `extra/COPYING.txt` says the `extra/` tree is
  "provided for informational purposes only, and no rights to use, distribute
  or otherwise exploit this software are granted". `extra/lib/license.ex`
  repeats it. The `extra/` directory is proprietary enterprise code and must
  never be copied, even though the repository root is AGPL.
- **Size:** 27M.
- **Tests:** 77 test files/CI workflows (15 workflows).
- **Package manager:** mix/Hex (`mix.exs`, `mix.lock`); tracker has its own npm
  package.
- **Top-level directories:** `assets`, `config`, `e2e`, `extra`, `fixture`,
  `lib`, `priv`, `rel`, `test`, `tracker`.
- **Category:** web analytics.

### Engine inspection

| Layer             | File path                                                                                                                                                                                    | Observation                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tracker           | `tracker/src/plausible.js`, `tracker/src/track.js`, `tracker/src/web-snippet.js`, `tracker/src/engagement.js`                                                                                | 8-file TypeScript/JS tracker, ~985 lines across the core files; queue, SPA pageviews, outbound links, engagement and custom events.                                                                                      |
| Ingestion handler | `lib/plausible_web/controllers/api/external_controller.ex` → `lib/plausible/ingestion/event.ex` (611 lines), `lib/plausible/ingestion/request.ex`, `lib/plausible/ingestion/write_buffer.ex` | External controller builds a request, then `Ingestion.Event.build_and_buffer/1` runs bot/spam/gate checks and buffers accepted events. Rate limiting is in `lib/plausible_web/controllers/api/rate_limit.ex`.            |
| Event schema      | `priv/data_migrations/NumericIDs/sql/create-events-v2.sql.eex`, `priv/ingest_repo/structure.sql`, `priv/ingest_repo/migrations/20230417104025_add_revenue_to_events.exs`                     | `events_v2` plus `revenue_reporting_amount`, `revenue_reporting_currency`, `revenue_source_amount`, `revenue_source_currency` (Decimal64(3)/FixedString(3)).                                                             |
| Aggregation query | `lib/plausible/stats/sql/query_builder.ex` (282 lines), `lib/plausible/stats/metrics.ex`, `lib/plausible/stats/query.ex`                                                                     | Builds event/session metric queries with joins, dimensions and pagination. Revenue metrics are compiled in only for enterprise builds (`@revenue_metrics on_ee(...)`); the implementation lives in proprietary `extra/`. |

### Notable files

- `lib/plausible/ingestion/event.ex` — drop-reason taxonomy, bot and spam
  pipeline, gatekeeper checks.
- `lib/plausible/ingestion/acquisition.ex`, `lib/plausible/ingestion/source.ex`
  — source/acquisition classification.
- `lib/plausible/stats/sql/query_builder.ex`, `lib/plausible/stats/sql/fragments.ex`
  — readable query composition ideas for event/session metrics.
- `tracker/src/track.js`, `tracker/src/engagement.js` — SPA and engagement
  tracking patterns.
- `priv/ingest_repo/migrations/*` — schema evolution over six years.

### Reject / caution

AGPL-3.0 and a proprietary `extra/` subtree. Elixir/ClickHouse is the opposite
of the project's Next.js/TypeScript/PostgreSQL-only constraint. Use as an
**architecture reference only**; do not copy code, especially not `extra/`.
Revenue attribution is not available in the AGPL portion of this checkout.

---

## 3. analytics.js (Segment)

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/analytics.js`
- **Purpose:** Prebuilt Segment analytics.js browser SDK: one snippet/API that
  normalizes page/identify/track/group/alias calls and fans them out to
  integrations.
- **Stack/language:** JavaScript (UMD bundle) + small CommonJS wrapper.
- **Last commit:** 2021-09-30 — `5d18c3d Merge pull request #662 from segmentio/reference-next`
  (no commits in ~5 years).
- **License:** `License.md` — "(The MIT License)", Copyright (c) 2015
  Segment.io. **SPDX: MIT. Class A.**
- **Size:** 916K.
- **Tests:** none in this repository.
- **Package manager:** npm (`package.json`); Makefile for the bundle.
- **Top-level directories:** `lib` (everything else is built assets/docs).
- **Category:** tracker-SDK.

### Engine inspection

| Layer             | File path                                                                                           | Observation                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tracker           | `analytics.js` (20,419-line built UMD bundle), `lib/index.js`, `lib/integrations.js`                | `Analytics.prototype.track` at `analytics.js:450`; page/identify/group/alias are adjacent.                                   |
| Ingestion handler | **None**                                                                                            | Client-side only; destinations are third-party integrations.                                                                 |
| Event schema      | `analytics.js:811` (`Analytics.prototype.normalize`) and `analytics.js:5704` (`function normalize`) | Message envelope: `anonymousId`, `messageId`, `timestamp`, `context`, `integrations`, `properties`; no external schema file. |
| Aggregation query | **None**                                                                                            | No datastore or query layer.                                                                                                 |

### Notable files

- `analytics.js:811-870` — normalization and envelope conventions.
- `lib/index.js` — minimal integration registration wrapper.
- `Readme.md` — historical API shape and snippet usage.

### Reject reason

Unmaintained since 2021, browser-only, no collector/schema/query, and the repo
ships a generated 20k-line bundle rather than maintainable source. Useful only
as a naming/envelope reference (`identify`/`track`/`page`).

---

## 4. datagoat

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/datagoat`
- **Purpose:** Revenue-first web analytics on Cloudflare Workers + D1. Tracker,
  ingest, dashboard, goals, revenue attribution and provider integrations.
- **Stack/language:** TypeScript, Hono, Cloudflare Workers, D1 (SQLite), React
  dashboard, Zod, Vitest/Playwright.
- **Last commit:** 2026-11-11 — `6475de8 test(e2e): read card order with Array.from (no DOM iterable in the e2e typecheck)`
- **License:** `LICENSE` — MIT License, Copyright (c) 2026 DataGoat
  contributors. Tracker header also declares MIT.
  **SPDX: MIT. Class A.**
- **Size:** 7.3M.
- **Tests:** 117 test files, including schema write-budget tests.
- **Package manager:** npm (`package-lock.json`); Wrangler for deploy.
- **Top-level directories:** `apps`, `cli`, `dashboard`, `docs`, `migrations`,
  `packages`, `public`, `scripts`, `shared`, `src`, `static`, `test`, `tracker`.
- **Category:** revenue analytics.

### Engine inspection

| Layer             | File path                                                                                                                                           | Observation                                                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracker           | `tracker/src/tracker.ts` (684 lines), `tracker/src/script.ts`, `tracker/src/validate.ts`                                                            | Cookie/cookieless/hash builds, DataFast-compatible tag, click IDs, consent, cross-domain `_dg_*` params, sendBeacon/fetch.                                                                                 |
| Ingestion handler | `src/ingest/handler.ts`, `src/ingest/write.ts`, `src/ingest/identity.ts`                                                                            | Fixed order: parse (≤8 KB) → IP+site rate limit → site → hostname → bot → exclusions → GPC/identity → enrich → one batched D1 write in `waitUntil`.                                                        |
| Event schema      | `migrations/0001_init.sql` (visitors, sessions, events, payments), `migrations/0200_query_rollups.sql`, `migrations/0300_revenue_subscriptions.sql` | `sites.attribution_model` (`first_touch`/`last_touch`/`last_non_direct`), `events(type, path, name, props)`, `payments(kind, reporting_minor, visitor_id)`, `provider_subscriptions`, daily rollup tables. |
| Aggregation query | `src/query/jobs/rollups.ts`, `src/query/revenue.ts`, `src/query/overview.ts`                                                                        | Idempotent `INSERT … SELECT … GROUP BY … ON CONFLICT DO UPDATE … WHERE changed` rollups for visitors/sessions/pageviews/revenue; revenue joins payments to the session selected by attribution model.      |

### Notable files

- `src/query/jobs/rollups.ts` — portable daily rollup SQL with write-budget
  reasoning (directly adaptable to PostgreSQL `ON CONFLICT`).
- `src/query/revenue.ts` — revenue joins for first/last/last-non-direct.
- `src/ingest/handler.ts` — hardened collector ordering and rate limits.
- `migrations/0200_query_rollups.sql` — partial indexes and rollup watermark.
- `migrations/0300_revenue_subscriptions.sql` — subscription lifecycle state
  and renewal/refund/dispute semantics.
- `tracker/src/tracker.ts` — cookieless/consent variants and DataFast
  compatibility.

### Reject / caution

Pre-release (`0.1.0`), Cloudflare D1-specific SQL and bindings, no PostgreSQL
implementation. Accept code but port types/SQL; do not assume the Cloudflare
runtime exists in this project.

---

## 5. minilytics

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/minilytics`
- **Purpose:** Revenue-first web analytics for small sites on Cloudflare's free
  plan: sources, goals, visitor journeys and payment attribution.
- **Stack/language:** TypeScript, Hono, Cloudflare Workers/D1, Vite/React,
  Tailwind, Vitest.
- **Last commit:** 2026-11-03 — `3243342 Security hardening: headers, login lockout race, full site deletion, Stripe site scoping`
- **License:** `LICENSE` — MIT License, Copyright (c) 2026 surendrapandar.
  **SPDX: MIT. Class A.**
- **Size:** 2.5M.
- **Tests:** 2 test files.
- **Package manager:** npm (`package-lock.json`).
- **Top-level directories:** `docs`, `migrations`, `public`, `scripts`, `src`,
  `test`.
- **Category:** revenue analytics.

### Engine inspection

| Layer             | File path                                                                                        | Observation                                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracker           | `public/js/script.js` (222 lines)                                                                | First-party cookies (`ml_vid`/`ml_sid`), 30-minute session, SPA pageviews, goals, outbound links, `ml_ignore` opt-out, localhost guard.                                                   |
| Ingestion handler | `src/worker/collect.ts` (336 lines)                                                              | 8 KB body cap, type/UUID checks, bot filter, site lookup, hostname ownership check, owner-visit suppression, D1 write.                                                                    |
| Event schema      | `migrations/0001_init.sql`, `migrations/0003_payment_matching.sql`, `migrations/0006_stripe.sql` | `sites`, `visitors`, `sessions`, `events(id, site_id, session_id, visitor_id, ts, type, name, path, props)`, `payments(amount, kind, currency, visitor_id, matched_by, subscription_id)`. |
| Aggregation query | `src/worker/stats.ts` (581 lines)                                                                | Overview/breakdown/customers/visitors; sessions grouped by dimensions, revenue from `payments`, page and goal filters through `EXISTS`.                                                   |
| Payment matching  | `src/worker/payments.ts` (367+ lines)                                                            | `creditedSessionSql()` picks the last non-direct visit; `attribute()` tries metadata → return page → customer → email → timing.                                                           |

### Notable files

- `src/worker/payments.ts` — five-step payment matching and last-non-direct
  credit; the clearest small implementation in the reference set.
- `migrations/0003_payment_matching.sql` — payment-claim table for return-page
  matching.
- `src/worker/collect.ts` — compact hardened collector.
- `src/worker/billing.ts` — hosted-plan gating via Stripe metadata (reference
  only; our platform billing must remain separate from analytics integrations).

### Reject / caution

Very few tests (2) and no CI workflows. Small, readable, but not evidence of
production maturity. Prefer its payment-matching logic over its dashboard.

---

## 6. openanalytics

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/openanalytics`
- **Purpose:** Privacy-first web analytics platform with durable ingest, query
  gateway, tracking SDK, Postgres control plane and ClickHouse analytics,
  including revenue ingestion.
- **Stack/language:** TypeScript monorepo (pnpm), Hono collector, Postgres,
  ClickHouse, Redis/Valkey, React/Next-style web app, Zod contracts.
- **Last commit:** 2026-10-22 — `b572a5e chore(cla): Frexxty signed in #$pullRequestNo`
- **License:** `LICENSE` — GNU Affero GPL v3.0. `package.json` declares
  `"license": "AGPL-3.0-only"`. **SPDX: AGPL-3.0-only. Class B.**
  `apps/tracker/LICENSE` is separately MIT (Copyright (c) 2026 OpenLabs LLC).
- **Size:** 21M.
- **Tests:** 259 test files (unit, contract, tracker, migration, integration).
- **Package manager:** pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- **Top-level directories:** `apps`, `docs`, `infra`, `packages`, `scripts`,
  `tests`.
- **Category:** web analytics + revenue analytics.

### Engine inspection

| Layer             | File path                                                                                                                                 | Observation                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tracker           | `apps/tracker/src/core.ts` (575 lines), `config.ts`, `transport.ts`, `storage.ts`, `privacy.ts`, `rules.ts`, `engagement.ts`, `vitals.ts` | Modular TS tracker, UUIDv7 event ids, retry queue, privacy gate, no-code rules, engagement and Web Vitals. MIT sub-license.                                  |
| Ingestion handler | `apps/collector/src/events.ts` (580 lines), `body.ts`, `ingest-gate.ts`, `limiter.ts`, `client-identity.ts`                               | `POST /v1/events`; validates the whole batch, enqueues to Redis, returns 202 only after the durable write; realtime/usage work cannot fail the request.      |
| Event schema      | `packages/contracts/src/events.ts` (`eventBatchSchema`, `clientEventSchema`), `packages/clickhouse/migrations/0001_events_raw.sql`        | Versioned Zod contract; `events_raw` with `occurred_at`/`received_at`/`accepted_at`, `billing_*`, `schema_version`, bounded properties; no raw IP column.    |
| Aggregation query | `apps/query-gateway/src/operations.ts` (3,624 lines), `packages/clickhouse/migrations/0003_metrics_1m.sql`                                | Aggregate-only operations over `events_raw` and adding `metrics_1m`/hour/day rollups; revenue operations over `revenue_objects` with versioned replacements. |

### Notable files

- `apps/collector/src/events.ts` — "202 only after durable enqueue" pattern.
- `packages/contracts/src/events.ts` — strict, versioned event contract.
- `packages/domain/src/revenue-ingest.ts` — object-head, version and
  out-of-order revenue decisions (charges/refunds/disputes).
- `packages/clickhouse/migrations/0003_metrics_1m.sql` — aggregate rollup with
  deduplication-token caveat.
- `apps/query-gateway/src/operations.ts` — query catalog and read-cost limits.

### Reject / caution

AGPL-3.0-only server; several services (collector, query gateway, realtime,
worker, web) plus ClickHouse and Redis. This contradicts the modular-monolith
and low-cost constraints. Use design notes and the MIT tracker concept only;
do not copy server code.

---

## 7. Open-Web-Analytics

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/Open-Web-Analytics`
- **Purpose:** Long-running self-hosted PHP web analytics server with tracker,
  reports, heatmaps, Domstream session recording, goals and e-commerce.
- **Stack/language:** PHP, MySQL, JavaScript tracker, Composer + npm/Webpack.
- **Last commit:** 2026-11-12 — `b87ee30e Merge pull request #1363 from Open-Web-Analytics/fix/tracker-user-installer-1x`
- **License:** `LICENCE` — GNU GPL v2 (version 2, June 1991; headers allow
  "any later version"). `composer.json` declares `"license": "GPL-2.0"`.
  **SPDX: GPL-2.0-only (composer string). Class B.**
  `modules/Base/src/tracker/LICENSE.txt` is separately BSD-3-Clause
  (Copyright 2020 Peter Adams).
- **Size:** 15M.
- **Tests:** 304 test files (PHPUnit, Jest, Playwright).
- **Package manager:** Composer (`composer.lock`) + npm (`package-lock.json`).
- **Top-level directories:** `api`, `conf`, `Core`, `modules`, `owa-data`,
  `tests`.
- **Category:** web analytics.

### Engine inspection

| Layer             | File path                                                                                                                                                                    | Observation                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracker           | `modules/Base/src/tracker/Tracker.js` (4,222 lines), `tracker-dom.js`, `OwaEvent.js`                                                                                         | Mature but monolithic tracker; cookies, campaigns, e-commerce, Domstream, heatmap hooks.                                                                       |
| Ingestion handler | `Core/Controller.php:441` (`logEvent`), `Core/CoreAPI.php:1823`, `Core/EventQueue.php`, `modules/Base/Controller/ProcessEvent.php`, `modules/Base/Classes/EventDispatch.php` | Legacy event queue and dispatch; v2 raw event path in `modules/Base/Entity/EventRaw.php`.                                                                      |
| Event schema      | `modules/Base/Entity/EventRaw.php` (declarative entity), `modules/Base/Entity/GoalEvent.php`, `modules/Base/Classes/V2Event.php`                                             | `owa_event_raw` append-only table: identity/time, nullable absent values, derived columns kept out. Schema is generated by entity declarations, not SQL files. |
| Aggregation query | `modules/Base/Classes/ResultSetManager.php` (`getMetric`, `getMetricImplementation`), `Core/ReportController.php`, `modules/Base/reports/*.json`                             | Report definitions in JSON; SQL assembled from metrics/dimensions in PHP. Attribution and days-to-purchase reports exist.                                      |

### Notable files

- `modules/Base/src/tracker/Tracker.js` — only if a legacy e-commerce tracking
  pattern is needed; BSD-3, not GPL.
- `modules/Base/Entity/EventRaw.php` — clean raw-event design commentary.
- `modules/Base/reports/attribution-history.json`,
  `modules/Base/reports/days-to-purchase.json` — report definitions worth
  reading, not copying.

### Reject reason

GPL-2.0 server, PHP/MySQL, legacy event queue and huge surface. The tracker is
BSD-3 but still a 4.2k-line monolith. **Reject for code harvesting.**

---

## 8. pixelmoth

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/pixelmoth`
- **Purpose:** Self-hosted revenue-first web analytics on Cloudflare Workers +
  D1 with Dodo Payments built in, visitor journeys and source attribution.
- **Stack/language:** TypeScript, Hono, Cloudflare Workers/D1, Vite/React,
  Tailwind, Vitest.
- **Last commit:** 2026-10-25 — `718f36b chore: add tests, demo tooling and documentation`
- **License:** `LICENSE` — MIT License, Copyright (c) 2026 Kislay.
  **SPDX: MIT. Class A.**
- **Size:** 4.2M.
- **Tests:** 1 test file; `tools/smoke.mjs`.
- **Package manager:** npm (`package-lock.json`).
- **Top-level directories:** `assets`, `db`, `src`, `static`, `tests`, `tools`.
- **Category:** revenue analytics.

### Engine inspection

| Layer             | File path                                                                | Observation                                                                                         |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Tracker           | `static/js/script.js` (~9 KB)                                            | First-party cookies, same-origin endpoint, pageviews/goals/outbound, `sendBeacon`.                  |
| Ingestion handler | `src/server/collect.ts` (301 lines)                                      | Same shape as minilytics: 8 KB cap, type/id checks, bot filter, hostname ownership, D1 write.       |
| Event schema      | `db/migrations/0001_init.sql`, `db/migrations/0003_payment_matching.sql` | Same core tables as minilytics (sites/visitors/sessions/events/payments/funnels), earlier revision. |
| Aggregation query | `src/server/stats.ts` (445 lines)                                        | Overview, breakdown, customers, visitors, profiles and funnels in D1 SQL.                           |
| Payment matching  | `src/server/payments.ts` (367 lines)                                     | `creditedSessionSql()` and five-step match, Dodo webhook verification.                              |

### Notable files

- `src/server/payments.ts` — same matching approach as minilytics, slightly
  earlier.
- `db/migrations/0001_init.sql` — compact schema to compare against minilytics.

### Reject reason

Superseded by minilytics (same lineage, more features, more tests). One test
file. **Reject in favour of minilytics**; keep only as a diff reference.

---

## 9. talivia

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/talivia`
- **Purpose:** Next.js analytics product forked from Umami, extended with
  visitor identity, payment provider connections, payment matching,
  first/last-touch revenue attribution, attribution jobs and audit logs.
- **Stack/language:** Next.js (App Router), TypeScript, React, Prisma,
  PostgreSQL, optional ClickHouse; pnpm.
- **Last commit:** 2026-10-25 — `9b7ad2a fix(app): improve mobile dashboard layout`
- **License:** `LICENSE` — MIT License, Copyright (c) 2025 Talivia
  contributors. **SPDX: MIT. Class A.**
  **Attribution risk:** the file is byte-for-byte Umami's MIT text with the
  copyright line replaced by "Talivia contributors"; there is no Umami
  copyright notice and no README credit. MIT requires retaining the original
  notice. Any reuse must restore `Copyright (c) 2022 Umami Software, Inc.` and
  keep the Talivia notice.
- **Size:** 7.7M.
- **Tests:** 120 test files.
- **Package manager:** pnpm (`pnpm-lock.yaml`), Prisma migrations, Docker.
- **Top-level directories:** `db`, `prisma`, `public`, `scripts`, `src`.
- **Category:** revenue analytics.

### Engine inspection

| Layer             | File path                                                                                                                                                                             | Observation                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracker           | `src/tracker/index.js` (largest tracker file), `src/tracker/index.test.ts`                                                                                                            | Adds visitor/session cookies, cross-domain linker, payment return metadata params (`dodoSessionIdParam`, `lemonSqueezySessionIdParam`, `stripeClientReferenceParam`) and `talivia:collector-context` events.                                                                      |
| Ingestion handler | `src/app/api/send/route.ts` (549 lines), `src/lib/tracking-identity.ts`, `src/lib/collector-cache.ts`, `src/lib/cross-domain-linker.ts`                                               | Zod-validated payload, exactly-one-of website/link/pixel, cache token, visitor identity, linker, payment-return detection, bot/IP checks, visitor-context upserts.                                                                                                                |
| Event schema      | `prisma/schema.prisma`, `db/clickhouse/schema.sql`                                                                                                                                    | Adds `Visitor`, `CustomerIdentity`, `VisitorIdentityLink`, `PaymentProviderConnection`, `Subscription`, `ProviderEvent`, `Payment`, `PaymentDispute`, `Refund`, `PaymentMatch`, `PaymentAttribution`, `AttributionJob`, `AuditEvent` beside Umami's event/session/revenue tables. |
| Aggregation query | `src/queries/prisma/revenueAttribution.ts` (473 lines), `src/queries/prisma/attribution.ts` (465), `src/queries/prisma/revenueJourney.ts`, `src/queries/prisma/revenueDiagnostics.ts` | `getRevenueAttributionReport` groups `PaymentAttribution` by model-specific first/last-touch fields, sums `revenueAmount`, filters payment statuses; `attribution.ts` builds visitor context and identity matching.                                                               |
| Payment webhooks  | `src/lib/dodo-webhook.ts`, `stripe-webhook.ts`, `lemonsqueezy-webhook.ts`, `polar-webhook.ts`, `yolfi-webhook.ts`, `src/lib/payment-detection.ts`                                     | Signature-verified provider webhooks normalized into payments/refunds/disputes, with return-page and customer/email matching.                                                                                                                                                     |

### Notable files

- `src/queries/prisma/revenueAttribution.ts` — exact report shape we need.
- `src/queries/prisma/attribution.ts` — first-touch capture, identity links,
  email hashing and visitor-context upserts.
- `prisma/schema.prisma` — the full revenue-attribution data model
  (`PaymentAttribution`, `PaymentMatch`, `Visitor`, provider connections).
- `src/lib/dodo-webhook.ts` + `src/lib/payment-detection.ts` — Dodo signature
  handling and return-page detection.
- `src/app/api/send/route.ts` — identity capture in the collector.
- `src/queries/prisma/revenueJourney.ts` — per-customer journey and match
  method.

### Reject / caution

None on license fit. Two cautions: (1) fork is 20 days behind Umami upstream
and (2) the copyright replacement must be fixed. This is the primary
implementation reference because it matches the target stack and already
implements the product's core promise.

---

## 10. trckable

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/trckable`
- **Purpose:** Single-binary self-hosted analytics with live view, goals,
  funnels, heatmaps, AI/answer-engine tracking, alerts, payment revenue and
  MCP server.
- **Stack/language:** Go server, SQLite ledger + DuckDB analytics, embedded WAL,
  React dashboard, TypeScript tracker, pnpm monorepo.
- **Last commit:** 2026-11-14 — `e260bfd6 Outage card: the time once in its title (#762)`
- **License:** root `LICENSE` — GNU AGPL v3.0. Root `package.json` declares
  `"license": "AGPL-3.0-only"`. **SPDX: AGPL-3.0-only. Class B.**
  `tracker/LICENSE` and `packages/trckable/LICENSE` are MIT; the WordPress
  integration carries GPL-2.0. Trademarks are excluded from the license
  (`TRADEMARKS.md`).
- **Size:** 27M.
- **Tests:** 810 `_test.go`/test files; 9 CI workflows; benchmark suite.
- **Package manager:** pnpm + Go modules (`server/go.mod`).
- **Top-level directories:** `charts`, `dashboard`, `deploy`, `docs`, `e2e`,
  `examples`, `integrations`, `packages`, `scripts`, `server`, `tracker`.
- **Category:** web analytics + revenue analytics.

### Engine inspection

| Layer             | File path                                                                                                        | Observation                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracker           | `tracker/src/core.ts` (553 lines), `script.ts`, `storage.ts`, `privacy.ts`, `transport.ts`, `bar.ts`, `forms.ts` | MIT. Raw-signal wire format, build-time feature flags, retry queue, consent bar, cookieless mode, Web Vitals, ~2 KB gzip build.              |
| Ingestion handler | `server/internal/ingest/handler.go` (764 lines), `ratelimit.go`, `ua.go`, `crawl.go`, `enrich.go`                | `POST /api/e`; 8 KB body cap, event age limit, per-site/IP filtering, bot/crawler detection, IP used for geo/hash then discarded, WAL write. |
| Event schema      | `server/internal/event/event.go`, `server/internal/store/sqlite/sqlite.go` (1,546 lines)                         | Short-key enriched event struct; SQLite tables for accounts/sites/users/payments/refunds/disputes/links plus DuckDB event store.             |
| Aggregation query | `server/internal/query/charts.go`, `paths.go`, `cohorts.go`, `revenue/revenue.go`                                | Chart/report queries over the event store; revenue subsystem with inbox → ledger → reconciliation and FX.                                    |
| Revenue path      | `server/internal/revenue/revenue.go`, `server/internal/ledger`, `server/internal/payments`                       | Raw webhook fsynced to inbox before processing; idempotent ledger; signature verification; reprocess support.                                |

### Notable files

- `tracker/src/core.ts` — compact privacy-first tracker (MIT) with the best
  build-flag/retry/consent structure in the set.
- `tracker/src/storage.ts`, `tracker/src/privacy.ts` — retry queue and privacy
  gates.
- `server/internal/ingest/handler.go` — IP-discard and bot/crawler handling
  ideas (do not copy Go).
- `server/internal/revenue/revenue.go` — webhook-inbox durability pattern.

### Reject / caution

The server is AGPL-3.0-only and Go/SQLite/DuckDB, so it cannot be copied into a
proprietary Next.js/PostgreSQL SaaS. **Only the MIT tracker is a candidate.**
Trademarks are explicitly not licensed; never reuse the name or logo.

---

## 11. umami

- **Absolute path:** `/home/ariyaman/Dev/fight/efforts/References/umami`
- **Purpose:** Upstream self-hosted web analytics: tracker, Next.js dashboard,
  goals, funnels, retention, session replay, revenue events, links, pixels,
  reports, teams and API keys.
- **Stack/language:** Next.js (App Router), TypeScript, React, Prisma,
  PostgreSQL, optional ClickHouse; pnpm.
- **Last commit:** 2026-11-12 — `b18d5144d Merge pull request #4766 from umami-software/claude/festive-darwin-d0slyh`
- **License:** `LICENSE` — MIT License, Copyright (c) 2022 Umami Software, Inc.
  **SPDX: MIT. Class A.**
- **Size:** 16M.
- **Tests:** 221 test files; 5 CI workflows; Docker/compose/podman.
- **Package manager:** pnpm (`pnpm-lock.yaml`), Prisma migrations, Docker.
- **Top-level directories:** `db`, `docker`, `prisma`, `public`, `scripts`,
  `src`, `tests`.
- **Category:** web analytics (with revenue events).

### Engine inspection

| Layer             | File path                                                                                                                              | Observation                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Tracker           | `src/tracker/index.ts`, `src/tracker/errors.ts`, `rollup.tracker.config.js`                                                            | Typed tracker API (`track`, `identify`, `pageview`, `captureException`), data limits (numbers 4 dp, strings 500 chars, 50 properties). |
| Ingestion handler | `src/app/api/send/route.ts` (329 lines), `src/app/api/send/request-schema.ts`, `src/lib/collection-session.ts`                         | Zod schema, bot check (`isbot`), blocked IPs, cache token, session resolution, event + session-data writes, ClickHouse/Prisma switch.  |
| Event schema      | `prisma/schema.prisma`, `db/clickhouse/schema.sql`                                                                                     | `WebsiteEvent`, `EventData`, `SessionData`, `Revenue`; CH `website_event` plus rollups; revenue fields and `revenue` model.            |
| Aggregation query | `src/queries/sql/attribution/getAttribution.ts` (432 lines), `src/queries/sql/breakdown/getBreakdown.ts`, `src/lib/analytics-query.ts` | First-click/last-click attribution SQL with session/event joins; breakdown queries across Prisma and ClickHouse.                       |

### Notable files

- `src/app/api/send/route.ts` + `request-schema.ts` — validated collector to
  compare with Talivia's.
- `src/tracker/index.ts` — clean typed tracker API and limits.
- `src/queries/sql/attribution/getAttribution.ts` — attribution SQL with both
  Prisma and ClickHouse paths.
- `prisma/schema.prisma` — `Revenue` and event/session model baseline.
- `src/lib/collection-session.ts` — session/drift resolution.

### Reject / caution

Nothing on license. It is the upstream of Talivia, so prefer upstream fixes and
take the revenue-specific additions from Talivia. It has no customer/payment
entity model, so it cannot attribute revenue to a paying customer by itself.

---

## Cross-cutting notes

1. **Dual-licensed trees are real:** `trckable/tracker` and
   `openanalytics/apps/tracker` are MIT while their servers are AGPL;
   `Open-Web-Analytics/modules/Base/src/tracker` is BSD-3 while the server is
   GPL-2.0. Copy only from the permissively licensed subtree and keep its
   license file.
2. **Proprietary subtree:** Plausible `extra/` grants no rights. It contains the
   only revenue-metric implementation in that checkout.
3. **Attribution hygiene:** Talivia removed Umami's copyright line. Any Talivia
   code merged into this project must carry both notices.
4. **Branding:** `trckable` (`TRADEMARKS.md`) and `ActivateIQ` names/logos are
   not licensed for reuse. Do not copy UI branding from any reference.
5. **No repo was modified.** All evidence above comes from reads and `git log`.

## Coverage

Every directory currently present under References is documented exactly once
(11 sections above). Nothing was skipped. The largest trees (`analytics`,
`openanalytics`, `trckable`, `umami`) were inspected at the engine boundaries
only; their frontend component trees were not read line by line, which is
irrelevant to the harvest decision.
