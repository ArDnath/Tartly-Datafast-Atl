# Analytics validation — Phase 7

Status: **validated locally on PostgreSQL 2026-11-05**. The ClickHouse path was
not exercised, and no load test was run. This document separates what was
proven from what still needs a human or a production environment.

## How it was proven

- Real database: PostgreSQL 17 in the local Docker service
  (`localhost:5433/talivia_oss`), with all migrations applied.
- Seed: one isolated website, three visitors with four sessions plus one live
  session, and eleven events. The seed includes organic search, paid UTM,
  referral, direct, a custom event, a performance event, and an expired event.
- Assertions: **48** in
  `src/features/analytics/server/queries/phase7-smoke.ts`, run by
  `src/features/analytics/server/queries/phase7-analytics-smoke.test.ts`.
- Cleanup: every seeded website, visitor, session, event, and replay row is
  deleted in a `finally` block. The normal unit suite never touches this
  database.

Command:

```bash
RUN_PHASE7_DB_SMOKE=1 pnpm exec vitest run --config vitest.phase7.config.ts \
  src/features/analytics/server/queries/phase7-analytics-smoke.test.ts
```

## Metric matrix

| Metric                               | Query under test                                  | Seeded expectation                                | Result |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------- | ------ |
| Pageviews                            | `getWebsiteStats`                                 | 7 (custom and performance events excluded)        | pass   |
| Unique visitors                      | `getWebsiteStats`                                 | 3                                                 | pass   |
| Visits / sessions                    | `getWebsiteStats`                                 | 4                                                 | pass   |
| Bounce rate input (bounced sessions) | `getWebsiteStats`                                 | 2 single-page sessions                            | pass   |
| Total visit duration                 | `getWebsiteStats`                                 | 180 s                                             | pass   |
| Pageview time series                 | `getPageviewStats`                                | 7                                                 | pass   |
| Visitor time series                  | `getSessionStats`                                 | 3                                                 | pass   |
| Top pages                            | `getPageviewMetrics('path')`                      | `/` 2, `/pricing` 2, `/signup` 1                  | pass   |
| Landing pages                        | `getPageviewMetrics('entry')`                     | `/` 2, `/pricing` 1                               | pass   |
| Exit pages                           | `getPageviewMetrics('exit')`                      | `/pricing` 2, `/signup` 1                         | pass   |
| Referrers                            | `getPageviewMetrics('referrer')`                  | `google.com` 1, `blog.example.org` 1              | pass   |
| UTM source / campaign                | `getPageviewMetrics('utmSource' / 'utmCampaign')` | `google` 1, `brand` 1                             | pass   |
| Browser                              | `getSessionMetrics('browser')`                    | Chrome 1, Firefox 1, Safari 1                     | pass   |
| Operating system                     | `getSessionMetrics('os')`                         | macOS 1, Windows 1, iOS 1                         | pass   |
| Device                               | `getSessionMetrics('device')`                     | desktop 2, mobile 1                               | pass   |
| Screen                               | `getSessionMetrics('screen')`                     | `1440x900` 1                                      | pass   |
| Country                              | `getSessionMetrics('country')`                    | US 2, DE 1                                        | pass   |
| Language                             | `getSessionMetrics('language')`                   | en 2, de 1                                        | pass   |
| Channels                             | `getChannelMetrics`                               | direct 2, organicSearch 1, referral 1             | pass   |
| Date range                           | `getWebsiteDateRange`                             | starts at the oldest event, includes the latest   | pass   |
| Real-time totals and log             | `getRealtimeData`                                 | at least 1 view/visitor, `/live` event, 1 country | pass   |
| Active visitors                      | `getActiveVisitors`                               | 1 within five minutes                             | pass   |

The unit boundary suite
`src/features/analytics/server/queries/sql/tracking-query-semantics.test.ts`
also checks that visitors are counted by `visitor_id`, not by `session_id`, and
that cohorts, retention, goals, and funnels follow a visitor across sessions.

