# Architecture decisions

Append-only. Each decision records the context, the choice, the trade-off, and
the evidence. Rejected alternatives are kept so a later session does not
re-litigate them blindly.

## ADR-001 — Cookieless tracker with server-derived visitor identity

- **Date:** 2026-11-14
- **Status:** accepted
- **Context:** The product promises privacy-first analytics and the legal page
  stated that the tracker sets no cookies. The code did the opposite: the
  tracker wrote a 365-day `talivia_visitor_id` cookie and a 30-minute
  `talivia_session_id` cookie. The server rejected events without both tokens
  (`src/features/analytics/server/send/handler.ts`, former
  `Missing visitor or session identity` branch). This was a product-integrity
  and privacy defect, not a missing feature.
- **Decision:**
  1. The tracker sets no cookies (`src/tracker/index.js`).
  2. A random session token is kept in `sessionStorage` under
     `talivia.session` and expires after 30 minutes of inactivity. If storage
     is blocked, the token stays in memory for the page lifetime.
  3. The server derives a visitor token when none is supplied:
     `hash(websiteId, ip, userAgent, getSalt(SALT_ROTATION, createdAt), secret())`.
     Raw IP and user agent are used only for this hash and are not stored.
  4. `SALT_ROTATION` defaults to `month` for new deployments (`.env.example`).
     A daily window resets visitor identity (and first-touch attribution) every
     day, which breaks the product's revenue promise. Daily or weekly rotation
     remains available for privacy-sensitive sites.
  5. A server caller with no session token gets a deterministic 30-minute
     bucket, so server-side events still sessionize.
- **Consequences:**
  - No persistent client identifier. Visitors are unique per rotation window
    (monthly by default); a visitor crossing the boundary or changing network
    counts again. First-touch attribution survives days within the window.
  - Visitors behind one NAT with identical user agents collapse into one
    visitor. Documented on the legal page. A shorter rotation narrows this
    window but resets attribution sooner.
  - Cross-subdomain journeys rely on the signed linker
    (`data-cross-domain-domains`), not a shared cookie domain. The old
    `data-domain` hint is ignored.
  - Payment attribution still works: checkout links carry the tab session ID,
    and the server maps it to the visitor key for the payment window.
- **Rejected:** keeping a first-party cookie and calling it "cookieless"; a
  localStorage visitor ID (persistent client identifier with the same privacy
  problem); fingerprinting beyond the documented keyed hash.
- **Evidence:** tracker unit tests (22), collector handler tests (9), tracker
  build 9,862 bytes raw / 4.0 KB gzip. Legal copy updated 2026-11-14.

## ADR-002 — Outbound and download events are opt-in

- **Date:** 2026-11-14
- **Status:** accepted
- **Context:** The tracker had no automatic outbound-link or file-download
  events. Custom events are billable, so enabling them by default would create
  surprise usage.
- **Decision:** `data-track-outbound="true"` and
  `data-track-downloads="true"` are opt-in. A download wins over an outbound
  classification. A manual `data-talivia-event` takes precedence so one click
  is never counted twice. Configured cross-domain links are not counted as
  outbound.
- **Consequences:** Customers who want these events enable them explicitly.
  The docs state that they count as billable custom events.
- **Evidence:** tracker tests for enabled, default-off, and download cases.

## ADR-003 — Wave 0/1 work runs in the main worktree; one writer per slice

- **Date:** 2026-11-14
- **Status:** accepted
- **Context:** Separate Git worktrees per servant would duplicate
  `node_modules` (multiple GB) and the machine has 7.1 GB RAM.
- **Decision:** Research servants write only to disjoint `docs/` paths in the
  main worktree. Code changes are made by the master in small slices, then
  verified with a worker-capped test run. No parallel `next build` or dev
  server.
- **Consequences:** Simpler merges, lower memory pressure. Review is
  sequential rather than parallel.
- **Evidence:** `docs/autonomous-engineering/PROJECT_STATE.md` resource policy.

## ADR-004 — Pro website limit aligned to the owner specification

- **Date:** 2026-11-14
- **Status:** accepted
- **Context:** `AGENTS.md` fixes Pro at "up to 20" websites, but
  `src/lib/plans.ts` sold 50 and the pricing test asserted 50. The S2 design
  audit flagged the contradiction; the S4 market pass also tested the 20-site
  promise and found it competitive (Plausible $14 = 3 sites, getopen $19 = 5,
  DataFast $19 = 30, Fathom $15 = 50 without attribution).
