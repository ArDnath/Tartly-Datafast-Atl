# Reference quality scores and harvest shortlist

Date: 2026-11-14. Read-only assessment. Companion to
`docs/market-intelligence/REFERENCE_INVENTORY.md`.

## Rubric

Each axis is scored 1–5. Higher is better.

| Axis                              | 1                                 | 3                               | 5                                                           |
| --------------------------------- | --------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Production maturity               | demo/single commit                | active but pre-release or small | released, CI, long history                                  |
| Correctness signals               | no tests, mock data               | some tests                      | broad tests, migrations, invariants                         |
| Security posture                  | no auth boundaries                | basic validation/authz          | central authz, rate limits, signature checks, audited paths |
| Performance / scalability         | no scalable design                | acceptable for small scale      | explicit cost/scale design, rollups, bounded writes         |
| Maintainability                   | generated or tangled code         | readable but uneven             | modular, documented, tested                                 |
| Install simplicity                | multi-service, specialist runtime | moderate                        | one process/one service, standard runtime                   |
| License fit                       | C (unclear), proxied as 1         | B = 2                           | A = 5                                                       |
| Stack fit (Next.js/TS/PostgreSQL) | other language/stack              | adjacent                        | exact stack                                                 |

License fit follows the contract: **A = 5, B = 2**; class C is scored 1 because
no rights are verified. Total is out of 40 and is a triage aid, not a verdict:
a high total with the wrong stack or license does not make a repo harvestable.

## Score table

| Repo                          | Maturity | Correctness | Security | Performance | Maintainability | Install | License | Stack fit | **Total** |
| ----------------------------- | :------: | :---------: | :------: | :---------: | :-------------: | :-----: | :-----: | :-------: | :-------: |
| `umami`                       |    5     |      4      |    4     |      4      |        4        |    3    |    5    |     5     |  **34**   |
| `talivia`                     |    4     |      4      |    4     |      4      |        4        |    3    |    5    |     5     |  **33**   |
| `trckable` (server + tracker) |    5     |      5      |    5     |      5      |        5        |    4    |    2    |     1     |  **32**   |
| `datagoat`                    |    3     |      4      |    4     |      5      |        4        |    4    |    5    |     2     |  **31**   |
| `analytics` (Plausible)       |    5     |      5      |    5     |      5      |        4        |    2    |    2    |     1     |  **29**   |
| `openanalytics`               |    4     |      5      |    5     |      4      |        4        |    2    |    2    |     3     |  **29**   |
| `minilytics`                  |    2     |      2      |    3     |      4      |        3        |    4    |    5    |     3     |  **26**   |
| `analytics.js`                |    3     |      3      |    2     |      3      |        2        |    4    |    5    |     3     |  **25**   |
| `pixelmoth`                   |    2     |      1      |    3     |      4      |        3        |    4    |    5    |     3     |  **25**   |
| `Open-Web-Analytics`          |    3     |      3      |    2     |      2      |        2        |    2    |    2    |     1     |  **17**   |
| `ActivateIQ`                  |    1     |      1      |    1     |      1      |        2        |    3    |    1    |     2     |  **12**   |

## Why the scores

### umami — 34/40

Mature upstream (5 CI workflows, 221 test files, Docker, frequent releases),
MIT, and the exact Next.js/TypeScript/Prisma/PostgreSQL stack. The collector is
small but hardened (Zod schema, bot and IP checks, cache token). It loses a
point on correctness only because key collector paths still rely on integration
behaviour rather than exhaustive unit coverage, and a point on install because a
production install needs PostgreSQL plus optional ClickHouse.

### talivia — 33/40

Same stack as umami, plus the only complete revenue-attribution model in the
set: visitors, identities, provider connections, subscriptions, payments,
refunds, disputes, matches and attribution rows. 120 tests, 2 CI workflows,
Docker. It is slightly behind upstream, has no public release process and its
LICENSE dropped Umami's copyright notice, so it scores 4 rather than 5 on
maturity and maintainability. Feature fit is the best of any reference.

### trckable — 32/40

Highest engineering quality in the set: 810 tests, 9 CI workflows, benchmarks,
single binary, explicit privacy and durability design. It scores 5 across
maturity, correctness, security, performance and maintainability. It loses the
harvest argument on license and stack: the server is AGPL-3.0-only and written
in Go with SQLite/DuckDB. Score the tracker subtree separately (MIT, stack 4),
not the repository as a whole.

### datagoat — 31/40

Excellent cost-aware design: D1 write budget, idempotent daily rollups, revenue
joins by attribution model, 117 tests, MIT. It is pre-release (`0.1.0`) with
only 2 CI workflows, and it is Cloudflare-specific rather than
Next.js/PostgreSQL. The SQL patterns are portable; the runtime is not.

