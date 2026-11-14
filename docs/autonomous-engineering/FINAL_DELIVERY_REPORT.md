# Final delivery report — 2026-11-15

## Scope actually completed

This session resumed a partially started autonomous buildout. It did not run 40
master iterations or all seven transplant servants. It completed Wave 0
research, two Wave 1 deep dives plus a UX dive, seven code slices, a full
release-gate run, and the release assessment. The remaining work is listed with
owners and blockers, not blurred into a success claim.

## Reference repositories

- **Discovered:** 11 directories in `/home/ariyaman/Dev/fight/efforts/References`.
- **Analyzed:** 11/11 at inventory level; every one has a license class, quality
  score, and exact harvest files in `REFERENCE_INVENTORY.md` and
  `REFERENCE_QUALITY_SCORES.md`.
- **License classes:** 6 A (MIT: analytics.js, datagoat, minilytics, pixelmoth,
  talivia, umami), 4 B (AGPL/GPL: analytics, openanalytics, trckable,
  Open-Web-Analytics), 1 C (ActivateIQ, no LICENSE file; treated as B).
- **License traps found:** Plausible's `extra/` tree grants no rights; Talivia's
  LICENSE replaced Umami's copyright (notice restored); trckable and
  openanalytics have MIT tracker subtrees separate from AGPL servers.
- **No class-B code was copied.** Concepts only, independently implemented.

## Market evidence (labelled)

Full tables and sources are in `docs/market-intelligence/`.

- **Strongest verified paid scale:** Plausible, 22,000+ paying subscribers
  (company-reported, 2026-11-14) and $1M ARR crossed in 2022 (company-reported).
- **Largest community signal:** Umami, 40,141 GitHub stars (GitHub, 2026-11-14).
  Stars are not customers.
- **Only verified revenue figure in the set:** Amplitude FY26 guidance
  $415.8M–$418.2M (third-party aggregator; its IR site returned 403).
- **Attribution niche:** DataFast $9, getopen $9, Talivia $9.99 founding,
  trckable $5 early. Plausible/Fathom explicitly do not link payment webhooks to
  visits. The sub-$15 revenue-attribution band is early-stage and thin.
- **Confidence:** every customer/revenue claim is labelled in
  `LIVE_PRODUCT_RESEARCH.md`; unavailable numbers say Undisclosed.

## Best patterns found, by source

- **Talivia (MIT):** revenue attribution, payment lifecycle, visitor identity
  and cross-domain linker. The app already descends from it; audited, not
  re-ported.
- **Umami (MIT):** collector structure, tracker API, attribution SQL, payload
  bounds. Used as the correctness baseline.
- **DataGoat (MIT):** idempotent rollups, last-non-direct ID, bounded retention
  batches. Concepts adopted where verified; the rollup port is deferred.
- **Minilytics (MIT):** five-step payment matching and last non-direct credit.
  The matching concept is already present; the model is deferred.
- **trckable (AGPL, MIT tracker subtree):** privacy-first tracker ideas only.
  No code copied.
- **Plausible (AGPL, class B):** concept only; its revenue implementation is in a
  no-rights tree and was rejected.

## Ported, reimplemented, rejected

- **Reimplemented independently:** cookieless identity, tab session, consent
  gate, GPC, outbound/download events, SPA navigation coverage, server-side
  event example, metric definitions.
- **Fixed in place:** pre-payment install state, first-site landing, fabricated
  zero chart, cross-domain token width, last-touch beacon pollution, plan limit,
  snippet `data-domain` drift.
- **Ported with attribution:** none. No new class-A code was copied this session.
- **Rejected:** class-B server code, Plausible `extra/`, a third plan/free tier,
  new infrastructure without measured need, a broad foreign-key migration now.

## Code changes landed on `autonomous/saas-buildout`

1. `caa8399` cookieless tracker, consent, outbound/download, docs, Umami notice.
2. `20c3a64` Pro website limit 20.
3. `5bca150` phase evidence + 2-worker test gate.
4. `a019dfa` in-product metric definitions.
5. `8ab513b` timestamp window.
6. `8d6e47e` navigation/GPC/wrapper event fixes, dead `data-domain` removed.
7. `4ce1d00` last-touch ignores performance beacons.
8. `8955423` monthly rotation default, cross-domain token consistency,
   revenue-sorted channel card.
9. `9c6b3ce` session replay switch + docs.
10. `d45ad0c` honest pre-payment verification, first-site landing, no fake chart.
11. `7e32b59` formatting + snippet test.
12. `25cdd55` ClickHouse retention/deletion helper, TTL migration, tests.

## Working features (verified by tests/smoke)

