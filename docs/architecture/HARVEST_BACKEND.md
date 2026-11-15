# Backend harvest — ingestion, storage, aggregation

Status: read-only deep dive, 2026-11-14. No reference file was modified and no
build, test, dev server or database was run. Every path below was read on disk.
Numeric values are code constants, not benchmarks; anything not executed is
marked **UNVERIFIED**.

Scope: the five harvestable references named by the contract (Umami, Talivia,
DataGoat, minilytics, Plausible concept-only) and this repo. `openanalytics` is
cited only as a published design and is AGPL-3.0 **concept-only**. `R/` =
`/home/ariyaman/Dev/fight/efforts/References/`.

## Hop-by-hop map

| Hop                 | Umami (MIT)                                                | Talivia (MIT)                                       | DataGoat (MIT)                                         | minilytics (MIT)                           | Plausible (AGPL, concept)                                                    | This repo                                                                            |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Client payload      | `R/umami/src/tracker/index.ts`                             | `R/talivia/src/tracker/index.js`                    | `R/datagoat/tracker/src/tracker.ts`                    | `R/minilytics/public/js/script.js`         | `R/analytics/tracker/src/track.js`, `web-snippet.js`                         | `src/tracker/index.js:286-298,586-619`                                               |
| Collector endpoint  | `R/umami/src/app/api/send/route.ts:25`                     | `R/talivia/src/app/api/send/route.ts:81`            | `R/datagoat/src/ingest/handler.ts:86-97`               | `R/minilytics/src/worker/collect.ts:49-80` | `R/analytics/lib/plausible_web/controllers/api/external_controller.ex:12-30` | `src/app/api/send/route.ts` → `src/features/analytics/server/send/handler.ts:93-104` |
| Validation          | `R/umami/src/app/api/send/request-schema.ts:8-80`          | `R/talivia/src/app/api/send/route.ts:37-79`         | `R/datagoat/src/ingest/body.ts:12-60`, `events.ts`     | `R/minilytics/src/worker/collect.ts:52-60` | `R/analytics/lib/plausible/ingestion/request.ex:29,180-200,268`              | `handler.ts:48-91`; `src/lib/schema.ts:90`                                           |
| Site / origin       | `route.ts:78-83` (no origin check)                         | `route.ts:80-130` (website lookup; no origin check) | `handler.ts:100-106` + `hostnames.ts`                  | `collect.ts:44-48,76`                      | `request.ex` `map_domains` + `site/gate_keeper.ex`                           | `handler.ts:142-168,180-193`; `analytics/lib/tracker-origin.ts:48-74`                |
| Bot filter          | `route.ts:97` (`isbot`)                                    | `route.ts:143`                                      | `handler.ts:110-122` + `bots.ts`                       | `collect.ts:62` + `lib/ua.ts`              | `ingestion/event.ex:260-270`                                                 | `handler.ts:196` (`isbot`)                                                           |
| Normalization       | `route.ts:150-205`                                         | `route.ts:240-290`                                  | `handler.ts:168-175` + `enrich.ts`                     | `collect.ts:130-220`                       | `event.ex:280-400`                                                           | `handler.ts:374-493`                                                                 |
| Dedup / idempotency | cache token only; no event id                              | none for pageviews; provider-event unique keys      | `INSERT OR IGNORE`, payment unique keys                | `INSERT OR IGNORE`; payment claim keys     | none for events; drop-reason gates                                           | none for events; `(website,provider,transaction)` keys; usage reservation            |
| Queue / buffer      | none, await writes                                         | none, await writes                                  | one `db.batch()` in `waitUntil` (`handler.ts:174-185`) | await D1 writes                            | `WriteBuffer` GenServer (`ingestion/write_buffer.ex:51,65`)                  | Kafka producer (`src/lib/kafka.ts`) or direct CH; no PG buffer                       |
| Persistence         | Prisma `prisma/schema.prisma` + `db/clickhouse/schema.sql` | Prisma PG + optional CH                             | D1 (`migrations/0001_init.sql`)                        | D1                                         | ClickHouse `events_v2` (`priv/.../create-events-v2.sql.eex`)                 | `saveEvent.ts:72-80` writes PG mirror **and** CH                                     |
| Aggregation         | `queries/sql/attribution/getAttribution.ts`                | `queries/prisma/revenueAttribution.ts`              | `query/jobs/rollups.ts`, `query/revenue.ts`            | `worker/stats.ts`                          | `stats/sql/query_builder.ex`                                                 | `revenueAttribution.ts`, `queries/sql/*`, CH MV `website_event_stats_hourly`         |
| Query API           | `app/api/websites/[websiteId]/*`                           | same                                                | `src/api/v1/*`                                         | `worker/stats.ts` routes                   | `stats_controller.ex`                                                        | `server/[websiteId]/*/handler.ts` + `canViewWebsite`                                 |