- **Decision:** `websiteLimit` is 20 for Pro, with the description, code
  comment, and tests updated. No component hardcodes the limit.
- **Consequences:** Existing workspaces above 20 websites would exceed the new
  entitlement only if such workspaces exist; the usage guard is applied to new
  website creation. The change is reversible in one config edit.
- **Evidence:** `src/lib/plans.ts`, `src/lib/plans.test.ts` (9 tests pass).

## ADR-005 — Event idempotency uses a client key and the existing primary key

- **Date:** 2026-11-15
- **Status:** accepted
- **Context:** Retries, duplicate beacons, and edge replay could create a second
  event row and charge a second usage slot. The event table already has a UUID
  primary key, and Postgres is the source of truth for billing and attribution.
- **Decision:** The tracker (and the documented server-side API) sends an
  optional `eventId`. The collector derives the stored primary key as
  `uuid(websiteId, 'client-event', eventId)`. A duplicate insert raises P2002,
  which the collector treats as success and releases the fresh reservation.
  ClickHouse is written only after the PostgreSQL mirror so a duplicate does not
  reach the analytics store.
- **Consequences:** Retry-safe ingestion without a new column, queue, or Redis
  dependency. The key is scoped per website and is not a secret. A secret
  rotation changes the derived key; retries across a rotation are out of scope.
- **Evidence:** `src/features/analytics/server/send/handler.test.ts` (duplicate
  retry releases usage), `src/tracker/index.test.ts` (unique keys).

## ADR-006 — Paid features are checked at the server route boundary

- **Date:** 2026-11-15
- **Status:** accepted
- **Context:** Some Pro capabilities were only hidden in the UI. `planHasFeature`
  existed but had almost no callers.
- **Decision:** `src/lib/feature-access.ts` resolves the website's workspace and
  reads backend entitlements. Journeys, API keys, client-reporting shares, full
  backups, CSV export, and the payment-provider connection count call it before
  doing work. Share-token reads remain authorized by the share itself and
  cannot mint paid features.
- **Consequences:** Every new paid route must call the helper. A server-side
  denial is the authority; hiding a button is not.
- **Evidence:** `src/lib/feature-access.test.ts`; route handlers.

## ADR-007 — Metering follows the provider billing period

- **Date:** 2026-11-15
- **Status:** accepted
- **Context:** Calendar-month counters gave the first partial subscription month
  a full allowance and cut the last one short.
- **Decision:** `getUsagePeriodRangeForWorkspace` reads
  `platform_subscription.currentPeriodStart/End` when the period contains
  `now`. Otherwise it falls back to the UTC calendar month for onboarding and
  legacy rows. The notice job scans every period containing `now`.
- **Consequences:** Usage rows are keyed by the provider anniversary. Existing
  calendar-month rows remain as history; no destructive backfill is performed.
- **Evidence:** `src/lib/usage.test.ts`; usage-notice tests.

## ADR-008 — Operational data has a redaction and deletion window

- **Date:** 2026-11-15
- **Status:** accepted
- **Context:** Provider webhook payloads and audit IPs contain customer and
  payment data and had no retention policy.
- **Decision:** A daily cron redacts webhook payloads and audit IPs after 90
  days, then deletes billing/provider/audit rows after 365 days. The job is
  idempotent `updateMany`/`deleteMany` work with fixed cutoffs.
- **Consequences:** Replays older than a year are not a supported recovery path;
  providers do not reuse event IDs. The retention windows are constants in
  `src/features/system/cron/jobs/data-retention.ts`.
- **Evidence:** `data-retention.test.ts`.

## ADR-009 — Public share links expire after 30 days

- **Date:** 2026-11-15
- **Status:** accepted
- **Context:** A leaked public share slug was valid forever.
- **Decision:** `share.expires_at` is added by migration, existing rows are
  backfilled to now + 30 days, creation sets a 30-day expiry, and the slug
  resolver rejects missing or past expiries.
- **Consequences:** Shared links must be re-created after 30 days. The TTL is one
  constant in `src/lib/share-policy.ts`.
- **Evidence:** migration `20261115010000_share_expiry`,
  `src/queries/prisma/share.test.ts`, `share-policy.test.ts`.