## Bug found and fixed

The live seed first stored `NULL` for a direct event's `referrer_domain` and
`url_query` (the shape legacy/imported rows can have). `getChannelMetrics`
compared those columns to `''`, so the event was not classified as direct.
The PostgreSQL channel query now uses `coalesce(referrer_domain, '')` and
`coalesce(url_query, '')`, and a unit test pins the null-safe form. The smoke
suite keeps one direct event with `NULL` in those columns to prove it.

No other inherited metric was changed.

## Attribution journeys

`src/features/payments/server/queries/attribution-journeys.test.ts` covers:

- organic discovery then a paid retargeting click (first touch and last touch
  both retained);
- referral landing as the last touch without overwriting the first touch;
- a direct purchase after paid acquisition (credit stays on the first touch);
- a recurring charge inheriting the stored subscription visitor;
- a payment with no visitor or session written as explicitly unattributed.

`src/features/analytics/server/queries/revenueAttribution.test.ts` proves the
report groups by `firstTouchSource` by default and by `lastTouchSource` when
the website config says `last_touch`.

## Replay

- `src/features/analytics/server/record/handler.test.ts` proves Starter
  (`session_replay` absent) is rejected before any usage slot is reserved, an
  inactive/no plan is rejected, a Pro session is metered, an over-limit session
  is never written, a failed write releases the slot, the website switch must
  be on, and legacy websites without a workspace cannot record.
- `src/recorder/privacy.test.ts` proves replay masks all inputs by default,
  strict mode also masks all text, and `data-consent="required"` keeps the
  recorder idle until consent is granted through `window.__taliviaSetConsent`
  or a `talivia:consent` event. An explicit `false` from the host stops
  recording in either mode.
- Raw replay bytes stay in `session_replay` (website-scoped, compressed), not
  in the tenant relational tables. The retention job deletes replay payloads on
  the plan's replay window, or all of them when the plan has no replay feature.

## Retention

`src/features/system/cron/jobs/analytics-retention.ts` runs daily at 03:30 UTC.
It resolves each website's plan from `platform_subscription` then the workspace
mirror, and deletes:

- replays on `replayRetentionDays` (or all replays without a replay plan);
- event data, session data, events, and sessions older than `retentionDays`;
- analytics revenue rows tied to expired sessions;
- optional links from durable payment/subscription/attribution rows to expired
  sessions and events, so the business records survive while the payload goes.

Every mutation carries `websiteId`. `ANALYTICS_RETENTION_DRY_RUN=true` reports
counts without changes. The smoke suite proved on PostgreSQL that a Starter
website lost its 200-day-old event and session, kept the recent events, and
lost its replay payload.

## Not verified

- **ClickHouse:** the fork has no ClickHouse deployment here; only the
  PostgreSQL branch was run.
- **Load and concurrency:** no parallel ingestion or large-data test was run.
- **Browser recorder runtime:** masking and consent are unit-tested as pure
  policy; a real browser session with rrweb was not recorded in this
  environment.
- **Provider webhooks:** live delivery for Stripe, Dodo, Lemon Squeezy, Polar,
  and Yolfi remains unverified. See `docs/PAYMENT_PROVIDER_CAPABILITIES.md`.
- **Retention at scale:** the job deletes per website in one transaction. It
  was proven on a small seeded website, not on a multi-million-row store. Add
  batching before a high-volume launch if lock time becomes a problem.

## Load and concurrency probe (2026-11-06)

`docs/LOAD_TEST.md` records 10,000 accepted events at 50 concurrent clients on
the production build against local PostgreSQL 17: 157 req/s, p50 302 ms, p95 412
ms, p99 480 ms, 0 errors, 10,001 stored rows and a matching usage counter. The
probe found a deleted-workspace session leak; the collector now resolves
entitlements and reserves usage before any session write. This is a single-node
probe, not a sustained soak or a distributed 1M-RPS proof.