## Reference deep dives

### Umami — MIT, class A

- **Identity/dedup/metering + stores:** `x-umami-cache` JWT carries
  `websiteId`, `sessionId`, `visitId`; `resolveIdentifiedSession`
  (`src/lib/collection-session.ts`) reuses the anonymous session after
  `identify` only when the IP/UA fingerprint and claim hash still match. No
  event-level dedup and no plan metering in OSS; the cloud gateway is external.
  Query modules have Prisma and ClickHouse branches selected by `runQuery`;
  `website_event`, `event_data`, `session_data`, `session` and `revenue` exist
  in both schemas.
- **Indexes/retention + failure/lesson:** `prisma/schema.prisma` gives
  `WebsiteEvent` 14 secondary indexes and `Session` 13, inherited by Talivia and
  this fork. No data-retention job was found; "retention" in the code is an
  analysis report, not a purge. The request awaits `saveEvent`, so a CH failure
  fails the request; there is no queue. The cache token removes the website
  lookup and session insert on repeat hits; this repo already uses it
  (`handler.ts:151-155,289-291`), so keep it.

### Talivia — MIT, class A

- **Identity/dedup/metering + stores:** `tracking-identity.ts` derives
  visitor/session ids from `hash(websiteId, token)`; `attribution.ts` captures
  first touch once (`getFirstTouchUpdate`) and links customer identities; no
  pageview dedup and no usage metering in this checkout. `saveEvent` mirrors
  every event into PG for attribution and writes CH when configured;
  attribution/payment tables are PG-only.
- **Indexes/retention + failure/lesson:** same 13/14 index set as Umami, plus
  the revenue-attribution models; `PaymentAttribution` carries per-model touch
  snapshots, and no retention job exists. Identity upserts and the event write
  are synchronous before the response; a CH failure leaves the PG mirror
  committed (non-atomic). Per-payment attribution is materialised at write time
  (two rows per payment), so report cost scales with payments, not events; this
  repo copied that correctly (`payment.ts:958-990`).

### DataGoat — MIT, class A

- **Identity/dedup/metering:** `identity.ts` implements cookie, cookieless and
  consent modes; server id = `HMAC(daily salt, site|ip|ua)` shaped as UUID; no raw
  IP/UA stored. `write.ts` uses only `INSERT OR IGNORE` and unique keys.
- **Stores, indexes, retention:** D1 only (SQLite), so the SQL is portable but
  the runtime is not; no Postgres or CH implementation. Deliberately few indexes:
  `sessions_time`, `sessions_visitor`, `events_time`, partial payment indexes
  (`migrations/0001_init.sql:297-353`). Retention keeps sessions/visitors/payments
  and prunes only events older than `retention_days`, at most 2,000 rows per run
  (`query/jobs/retention.ts:2-13`).
- **Failure/backpressure + lesson:** one `db.batch()` inside `waitUntil`; the
  response does not wait for storage. Daily rollups write only changed rows
  (`query/jobs/rollups.ts:30-95`). Bound writes per hit (3–6 rows) and per job
  (2,000 rows), and roll up before pruning. This repo has 27 indexes across the
  two hot tables and no rollup, so the same event volume costs far more writes.

### minilytics — MIT, class A

- **Identity/dedup/metering:** first-party cookies `ml_vid`/`ml_sid`, 30-minute
  session, owner-visit suppression; hosted-plan gating in `billing.ts`, but no
  event-count metering in the collector; `INSERT OR IGNORE`.
- **Stores, indexes, retention:** D1 only, so there is no CH path. The schema is
  compact (`visitors/sessions/events/payments`); `payment_claims` supports
  return-page matching; no retention job was found in the worker or migrations
  read.
- **Failure/backpressure + lesson:** await D1 write, 202 response; no queue.
  Payment matching is five bounded lookups that run only on a payment
  (`payments.ts:44-96`), never in the collector. `creditedSessionSql()`
  (`payments.ts:29-32`) credits the last **non-direct** visit: order by
  `channel != 'Direct' DESC, started_at DESC`.