### analytics (Plausible) — 29/40

Technically the most mature analytics engine here (15 workflows, ClickHouse
ingest, six years of migrations, 77 tests). License and stack are disqualifying
for code reuse: AGPL-3.0 plus a proprietary `extra/` tree, Elixir/ClickHouse.
Revenue metrics are enterprise-only. Keep as an architecture reference.

### openanalytics — 29/40

Best correctness and security signals after trckable (259 tests, contracts,
idempotency, revenue object versioning). AGPL-3.0-only and a five-service
architecture (collector, query gateway, realtime, worker, web) with ClickHouse
and Redis. Install simplicity and stack fit are poor for a modular monolith.
Read the contracts and ingest design; do not copy.

### minilytics — 26/40

Small and readable, MIT, and its `src/worker/payments.ts` contains the clearest
five-step payment-matching implementation in the set (metadata → return page →
customer → email → timing) plus last-non-direct credit. It has only 2 test files
and no CI, so maturity and correctness are low. Harvest the payment matching,
not the whole product.

### analytics.js — 25/40

Historically important and MIT, but unmaintained since 2021. It is a browser
SDK with no collector, no event store and no aggregation; the repository is
mostly a generated 20k-line bundle. Only its message envelope
(`identify`/`track`/`page`) is worth reading.

### pixelmoth — 25/40

Same lineage and design as minilytics but earlier: one test file, fewer
features. MIT and easy to install, but redundant. Reject in favour of
minilytics.

### Open-Web-Analytics — 17/40

Long-lived and tested (304 test files) but GPL-2.0, PHP/MySQL, a legacy queue
and a monolithic 4.2k-line tracker. Only the BSD-3 tracker subtree is
license-compatible, and it is not better than trckable's MIT tracker. Reject.

### ActivateIQ — 12/40

Single-commit React demo with mock data, no backend, no tests, and no LICENSE
file (class C). Reject entirely; do not copy UI or brand.

## Top 5 harvest candidates

Ranked by usable value for Tartly (revenue attribution, Next.js/TypeScript/
PostgreSQL, MIT-compatible), not by raw score.

### 1. Talivia — revenue attribution and payment lifecycle (MIT)

Why: exact stack and the only end-to-end model that links visitor → identity →
payment → attributed revenue. This is the primary source for the product's core
promise.

| Exact file                                                    | Capability it provides                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `References/talivia/src/queries/prisma/revenueAttribution.ts` | Revenue report grouped by first/last-touch source, campaign, landing page and referrer, with currency and payment counts.                                                                                                                    |
| `References/talivia/src/queries/prisma/attribution.ts`        | First-touch capture, visitor-context upserts, email hashing, customer identity links and payment-detection events.                                                                                                                           |
| `References/talivia/prisma/schema.prisma`                     | Full model: `Visitor`, `CustomerIdentity`, `VisitorIdentityLink`, `PaymentProviderConnection`, `Subscription`, `ProviderEvent`, `Payment`, `PaymentDispute`, `Refund`, `PaymentMatch`, `PaymentAttribution`, `AttributionJob`, `AuditEvent`. |
| `References/talivia/src/queries/prisma/revenueJourney.ts`     | Per-customer journey: source, amount, time to convert, match method.                                                                                                                                                                         |
| `References/talivia/src/lib/dodo-webhook.ts`                  | Dodo analytics-integration webhook verification and normalization (not platform billing).                                                                                                                                                    |
| `References/talivia/src/lib/payment-detection.ts`             | Return-page detection of payment/session ids.                                                                                                                                                                                                |
| `References/talivia/src/app/api/send/route.ts`                | Collector-side visitor/session identity and linker capture.                                                                                                                                                                                  |

License action: restore `Copyright (c) 2022 Umami Software, Inc.` alongside the
Talivia notice before merging any of this code.

### 2. Umami — hardened collector, tracker API and attribution SQL (MIT)

Why: upstream of Talivia, more current, with cleaner collector schema and a
typed tracker. Use it to keep the fork close to upstream and to fix Talivia's
drift.

| Exact file                                                       | Capability it provides                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `References/umami/src/app/api/send/route.ts`                     | Collector: cache token, bot check, blocked IPs, session resolution, event/session writes. |
| `References/umami/src/app/api/send/request-schema.ts`            | Zod payload limits, formula-injection defence, revenue bounds.                            |
| `References/umami/src/tracker/index.ts`                          | Typed tracker API and data limits.                                                        |
| `References/umami/src/queries/sql/attribution/getAttribution.ts` | First-click/last-click attribution SQL with Prisma and ClickHouse paths.                  |
| `References/umami/prisma/schema.prisma`                          | `WebsiteEvent`, `EventData`, `SessionData`, `Revenue` baseline.                           |
| `References/umami/src/lib/collection-session.ts`                 | Identified-session resolution and drift handling.                                         |

