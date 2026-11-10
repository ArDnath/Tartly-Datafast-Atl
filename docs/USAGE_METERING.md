# Usage Metering and Plan Enforcement

Status: shipped for Phase 6 (events + replay). Billing periods and notice emails
are still pending Phases 5 and 10.

## Source of truth

`usage_period` in PostgreSQL is the only billable counter. Analytics rows are
never scanned to calculate an invoice. One row exists per workspace per UTC
calendar month, keyed by `(workspace_id, period_start)`.

`src/lib/usage.ts` owns every read and write. Components must not compute
entitlements or limits themselves.

## What counts

| Collection             | Billable? | Notes                                        |
| ---------------------- | --------- | -------------------------------------------- |
| Pageview               | Yes       | Event type 1                                 |
| Custom event           | Yes       | Event type 2                                 |
| Link click             | Yes       | Event type 3, legacy surface                 |
| Pixel event            | Yes       | Event type 4, legacy surface                 |
| Performance beacon     | No        | Event type 5                                 |
| Identify call          | No        | Identity enrichment only                     |
| Rejected request       | No        | Invalid payload, unknown website, blocked IP |
| Bot request            | No        | `isbot` check runs before reservation        |
| Replay chunk           | No        | Replay sessions are metered separately       |
| Duplicate replay chunk | No        | Unique `(usage_period_id, session_id)`       |

The collector reserves one event slot with a single `INSERT ... ON CONFLICT ...
WHERE events_count < hard_limit` statement. Parallel requests therefore cannot
push the counter past the hard limit. A failed event write releases the slot.

## Thresholds and enforcement

| State     | Condition         | Behaviour                                                      |
| --------- | ----------------- | -------------------------------------------------------------- |
| `ok`      | `< 80%`           | Normal ingestion                                               |
| `warning` | `>= 80%`          | In-app notice, ingestion continues                             |
| `grace`   | `>= 100%`         | In-app notice, ingestion continues through the grace allowance |
| `limit`   | `>= 100% + grace` | Billable event and new replay ingestion pause                  |

Grace is **1,000 events** and **100 replay sessions** after the plan
allowance. These are code constants in `src/lib/usage.ts`, not hidden plan
limits. The dashboard, reports, and exports stay available; nothing is deleted
and there is no automatic overage charge.

Replay requires the `session_replay` entitlement (Pro only) in addition to the
per-website `replayEnabled` flag. A session is counted at most once per month;
chunk retries are idempotent.

## Periods

The period is the UTC calendar month. This is deliberately not tied to a
payment-provider billing cycle yet. When platform billing lands (Phase 5),
`period_start` becomes the provider-controlled period boundary. Existing rows
remain valid because they are already keyed by an absolute timestamp.

## API and UI

- `GET /api/workspaces/[workspaceId]/usage` — member-visible snapshot
  (plan, status, period, events, replays, website/member counts).
- `/app/settings/billing` — plan, renewal date, usage bars, remaining
  allowance, limits, and upgrade path.
- App shell banner — 80%/100%/paused notice with a link to the usage page.

## Not built yet

- Email notices at 80% and 100% (Phase 10 transactional email).
- Provider-driven subscription periods and proration (Phase 5).
- A live parallel-ingestion test against PostgreSQL. The atomic statement and
  unit tests are in place; CI runs tests before migrations, so a database
  concurrency test needs a separate job.
- Owner approval of the proposed event, retention, replay, and member limits.

## Free trial

A workspace with no active paid subscription is inside its **7-day free trial**
when less than 7 days have passed since `workspace.created_at`. The trial is
capped at **2,000 billable events** and **1 website**
(`FREE_TRIAL_DAYS`, `FREE_TRIAL_EVENTS`, `FREE_TRIAL_WEBSITES` in
`src/lib/plans.ts`). The event counter is stored atomically in
`workspace.setup_events_count` and does not reset:

- replay is disabled;
- the event limit is the trial allowance, not the Starter 100,000;
- after 7 days or 2,000 accepted events, whichever comes first, billable
  ingestion pauses;
- at the trial cap the collector returns
  `{ ok: false, reason: "trial_limit_reached" }`; after the trial it returns
  `{ ok: false, reason: "subscription_required" }`;
- the usage screen labels the meter "Free trial events";
- usage-limit emails are skipped for trial-only workspaces to avoid claiming a
  paid plan allowance.

A provider-confirmed Stripe/Dodo subscription flips `active` to true and the
normal plan allowance takes over. Checkout requests a 7-day provider trial
(`trial_period_days`). A deleted or suspended workspace returns `403` before
any session or event write.