### Plausible — AGPL-3.0, class B, concept only

- **Identity/dedup/metering + stores:** one event per request; `Request.build`
  validates and derives session/acquisition; no event-id dedup; spam/bot/
  gatekeeper drops are explicit (`event.ex:56-80,260-270`). Revenue metrics are
  enterprise-only. PostgreSQL is the control plane; ClickHouse `events_v2` holds
  events (`create-events-v2.sql.eex:1-40`).
- **Indexes/retention:** `ORDER BY (site_id, toDate(timestamp), name, user_id,
  timestamp)`, monthly partitions; retention is plan metadata, not a TTL in the
  schema.
- **Failure/backpressure + lesson:** `WriteBuffer` holds rows and flushes at
  100,000 bytes or 5,000 ms, one RowBinary insert per flush
  (`runtime.exs:132-145`, `write_buffer.ex:51-83`). Batch CH inserts; one HTTP
  row per insert is the part-count failure mode. Do not copy AGPL code or the
  proprietary `extra/` tree.

### Existing app

- **Identity/dedup/metering:** hashed visitor/session tokens (`tracking-identity.ts`),
  cache token, cross-domain linker, payment-return detection, and a plan-driven
  event-allowance meter that no reference implements end-to-end
  (`src/lib/usage.ts:133-184` reserve, `:214-332` replay). No pageview dedup.
  Usage counts accepted events, so a retried request can double-bill an event
  and double-count a pageview.
- **Stores, indexes, retention:** PG is the source for visitors, sessions,
  payments, attribution, usage and billing; CH is the analytics store when
  `CLICKHOUSE_URL` is set (`src/lib/db.ts:19-29`). `saveEvent.ts:72-80` still
  mirrors every event into PG even with CH on. `website_event` has 14 indexes and
  `session` 13 (`prisma/schema.prisma:346-389,507-563`). Retention
  (`analytics-retention.ts`) and website deletion (`queries/prisma/website.ts:223-407`)
  are PostgreSQL-only; CH has no TTL and is never purged.
  `db/clickhouse/migrations/11_*` drops and recreates `website_event`/replay, so
  it is destructive on an upgrade.
- **Failure/backpressure + lesson:** the collector awaits up to ~8 PG statements
  plus the CH write. `Promise.all` makes the dual write non-atomic. Kafka failure
  falls back to a synchronous CH insert (`saveEvent.ts:289-295`); the consumer is
  at-least-once and explicitly accepts duplicates (no dedup token). With CH
  enabled, cost still scales with PostgreSQL writes because of the mirror and
  the per-event config/entitlement reads. That is the margin problem for a
  $7.99 plan, not ClickHouse storage itself.

## Decision table

