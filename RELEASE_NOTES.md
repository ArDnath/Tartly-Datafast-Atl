# Release notes — 2026-11-16

## Privacy and tracking

- The tracker now sets **no cookies**. A random session token is kept only in
  the current tab and expires after 30 minutes of inactivity.
- Visitor uniqueness uses a keyed, rotating hash on the server. Raw IP addresses
  are not stored. The default rotation is monthly so returning buyers keep their
  first-touch attribution; day and week are available for stricter privacy.
- Consent-aware mode: `data-consent="required"` sends nothing until your consent
  tool calls `window.talivia.setConsent(true)` or emits a `talivia:consent`
  event. Global Privacy Control is honored automatically.
- Outbound-link and file-download events are available and opt-in, because they
  count as billable custom events.

## Install and onboarding

- `/docs/install` has a new Tracker reference: every script attribute, custom
  events, SPA behaviour, consent, a server-side `POST /api/send` example, and the
  session-replay recorder snippet.
- The first-run page now says **"Snippet ready. Events start after checkout"**
  for an unpaid workspace, instead of waiting forever for an event the collector
  cannot accept.
- Finishing setup lands on your new website's dashboard, not the portfolio.
- A site card with no data says "No visits yet" instead of drawing a flat line.

## Revenue analytics

- The Revenue page opens with the channel breakdown sorted by **revenue**.
- Overview KPIs now explain themselves: revenue, revenue per visitor, conversion
  rate, visitors, bounce rate, visit duration, and online each have an in-product
  definition.
- Last-touch attribution ignores performance beacons, so a campaign's source is
  no longer overwritten by a visibility event.
- Cross-domain journeys keep the same visitor identity across your configured
  domains.

## Session replay (Pro)

- Session replay can now be enabled per website in settings. It requires an
  active Pro plan, both when enabling and when recording. Inputs are masked by
  default; strict masking and consent are supported.

## Plans

- Starter: $7.99/month, 1 website, 100,000 events, 90-day retention.
- Pro: $14.99/month, up to **20** websites, 1,000,000 events, 365-day retention,
  session replay, advanced attribution, and client-ready reporting.
- No free tier and no free trial.

## Tracking recovery (deployed 2026-11-16)

- **Collector rate limit fixed.** A fresh Redis window rejected the first 1,199
  events with `429` because the comparison was inverted. Normal traffic is
  allowed up to 1,200 events / 60 s per subject.
- **ClickHouse pipeline fixed.** The event store's memory ceiling was raised, the
  Kafka worker dead-letters a poisoned batch instead of blocking the partition,
  and dashboard reads fall back to PostgreSQL if ClickHouse fails.
- **ClickHouse retention TTLs applied live.** Six 365-day TTLs are present in
  `system.tables`; `session_replay` uses `toDateTime(created_at)`.
- **Verified in production.** A real Firefox pageview plus a custom event from
  `https://tartly.in/script.js` produced 2 events / 1 visitor / 1 session in
  ClickHouse and `pageviews 1 / visitors 1 / visits 1` in the signed-in stats
  API. Test rows were removed afterwards.

## Known limitations

- The tenant-scoped retention **job** has not run against seeded old rows yet;
  the global TTLs are applied, but do not advertise the 90/365-day plan promise
  until the job is verified.
- Live payment-provider and email flows require production credentials and have
  not been verified in this release environment.
- Session replay has not been browser-tested in this environment; the recorder
  and ingest path are unit- and smoke-tested.
- The signed-in visual pass and consent/replay browser pass are still open.
- Privacy, cookie, and DPA documents are drafts pending legal review.
- A dead-lettered Kafka batch must be replayed from PostgreSQL or Kafka before
  topic retention expires; no automatic replay tool ships yet.
