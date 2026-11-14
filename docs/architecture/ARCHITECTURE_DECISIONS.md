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
  4. `SALT_ROTATION` defaults to `day` for new deployments (`.env.example`).
  5. A server caller with no session token gets a deterministic 30-minute
     bucket, so server-side events still sessionize.
- **Consequences:**
  - No persistent client identifier. Visitors are daily uniques by default;
    a visitor crossing the rotation boundary or changing network counts again.
  - Visitors behind one NAT with identical user agents collapse into one
    visitor. Documented on the legal page.
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