| Capability                                                                     | Best source                                                       | License class | Adopt / reimplement / reject | Why                                                                                                              | Target file                                                                                                | Acceptance test                                                                                         |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Collector payload bounds (8 KB body, data depth, revenue range, formula guard) | Umami `request-schema.ts:8-80`, minilytics `collect.ts:52`        | A             | **Reimplement**              | `data` is `z.record(z.string(), z.any())` with no depth/size bound; 1 MB body vs 8 KB in DataGoat and minilytics | `send/handler.ts:48-91`, `src/lib/schema.ts:90`                                                            | 9 KB, depth > 32, `revenue >= 1e14` → 400/413, zero rows, no usage increment                            |
| Per-site and per-IP limiter, connection-derived IP                             | DataGoat `handler.ts:65-70,94-97`                                 | A             | **Reimplement**              | `payload.ip` overrides headers (`detect.ts:128-131`) and is hashed for the limiter; spoofing bypasses it         | `send/handler.ts:171,205-218`, `lib/rate-limit.ts`                                                         | Different `payload.ip` per request still hits the real-IP limit; per-site limit trips independently     |
| Event idempotency token                                                        | openanalytics `0001_events_raw.sql` (concept)                     | B             | **Reimplement**              | Only reference with durable dedup; current Kafka consumer duplicates on crash                                    | `scripts/kafka-clickhouse-consumer.mjs:192`, `db/clickhouse/migrations/`                                   | Replaying one Kafka batch changes no `count()`                                                          |
| Daily rollups + watermark                                                      | DataGoat `query/jobs/rollups.ts:30-95`                            | A             | **Reimplement (PG or CH)**   | Current dashboards re-scan raw events for 90/365 days; no rollup in PG                                           | new cron job under `src/features/system/cron/jobs/`, CH migration                                          | Re-run writes nothing; dashboard > 30 days reads rollups, not raw                                       |
| Last non-direct touch model                                                    | minilytics `payments.ts:29-32`; DataGoat `lib/sites.ts:9`         | A             | **Reimplement**              | Direct return visits currently steal last-touch credit; no model exists                                          | `payments/server/queries/payment.ts:808,914-928`, `revenueAttribution.ts:70-90`                            | Paid → direct → purchase: `last_non_direct` = paid source, first touch unchanged                        |
| Ignore beacon events for touch snapshots                                       | This finding (Umami has no equivalent)                            | A             | **Reimplement**              | Performance events carry no UTM/referrer; a beacon can null last touch                                           | `payment.ts:914-928`                                                                                       | Pageview + performance beacon + payment → last touch is the pageview source                             |
| CH retention + deletion parity                                                 | DataGoat `query/jobs/retention.ts`; repo `analytics-retention.ts` | A             | **Reimplement**              | CH has no TTL; retention and `deleteWebsite` never touch CH; plan retention is unenforced                        | `src/features/system/cron/jobs/analytics-retention.ts`, `queries/prisma/website.ts:365-407`, CH migrations | Starter 200-day row pruned in CH; deleted site has zero rows in all 5 CH tables; second run no-op       |
| Single authoritative write (no PG mirror when CH on)                           | Plausible `write_buffer.ex`; DataGoat `write.ts`                  | A / B concept | **Reimplement**              | `Promise.all` dual write is non-atomic and doubles Neon writes                                                   | `saveEvent.ts:72-80`, `send/handler.ts:444`                                                                | CH failure leaves no PG orphan and no consumed usage; statement count drops (UNVERIFIED until measured) |
| Cache tenant config and entitlements                                           | DataGoat `site-cache.ts`; repo `fetchWebsite`                     | A             | **Reimplement**              | `getWorkspaceEntitlements` is 1 read/event; attribution config is 3 reads/event                                  | `send/handler.ts:247,378`, `lib/entitlements.ts`, `queries/prisma/website.ts:505-544`                      | Warm-cache pageview performs ≤ 5 PG statements; plan/config write invalidates                           |

## Three highest-value backend changes still missing

### 1. Make last-touch revenue trustworthy (revenue impact, highest)

`writePaymentAttributions` selects `lastTouch` with only `websiteId`, `sessionId`
and `createdAt <= payment` (`payment.ts:914-928`). Two failures follow:

1. `resolvePaymentAttributionContext` falls back to `visitor.lastSessionId`
   (`payment.ts:808`), so a direct return visit is the credited session. The
   journey test codifies `lastTouchSource: null` for this case
   (`attribution-journeys.test.ts:217-255`). For a founder asking "which channel
   makes money", direct wins and the paid channel loses.
2. Any event in that session can be the last one. `EVENT_TYPE.performance = 5`
   (`src/lib/constants.ts:109-115`) is written with `urlPath` but no UTM or
   referrer (`handler.ts:543-570`), and the tracker sends it on
   `visibilitychange`/`pagehide` (`src/tracker/index.js:843-845`). A beacon after
   a campaign pageview nulls the source even for `last_touch`.

Fix: add a `last_non_direct` model, select the credited session by
`(isDirect ASC, createdAt DESC)` before the payment, restrict the event query to
`eventType IN (1,2)` with a non-empty acquisition field, and fall back to the
session's first pageview. Store the credited session id on `PaymentAttribution`
and keep the existing `AttributionJob` for recalculation. This is the DataGoat
`last_non_direct_session_id` / minilytics `creditedSessionSql()` pattern,
reimplemented in Prisma — no new infrastructure. Acceptance: fixture with tiktok
pageview → direct visit → checkout pageview → performance beacon → payment.
`first_touch` = tiktok, `last_non_direct` = tiktok, `last_touch` = direct, and
`lastTouchSource` is never null when the session contains one attributed
pageview. Recalculation is idempotent.

### 2. Enforce retention and deletion in ClickHouse (security + cost impact)