### 3. DataGoat — rollups and revenue joins (MIT)

Why: the most transferable cost-control design. Its SQL is SQLite-flavoured but
the shapes map directly to PostgreSQL (`INSERT … ON CONFLICT … DO UPDATE`),
which matters for Neon cost and query latency.

| Exact file                                                      | Capability it provides                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `References/datagoat/src/query/jobs/rollups.ts`                 | Idempotent daily rollups for visitors, pageviews, dimensions, goals and revenue; writes nothing when a day is unchanged. |
| `References/datagoat/src/query/revenue.ts`                      | Attribution-aware payment joins for first-touch, last-touch and last-non-direct models.                                  |
| `References/datagoat/src/ingest/handler.ts`                     | Collector ordering, per-site/IP rate limits, hostname checks, single batched write.                                      |
| `References/datagoat/migrations/0001_init.sql`                  | Compact sites/visitors/sessions/events/payments schema with attribution model on the site.                               |
| `References/datagoat/migrations/0200_query_rollups.sql`         | Rollup watermark and partial indexes that keep the write budget bounded.                                                 |
| `References/datagoat/migrations/0300_revenue_subscriptions.sql` | Subscription lifecycle, renewal/refund/dispute reason model.                                                             |

Caution: pre-release; adapt the SQL, do not copy the Cloudflare D1 runtime.

### 4. Minilytics — payment matching heuristics (MIT)

Why: the clearest implementation of the matching ladder that Tartly needs when
a payment has no explicit visitor id. Small enough to port and test quickly.

| Exact file                                                   | Capability it provides                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `References/minilytics/src/worker/payments.ts`               | Five-step match: metadata → return page → customer → email → timing; `creditedSessionSql()` gives credit to the last non-direct visit. |
| `References/minilytics/migrations/0003_payment_matching.sql` | `payment_claims` table for return-page claims and `matched_by`/`subscription_id` columns.                                              |
| `References/minilytics/src/worker/collect.ts`                | Compact collector with hostname and owner-visit guards.                                                                                |
| `References/minilytics/src/worker/stats.ts`                  | Simple revenue/visitor breakdown SQL for a small dashboard.                                                                            |

Caution: 2 test files, no CI. Treat as a design source and write our own tests.

### 5. Trckable tracker subtree only — privacy-first compact tracker (MIT)

Why: the best MIT-licensed tracker architecture in the set: build-time feature
flags, bounded payloads, retry queue, consent gate, cookieless mode and
Core Web Vitals. The server is **not** a candidate.

| Exact file                                     | Capability it provides                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `References/trckable/tracker/src/core.ts`      | Runtime wiring, build flags, queueing, privacy gate, SPA route handling. |
| `References/trckable/tracker/src/storage.ts`   | Retry/queue storage abstraction.                                         |
| `References/trckable/tracker/src/privacy.ts`   | Consent and data-minimisation rules.                                     |
| `References/trckable/tracker/src/transport.ts` | `sendBeacon`/fetch transport with payload limits.                        |
| `References/trckable/tracker/LICENSE`          | MIT notice to retain.                                                    |

Caution: API and naming are trckable-specific; re-brand under Tartly's own
tracker, and never reuse the trckable name/logo (`TRADEMARKS.md`).

## Deliberately excluded from the shortlist

- **Plausible (`analytics`)** — AGPL-3.0 plus proprietary `extra/`; Elixir and
  ClickHouse. Architecture reference only. Do not copy the tracker, ingestion
  pipeline or enterprise revenue code.
- **openanalytics** — AGPL-3.0-only server; multi-service architecture. Its
  contracts and revenue-object versioning are worth reading, but copying them
  would contaminate the proprietary codebase.
- **Open-Web-Analytics** — GPL-2.0 server; PHP legacy. Its BSD-3 tracker is
  legally usable but inferior to trckable's and not worth the integration cost.
- **pixelmoth** — superseded by minilytics.
- **analytics.js** — unmaintained, client-only, no collector or schema.
- **ActivateIQ** — no license file, no backend, mock data.

## Porting guidance

1. Port behaviour and tests, not files: the target is PostgreSQL/Prisma, and
   only Talivia/Umami use it directly.
2. Keep the MIT notices of Umami, Talivia, DataGoat, Minilytics and trckable's
   tracker in a `THIRD_PARTY_NOTICES` file when code is adapted.
3. Never copy AGPL/GPL server code (Plausible, openanalytics, OWA, trckable
   server) into the product.
4. Re-run the attribution math against fixtures before trusting any ported
   query; test counts in this document are static file counts, not executed
   suites.