- Cookieless tracker: 28 tests, 10,335 B raw / 4.20 KB gzip.
- Collector: 12 tests, including no-token cookieless events and timestamp
  bounds. Live local probe stored a visitor and session without cookies.
- Consent, GPC, outbound/download, SPA (pushState/replaceState/popstate/
  hashchange/bfcache), wrapper custom events.
- Revenue page with revenue-first channel breakdown; KPI definitions.
- Session replay switch with server-side Pro enforcement; ingest already
  enforces plan + per-session meter.
- Onboarding: honest pre-payment state, welcome overlay, site landing.
- Attribution: first/last touch, payment matching, beacon-safe last touch,
  cross-domain identity.
- Plans: Starter $7.99 / 1 site / 100k events; Pro $14.99 / 20 sites / 1M events;
  no free tier; replay on Pro.

## Privacy safeguards

- No tracker cookies; no persistent client identifier.
- Keyed rotating hash for visitor identity; raw IP not stored.
- Consent gate, GPC, opt-in DNT, session replay masking and consent.
- Tenant-scoped retention job for PostgreSQL; deletion paths scoped by website.
- Legal drafts updated to match implementation; **not lawyer-reviewed**.

## Operating cost

No cost benchmark was run in this session. The model exists in
`docs/PRICING_ECONOMICS.md` but its inputs were not re-measured. Treat the cost
per million events and gross margin as **UNVERIFIED** until X1 runs a synthetic
load and records the host's CPU/disk/egress.

## Tests executed

- `pnpm gate` exit 0 on 2026-11-15:
  - 228 test files passed / 1 skipped.
  - 1,130 tests passed / 1 skipped.
  - Coverage 68.19% statements / 58.11% branches / 65.6% functions / 68.64% lines.
  - Production build compiled; 78 static pages; postbuild ran.
- `pnpm smoke:local` passed on local PostgreSQL.
- Full suite with 2 workers took ~4.6 minutes on the 7.1 GB host.

## Blocked / limited

- ClickHouse retention and deletion: implemented with a plan-cutoff helper, a
  365-day TTL migration, and website-delete purge; unit-tested but not run
  against a live ClickHouse. Needs a VPS/CH run before claiming retention.
- No event-level idempotency; retried events can double count/bill.
- Last-non-direct attribution model: deferred.
- Live Dodo checkout/webhook/portal, Resend delivery, Google consent: external
  credentials/human actions.
- Real browser replay/consent/visual pass: no connected browser.
- Deployed load test, off-host backup copy, restore rehearsal: not run here.
- Legal review: pending.
- Some Pro features lack central enforcement.
- Billing period ≠ provider anniversary; webhook/audit payload retention open.

## Servant outcomes

- **S1 app audit:** complete; found the revenue-UI gap, replay toggle gap, daily
  identity reset, cross-domain truncation, metering leaks. Files written.
- **S2 design language:** complete; 908-line binding guide with exact tokens and
  a consolidation list.
- **S3 reference inventory:** complete; all 11 repos, licenses, scores, top 5.
- **S4 market research:** complete; 24 products, sourced traction and pricing.
- **H-TRACKER:** complete; durable delivery, duration, navigation gaps.
- **H-BACKEND:** complete; last-non-direct, CH retention, hot-path findings.
- **H-UX:** complete; pre-payment verification, first-site landing, plan step.
- **H-INTEGRATE, S5 privacy, T2–T7, X1–X3, R:** not run as separate servants.
  Their critical findings are folded into the readiness report where verified.

## First 30 days to first paying customers

1. Verify ClickHouse retention/deletion on the VPS and add event idempotency
   (week 1).
2. Run a real Dodo test-mode checkout, webhook, portal and cancellation; then a
   live-mode smoke with a $1 internal purchase (week 1–2).
3. Browser-run the full journey on desktop and mobile, including replay and
   consent; fix visual drift against `DESIGN_LANGUAGE.md` (week 2).
4. Measure deployed ingest/dashboard p95 and cost per million events; publish a
   truthful `PRICING_ECONOMICS.md` (week 2).
5. Add central Pro-feature checks and billing-period metering (week 3).
6. Legal review of privacy, cookies, DPA, subprocessors (week 3).
7. Publish the install guides as "tested" only after each is run on a real
   framework app; start with Next.js and plain HTML (week 3–4).
8. Soft-launch to 10 design partners, instrument activation (first event, first
   attributed payment), and iterate on the install step (week 4).

## Final status

**NOT PRODUCTION READY.** The core is built, tested, and far more honest than the
starting state, but live ClickHouse retention, missing event idempotency, and
unverified live billing are release blockers. They are documented with exact
next actions rather than hidden.
