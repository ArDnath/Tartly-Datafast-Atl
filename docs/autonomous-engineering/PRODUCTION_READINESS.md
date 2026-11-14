# Production readiness

- **Evaluated:** 2026-11-15
- **Revision:** `7e32b59` plus the docs on this commit
- **Gate evidence:** `/tmp/opencode/gate.log` (local run, 7.1 GB host)
- **Verdict:** **NOT PRODUCTION READY** until the critical items below close.
  The core product runs and is tested; the privacy-retention and billing-proof
  gaps are real and are not hidden behind a green build.

## Gate results

| Area                       | Status  | Evidence                                                                     |
| -------------------------- | ------- | ---------------------------------------------------------------------------- |
| Format, lint, typecheck    | PASS    | `pnpm gate` exit 0                                                           |
| Unit + integration tests   | PASS    | 228 files passed / 1 skipped; 1,130 tests passed / 1 skipped                 |
| Coverage threshold         | PASS    | 68.19% statements, 58.11% branches, 65.6% functions, 68.64% lines            |
| Production build           | PASS    | Next.js build compiled; 78 static pages; postbuild ran                       |
| Deploy script/smoke checks | PASS    | `gate:deploy` in the same run                                                |
| Local ingestion E2E        | PASS    | `pnpm smoke:local`: pageviews 1 / visitors 1 / visits 1                      |
| Cookieless E2E             | PASS    | `POST /api/send` with no tokens created visitor + session; row `/cookieless` |
| Tracker size               | PASS    | 10,335 B raw / 4.20 KB gzip; zero `document.cookie`                          |
| Live provider billing      | BLOCKED | No verified Dodo test checkout/webhook/portal in this environment            |
| Live email                 | BLOCKED | No Resend key/domain                                                         |
| Real browser walkthrough   | BLOCKED | No connected desktop browser; no replay/consent visual pass                  |
| Deployed load test         | BLOCKED | Not run against the VPS                                                      |
| Off-host backup copy       | BLOCKED | Documented, not rehearsed here                                               |
| Legal review               | BLOCKED | Drafts only; not lawyer-reviewed                                             |

## Release-gate detail

### Core product

- Auth, workspace, website creation, snippet, install verification, ingestion,
  aggregation, dashboard filters, acquisition, custom events, conversions, and
  tenant isolation are covered by the suite and previously recorded smoke runs.
- The install verifier is now honest before payment: unpaid workspaces see
  "Events start after checkout" instead of an impossible wait.
- The first run lands on the new site, not the portfolio.
- Revenue attribution is visible on the Revenue page with the channel breakdown
  sorted by revenue. First touch and last touch rows are materialized per
  payment; performance beacons no longer null last touch.
- **FAIL:** no event-level idempotency. A retried client event can be counted
  and billed twice. This is a correctness and metering risk, not a cosmetic one.

### Cookieless and privacy

- PASS: no tracker cookies; session token is tab-scoped; visitor key is a keyed
  rotating hash; raw IP is not stored; retention exists for PostgreSQL.
- PASS: consent gate, GPC, and opt-in DNT.
- **IMPLEMENTED, UNVERIFIED:** a ClickHouse retention helper now deletes the
  payload tables by plan cutoff, a global 365-day TTL migration is checked in,
  and website deletion purges all ClickHouse payload rows. Unit tests cover the
  SQL shape and tenant scoping, but no ClickHouse instance was available here.
  Until it runs on the VPS, do not claim the 90/365-day retention promise.
- **BLOCKED:** privacy policy wording and subprocessor list need legal review.

### Developer experience

- PASS: tracker reference, attributes, custom events, consent, SPA, server-side
  `POST /api/send`, and the replay recorder snippet are documented.
- PASS: one-line install is generated from one source and covered by tests.
- **UNVERIFIED:** no framework guide was run against a real deployed app in this
  session. The guides remain labelled "untested at runtime" where required.

### Commercial

- PASS: two plans, server-side entitlements, usage metering, idempotent webhook
  handlers, subscription lifecycle, upgrade/cancel flows, invoices/portal
  wiring, and test-mode setup script exist and are unit-tested.
- PASS: Pro website limit corrected to 20; session replay is enforceable.
- **BLOCKED:** a real Dodo test checkout, webhook delivery, and customer portal
  need credentials and a human. Not claimed as working.
- **FAIL:** some Pro features (API access, exports, client reporting) still lack
  a central server-side entitlement check.
- **FAIL:** metering uses the UTC calendar month, not the provider subscription
  anniversary; the first partial month can receive a full allowance.

### Security

- PASS: tenant-scoped reads/writes, BOLA tests, webhook signatures, CSRF,
  session handling, rate limits, bot filtering, timestamp bounds.
- PASS: no critical dependency findings in the recorded audit.
- **UNVERIFIED:** ClickHouse retention/deletion as above (code and tests, no
  live ClickHouse run).
- **OPEN:** provider webhook payloads and audit IPs have no retention policy.
- **OPEN:** share links never expire.

### Provenance and design

- PASS: Umami's MIT notice restored; no class-B code copied; `CODE_PROVENANCE.md`
  records each adoption.
- PASS: new screens follow `DESIGN_LANGUAGE.md`; metric definitions use the
  existing KPI card.
- **UNVERIFIED:** visual QA of the new docs section, replay switch, and consent
  states in a real browser.

### Infrastructure

- PASS: production build, migrations, structured logs, health endpoints,
  backup and rollback procedures are documented and scripted.
- **UNVERIFIED:** deployed streaming load test, off-host backup copy, and a live
  restore rehearsal on the current host.

## Required before charging customers

1. Run and verify ClickHouse retention/deletion on the real stack (code and
   tests are in place; the live statement is unverified).
2. Add event idempotency and fix the reservation/write failure window.
3. Add central Pro-feature checks and align metering to the billing period.
4. Run a real Dodo test-mode checkout + webhook + portal journey.
5. Run the browser journey: onboarding → install → first event → revenue page,
   including consent and replay.
6. Obtain legal review of the privacy/cookies/DPA drafts.