`runAnalyticsRetentionJob` and `deleteWebsiteData` use `prisma.client.*` only.
Nothing in `src/features/system` imports ClickHouse. The CH tables have no `TTL`
(`db/clickhouse/schema.sql:1-330`), and `runQuery` sends every analytics read to
CH when `CLICKHOUSE_URL` is set (`src/lib/db.ts:19-29`).
Consequences: a Starter site's 90-day promise (`src/lib/plans.ts:151`) is false
in the store the dashboard reads; a deleted website's events, event data,
replays and aggregates remain forever; CH storage grows without bound.

Fix: in the retention job, after the PostgreSQL transaction, issue tenant-scoped
lightweight deletes for `website_event`, `event_data`, `session_data`,
`session_replay`, `website_revenue` and `website_event_stats_hourly` using the
plan cutoff, batched by month. Add a global `TTL` on the raw CH tables equal to
the longest plan window (365 days) as a safety net. On website/workspace
deletion, purge the same tables by `website_id` and drop the Redis keys. Deleting
raw rows does not retract the AggregatingMergeTree/MV targets, so either delete
from them too or filter reads by the plan cutoff. Acceptance: seed 200-day-old
CH rows for a Starter site, run retention, assert zero rows in the old window
and no change in recent rows; a second run is a no-op. Delete one website and
assert zero rows for its `website_id` in all CH tables while another tenant's
rows are untouched. `SHOW CREATE TABLE` includes the TTL. This closes the
"retention" proof in `docs/PHASES.md`, which currently covers only PostgreSQL.

### 3. Collapse the collector hot path and bound its inputs (cost + security)

One accepted pageview currently performs, statically counted from
`send/handler.ts`: `fetchWebsite` (Redis-cached), `getWorkspaceEntitlements`
(1 PG read, uncached), `reserveEventUsage` (1 write), `ensureVisitorContext`
(1 upsert), `createSession` (1 insert), `upsertVisitorContext` (1 read + 1
write), `getWebsiteAttributionRuntimeConfig` (3 PG reads,
`queries/prisma/website.ts:505-544`), and `saveEvent` (PG insert + CH write in
`Promise.all`). That is roughly 8 PG statements plus one CH write per pageview,
and the PG event insert maintains 14 secondary indexes. The number is static,
not measured; `scripts/load-ingest.mjs` exists but was not run here
(**UNVERIFIED**).

Security gaps in the same path: `getClientInfo` prefers `payload.ip` over the
connection (`detect.ts:128-131`) and that value is what the Redis limiter hashes
(`handler.ts:205-218`), so a public client can bypass the per-IP limit, poison
geo and evade `IGNORE_IP`; there is no per-site limit. `data` is unbounded
(`schema.ts:90`) and the body cap is 1 MB (`request.ts:45`), while DataGoat and
minilytics cap the collector body at 8 KB and Umami bounds depth/revenue.

Fix, in order of effort: ignore `payload.ip` on the public collector (headers
only); add a Redis per-site counter; cap the collector body at 8 KB and port
Umami's data bounds; cache entitlements and attribution runtime config in the
existing Redis with explicit invalidation; when CH is enabled, stop inserting
every event into the 14-index PG table — either keep a narrow mirror without
the dimension indexes or write it from the existing attribution worker. Do not
put a queue in front of the database; Kafka already exists for the CH path.
Acceptance: spoofed `payload.ip` still hits the real-IP and per-site limits; a
9 KB or depth-33 payload writes nothing and consumes no usage; a CH failure
returns 5xx with no PG orphan and no consumed slot; with a warm cache the
collector issues ≤ 5 PG statements per pageview (measure with
`scripts/load-ingest.mjs` before claiming a number); the mirrored event keeps
`(websiteId, sessionId, createdAt)` and `(websiteId, visitorId, createdAt)`
lookups for attribution.

## Notes and non-goals

- No new infrastructure: all fixes use PostgreSQL, ClickHouse, Kafka, Redis and
  the existing cron/worker. Do not port D1 bindings, Plausible/openanalytics
  server code, Plausible `extra/`, or any AGPL subtree; adapt SQL shapes and
  tests, and add the Umami/Talivia/DataGoat/minilytics MIT notices to
  `THIRD_PARTY_NOTICES`.
- The ClickHouse migration `11_tracking_identity_v2.sql` drops `website_event`
  and replay tables. Guard it or squash it into the baseline before any
  production upgrade; it currently runs through `scripts/clickhouse-migrate.mjs`
  on a fresh deployment that has not recorded it.
