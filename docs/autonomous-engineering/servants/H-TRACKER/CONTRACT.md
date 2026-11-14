# H-TRACKER — Tracker/SDK deep dive (read-only)

## Objective

Compare the tracker and client SDK of every relevant reference with the
existing tracker in `src/tracker/index.js`, and write a harvest note. Do not
change code.

## Owned write scope

- `docs/architecture/HARVEST_TRACKER.md`

## Inputs

- `docs/market-intelligence/REFERENCE_INVENTORY.md`
- `docs/market-intelligence/REFERENCE_QUALITY_SCORES.md`
- `/home/ariyaman/Dev/fight/efforts/References/*` (READ-ONLY)
- `src/tracker/index.js`, `src/tracker/index.test.ts`,
  `src/features/analytics/server/send/handler.ts`

## Required comparison

For Umami, Talivia, trckable (and its MIT tracker subtree), analytics.js,
Open-Web-Analytics, minilytics, pixelmoth:

1. Identity: cookies vs localStorage vs server hash, rotation, consent.
2. Automatic capture: pageviews, SPA, outbound, downloads, scroll, visibility.
3. Transport: fetch, sendBeacon, batching, retry, offline, keepalive.
4. Configuration surface and install ergonomics.
5. Privacy: DNT, opt-out, IP handling, data minimisation.
6. Measured or measurable script size, if recorded.
7. Bugs or weaknesses visible in the code.

Then a per-capability decision table:
`| Capability | Best source | License class | Adopt / reimplement / reject | Why | Target file | Acceptance test |`

Close with the three highest-value tracker changes still missing in this repo,
ranked by customer impact. No code, no tests, no builds.

## Acceptance criteria

Every claim has a reference file path. No license-B code is described as
copyable. The note is short enough to act on (target 150-250 lines).
