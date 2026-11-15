# Harvest note — tracker and client SDK

Status: read-only, completed 2026-11-14. No reference, tracker, test or build
artefact was modified, and no build, test, dev server or install was run. Sizes
come from `wc -c`/`gzip -c` on files already on disk.

Scope: `References/{umami,talivia,trckable,analytics.js,Open-Web-Analytics,minilytics,pixelmoth}`
(the trckable MIT tracker subtree only), compared with `src/tracker/index.js`
and `src/features/analytics/server/send/handler.ts`.

License classes: **A** permissive (MIT/BSD), **B** copyleft or network
copyleft, **C** unclear. A class-B repository can still contain a class-A
tracker subtree; those are named explicitly, and nothing from a class-B tree is
described as copyable.

## 1. Baseline: what this repo ships today

The tracker was recently changed to be cookieless, so several rows below are
already ahead of every reference except trckable.

| Axis                 | Current state                                                                                                                                                                                                 | Evidence                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity             | No cookies. Random session token in `sessionStorage['talivia.session']`, sliding 30-minute expiry, in-memory fallback when storage is blocked.                                                                | `src/tracker/index.js:66,73,115-161`; tests at `src/tracker/index.test.ts:235-343`                                                                         |
| Visitor key          | Server-derived: keyed hash of website id + IP + user agent + rotating salt; raw IP/UA not stored. Visitor/session rows are UUIDs of that token.                                                               | `src/features/analytics/server/send/handler.ts:314-334`; salt rotation `src/lib/crypto.ts:106-112`; `src/features/analytics/lib/tracking-identity.ts:7-13` |
| Pageviews / SPA      | Initial pageview; `pushState`/`replaceState` hooks only. No `popstate`, `pageshow`/bfcache or `hashchange` handling.                                                                                          | `src/tracker/index.js:307-337,641-650`                                                                                                                     |
| Outbound / downloads | Opt-in (`data-track-outbound`, `data-track-downloads`).                                                                                                                                                       | `src/tracker/index.js:43-44,411-420`                                                                                                                       |
| Element visibility   | `IntersectionObserver` + `MutationObserver`, per-element threshold and delay, once per name per page.                                                                                                         | `src/tracker/index.js:448-578`                                                                                                                             |
| Custom events        | `data-talivia-event` read from the clicked element itself, or from an ancestor only when that ancestor is `a`/`button`.                                                                                       | `src/tracker/index.js:370-388`                                                                                                                             |
| Web Vitals           | Opt-in (`data-performance`): TTFB, FCP, LCP, CLS, INP, duration.                                                                                                                                              | `src/tracker/index.js:695-847`; schema `handler.ts:77-81`                                                                                                  |
| Transport            | One `fetch` per event, `keepalive: true`, JSON, `credentials` configurable. On any failure the catch block is empty: no retry, no queue, no beacon fallback. No client event id and no timestamp on the wire. | `src/tracker/index.js:286-298,590-629`; accepted but unused `timestamp` at `handler.ts:69,223`                                                             |
| Consent              | `data-consent="required"`, `window.talivia.setConsent()`, `talivia:consent` event. Nothing is sent before consent.                                                                                            | `src/tracker/index.js:45,675-691,884-891`; tests `index.test.ts:573-625`                                                                                   |
| Privacy switches     | DNT only when `data-do-not-track="true"`. `localStorage['talivia.disabled']` is read but no shipped code or doc sets it. No Global Privacy Control.                                                           | `src/tracker/index.js:36,582-588,300-303`; docs list no opt-out `src/features/docs/DocsPage.tsx:240-280`                                                   |
| Size                 | `src/tracker/index.js` 26,575 B; checked-in `public/script.js` 10,098 B minified, 4,220 B gzip. No size budget in the build or tests.                                                                         | `rollup.tracker.config.js` (terser only); `src/tracker/index.test.ts`                                                                                      |

Two defects are visible without running anything: granting consent with
`data-auto-track="false"` still sends a pageview (`index.js:678-691`), and the
install guides emit and explain `data-domain` (`install-guides.ts:100,461`)
while the tracker reads only `data-domains` (`index.js:39,587`) — dead
configuration in generated snippets.

## 2. Reference comparison

### Umami — MIT (A) — `References/umami`

- **Identity:** tracker sends no identifier; server hashes IP+UA with a salt,
  optional client `salt`/`distinct-id`, and returns an encrypted cache token
  kept in memory (`src/tracker/index.ts:304-307,351-371`;
  `src/lib/collection-session.ts:96-123`). The design our cookieless rewrite
  follows, minus the client salt option.
- **Capture:** automatic pageview, `data-umami-event` clicks delegated with
  `closest`, Web Vitals, error capture (`src/tracker/index.ts:413-452,536-730,744-759`).
  No outbound, download, scroll or engagement.
- **Transport:** one `fetch` with `keepalive`; no retry, queue or beacon
  (`src/tracker/index.ts:476-495`).
- **Configuration:** attributes with a `window.umamiConfig` fallback, so it runs
  without `document.currentScript` (`src/tracker/index.ts:267-292`), plus an
  `auto-pageview` switch. Ours hard-returns without `currentScript`
  (`src/tracker/index.js:12`) and has no global-config path.
- **Privacy:** DNT only when enabled (`index.ts:309,456-462`),
  `umami.disabled` in localStorage, `window.name` cross-frame opt-out. No GPC,
  no consent gate.
- **Size / weakness:** 22,726 B source, no size gate in
  `rollup.tracker.config.js`; SPA coverage is push/replace only (`index.ts:395-411`).

### Talivia — MIT (A) — `References/talivia`

- The fork baseline before our cookieless change: visitor cookie 365 days,
  session cookie 30 minutes, cookie-domain sharing across subdomains
  (`src/tracker/index.js:67-76,137-151`).
- Same capture, transport and limits as Umami, plus linker decoration for Dodo,
  Lemon Squeezy and Stripe and the `talivia:collector-context` cache event
  (`src/tracker/index.js:567-568`).
- Weaknesses inherited unchanged: no retry, no popstate/bfcache, cookie
  dependence. Ours is strictly better on identity, consent, outbound and
  downloads. Upstream is 20 days ahead (`REFERENCE_INVENTORY.md` §9), so compare
  behaviour against Umami.

### trckable tracker subtree — MIT (A), repo AGPL (B) — `References/trckable/tracker`

Only `tracker/` is a candidate; the server is AGPL-3.0-only
(`REFERENCE_INVENTORY.md` §10) and was not read for code.

- **Identity:** cookie `<id>.<first-seen>` for 400 days, or cookieless mode with
  no browser storage at all and a server-side daily hash
  (`tracker/src/core.ts:5-9,73-84,254-262`). Ours matches the cookieless half but
  has no cookie mode; that is a deliberate product choice, not a gap.
- **Capture (widest in the set):** SPA plus `popstate`, `hashchange` and
  bfcache `pageshow` (`core.ts:518-530`); visible engaged time and scroll depth
  (`core.ts:398-404,492-516`); goal/outbound/download clicks (`core.ts:450-490`);
  form-submission goals with field allow-lists (`tracker/src/forms.ts`);
  scroll-triggered goals (`core.ts:429-446`); Web Vitals
  (`core.ts:341-396`); heatmaps in a separate 1.5 KB script
  (`tracker/src/heatmap.ts:1-30`).
- **Transport (the strongest part):** per-event id and age, write-ahead
  localStorage queue (24 h, 200 events), oldest-first retry with doubling
  backoff, `online`/visibility re-flush, server-side duplicate drop by event id
  (`core.ts:264-311,532-536`). One-shot `fetch` with `keepalive`, no beacon
  (`core.ts:287`).
- **Configuration:** build-time feature flags compile disabled features out
  entirely; script attributes `data-site`, `data-api`, `data-cookieless`,
  `data-hash`, `data-dev`, `data-domain` (`core.ts:11-19`; `script.ts:12-29`).
- **Privacy:** DNT and GPC always honoured, not opt-in
  (`core.ts:90-93,166`); consent read from `dataLayer` (Consent Mode v2) and
  `__tcfapi` (TCF v2.2) plus its own banner, with held events released only on
  an answer (`core.ts:142-251`); `?trckable=ignore` owner opt-out
  (`core.ts:78-84`); automation and localhost ignored by default
  (`core.ts:90-93`).
- **Size:** enforced budget 2,318 B gzip, target 1,638 B, checked per feature
  combination (`tracker/build.mjs:1-2,26-27,146-176`). Ours is 4,220 B gzip
  with no gate.
- **Weaknesses:** `Math.random()` ids are documented as unique-not-secret
  (`core.ts:105-110`); the cookie parser is a raw regex with no decoding
  (`core.ts:112`); any 4xx except 429 is final, so a transient WAF block drops a
  queued event (`core.ts:286-291`); name/logo are trademark-excluded
  (`TRADEMARKS.md`, inventory §10).
- **Inventory correction:** `REFERENCE_QUALITY_SCORES.md` cites
  `tracker/src/storage.ts`, `privacy.ts` and `transport.ts`; those files do not
  exist. The directory holds `core.ts`, `script.ts`, `bar.ts`, `forms.ts`,
  `heatmap.ts`, `heat.ts`, `online.ts`, and queue/privacy/transport logic is
  inline in `core.ts`.

### analytics.js — MIT (A) — `References/analytics.js`

- **Identity:** cookie `ajs_anonymous_id` with localStorage and in-memory
  fallbacks (`analytics.js:6946-6968,4952-4959`); `ajs_aid`/`ajs_uid` adopted
  from the URL (`analytics.js:796-801`); identity reset on `reset()`
  (`analytics.js:784-787`).
- **Capture:** manual `page`/`track`/`identify`/`group`/`alias` only. No
  auto-pageview, SPA, outbound or download.
- **Transport:** none of its own. Zero `sendBeacon` occurrences and four
  `XMLHttpRequest` occurrences in the bundle; delivery belongs to destination
  integration scripts. No retry, queue or dedupe.
- **Configuration / privacy / size:** snippet key plus integration list and
  `analytics.load`; no DNT, GPC or consent gate; `analytics.js` 449,237 B,
  `analytics.min.js` 255,916 B, 59,728 B gzip.
- **Verdict:** unmaintained since 2021, generated 20k-line bundle, no collector.
  Only the `identify`/`track` envelope naming is worth reading.

### Open-Web-Analytics — tracker BSD-3 (A) inside a GPL-2.0 (B) repo — `References/Open-Web-Analytics`

- **Identity:** cookie-based state stores with `cookiePersistence: true`
  (`modules/Base/src/tracker/Tracker.js:247-320,382`), cookie-domain
  establishment and migrations (`Tracker.js:435-461,940-1046`), campaign
  cookies (`Tracker.js:2594`). More identity surface than we want.
- **Capture:** pageviews, clicks/actions, campaigns, e-commerce, Domstream and
  heatmap hooks in one 4,222-line tracker (`Tracker.js:1-120`).
- **Transport:** prefers `sendBeacon` and treats its return value as a delivery
  signal before persisting session state, with a hidden-iframe POST fallback
  (`Tracker.js:1190-1300`). No retry queue, no batching.
- **Configuration:** `owa_cmds` command queue and `setOption`, including
  `cookiePersistence: false` (`Tracker.js:358-382`).
- **Privacy / size:** DNT and `navigator.webdriver` in
  `modules/Base/src/common/Util.js:702`; no GPC or consent gate; 155,572 B
  source, 44,236 B gzip before minification.
- **Verdict:** the BSD-3 tracker subtree is legally usable but is a monolith
  with no capability we lack and worse transport than trckable. Reject.

### minilytics — MIT (A) — `References/minilytics`

- **Identity:** first-party cookies `ml_vid` (1 year) and `ml_sid` (30-minute
  sliding), root-domain probe (`public/js/script.js:36-70`).
- **Capture:** pageviews and SPA (`script.js:125-135`), goals and outbound
  (`script.js:181-207`), visible-time pings every 60 s up to 30 pings
  (`script.js:103-124`), checkout decoration via `MutationObserver` and
  pointerdown (`script.js:147-180`), `identify` with `user_id`/email/name
  (`script.js:212-214`).
- **Transport:** `sendBeacon` with `text/plain` for events that may race
  navigation, `fetch keepalive` fallback (`script.js:94-100`). No retry.
- **Configuration:** `data-website-id`, `data-api`, `data-domain`,
  `data-allow-localhost`; `window.minilytics` command API.
- **Privacy:** localhost/webdriver guard, `?ml_ignore=true` owner opt-out, and
  client-side stripping of PII query params (`email`, `token`, `key`, …) before
  the URL leaves the browser (`script.js:20-30,80-92`). No DNT, GPC or consent.
- **Size:** 9,453 B source, 3,677 B gzip. Two test files, no CI.
- **Weakness:** email/name in `identify` are sent unhashed from the browser; do
  not copy that.

### pixelmoth — MIT (A) — `References/pixelmoth`

- Same lineage and nearly identical tracker as minilytics
  (`static/js/script.js:1-200`), differing only in Dodo-only checkout
  decoration (`static/js/script.js:146-180`). One test file, earlier revision,
  superseded; nothing to harvest that minilytics does not do better
  (`REFERENCE_QUALITY_SCORES.md`).

## 3. Per-capability decisions

| Capability                                             | Best source                                                                              | License class           | Adopt / reimplement / reject | Why                                                                                                                                                            | Target file                                                             | Acceptance test                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Retry + offline queue with per-event id and age        | `trckable/tracker/src/core.ts:264-311,532-536`                                           | A (tracker subtree)     | Reimplement                  | Only reference in this set that survives outages without duplicates; our `catch {}` drops events silently                                                      | `src/tracker/index.js`, `src/features/analytics/server/send/handler.ts` | Collect into a stopped collector, reload, restart: every event arrives once, with its original timestamp |
| Client event id accepted by the collector              | `trckable/tracker/src/core.ts:287-311` + server dedupe                                   | A                       | Reimplement                  | Prerequisite for any retry; our `saveEvent` generates the id server-side (`.../sql/events/saveEvent.ts:68-70`), so a retry would double-count                  | `handler.ts` schema + `saveEvent` unique constraint                     | Same event posted twice yields one row                                                                   |
| `sendBeacon` last-resort transport                     | `Open-Web-Analytics/.../Tracker.js:1260-1300`, `minilytics/public/js/script.js:94-100`   | A (BSD-3 subtree / MIT) | Reimplement after queue      | `fetch keepalive` covers most unloads but not a refused/aborted request; beacon gives an accepted/refused signal                                               | `src/tracker/index.js`                                                  | Click a link during a throttled network trace: the click event is still delivered                        |
| Back/forward, bfcache and hash-route pageviews         | `trckable/tracker/src/core.ts:518-530`                                                   | A                       | Reimplement                  | Browser Back and restored pages are currently invisible; hash-routed SPAs count one page                                                                       | `src/tracker/index.js`                                                  | Back and bfcache restore each emit exactly one pageview                                                  |
| Engaged time + scroll depth                            | `trckable/tracker/src/core.ts:398-404,492-516`; `minilytics/public/js/script.js:103-124` | A                       | Reimplement                  | `totaltime` is `max_time-min_time` with no idle cap (`.../sql/getWebsiteStats.ts:48`), so single-event sessions score 0 and an idle tab inflates hours         | `src/tracker/index.js`, `saveEvent` payload                             | One-page 3-minute read reports ~180 s; 2-hour idle tab does not                                          |
| Global Privacy Control honoured                        | `trckable/tracker/src/core.ts:90-93,166`                                                 | A                       | Reimplement                  | One-line, server-independent opt-out; we honour only opt-in DNT                                                                                                | `src/tracker/index.js`                                                  | With `navigator.globalPrivacyControl=true`, zero requests                                                |
| Owner self-exclusion (`?talivia=ignore`)               | `trckable/tracker/src/core.ts:78-84`; `minilytics/public/js/script.js:20-25`             | A                       | Adopt pattern                | Founders' own visits dominate a low-traffic account; we read a key nothing can set                                                                             | `src/tracker/index.js`, `DocsPage.tsx`                                  | Visiting with the flag stops all sends in that browser; documented inverse flag re-enables               |
| PII query-param scrub before send                      | `minilytics/public/js/script.js:80-92`                                                   | A                       | Reimplement                  | Payment-return URLs carry `email`, `token`, `code`; our tracker sends the full query and only configured params are dropped server-side (`handler.ts:397-405`) | `src/tracker/index.js`                                                  | URL with `?email=a@b.c&token=x` arrives with both removed                                                |
| Custom-event delegation via `closest` on the attribute | `umami/src/tracker/index.ts:430`, `trckable/tracker/src/core.ts:456-464`                 | A                       | Reimplement (bug fix)        | A click on a child of a `div[data-talivia-event]` is currently lost                                                                                            | `src/tracker/index.js`                                                  | Clicking a nested `<span>` inside an attributed `div` emits the event                                    |
| Script weight budget in CI                             | `trckable/tracker/build.mjs:1-2,26-27,159-176`                                           | A                       | Reimplement                  | 4,220 B gzip today with no ceiling; every new feature is unaccounted                                                                                           | `rollup.tracker.config.js`, new size check                              | Build fails above an agreed gzip budget                                                                  |
| Consent-mode bridging (dataLayer / TCF)                | `trckable/tracker/src/core.ts:142-251`                                                   | A                       | Reject for now               | Real value, but large and CMP-specific; our boolean gate plus host integration is enough for launch                                                            | —                                                                       | —                                                                                                        |
| Cookie mode / subdomain cookie sharing                 | `talivia/src/tracker/index.js:67-76`                                                     | A                       | Reject                       | Contradicts the cookieless decision; cross-domain linker already carries the journey                                                                           | —                                                                       | —                                                                                                        |
| Error capture, heatmaps, forms/scroll goals            | `umami/src/tracker/errors.ts`, `trckable/tracker/src/heatmap.ts`, `forms.ts`             | A                       | Reject                       | None is a revenue signal; each adds payload, privacy surface or a product area already covered by custom events and existing replay                            | —                                                                       | —                                                                                                        |
| DNT opt-in default                                     | `umami/src/tracker/index.ts:309`                                                         | A                       | Keep current                 | Opt-in DNT matches our documented contract (`DocsPage.tsx:251-253`); GPC is the real omission                                                                  | —                                                                       | —                                                                                                        |

## 4. Three highest-value remaining changes, ranked by customer impact

**1. Durable delivery: queue, retry, client event id, event timestamp.**
A single `fetch` whose failure is swallowed (`src/tracker/index.js:601-628`)
loses the pageview — and the first-touch context a later payment is attributed
to — on an offline visitor, an ad-block race, a 502 or a closed tab. The
collector already accepts a `timestamp` (`handler.ts:69,223`) and detects
payment-return URLs (`handler.ts:514-531`); there is no retry and no idempotency
key (`saveEvent` mints the id, `.../saveEvent.ts:68-70`), and a queue must stay
inside the window the collector accepts. This is the only change here that
improves attribution accuracy rather than dashboard breadth.

**2. Session duration and engagement.** `totaltime` is the gap between the first
and last event of a session with no idle cap
(`src/features/analytics/server/queries/sql/getWebsiteStats.ts:48,97,122`): a
one-page read reports zero seconds, an overnight tab reports hours. References
send visibility-gated pings (trckable `core.ts:398-404,492-516`; minilytics
`script.js:103-124`). Time-on-page is a headline number, so this is a visible
correctness problem, and it supplies the scroll depth landing-page decisions
need.

**3. Complete navigation coverage.** Only `pushState`/`replaceState` are hooked
(`src/tracker/index.js:326-337`), so browser Back/Forward, bfcache restores and
hash-routed SPAs are not counted, and a custom event on a non-anchor wrapper is
missed (`src/tracker/index.js:370-388`). trckable handles all three
(`core.ts:518-530,456`). For a marketing site plus app, Back is a common path and
undercounted pageviews distort every per-page comparison.

Deferred but real, in descending value: GPC support; owner self-exclusion UX (the
read-only `talivia.disabled` key at `index.js:586` is not settable through any
shipped surface); PII query scrubbing; the consent-grant pageview with
`data-auto-track="false"` (`index.js:684-690`); the dead `data-domain` attribute
(`install-guides.ts:100,461`); a script size budget. None is a licence or
architecture question.

## 5. Limits of this note

- Plausible and openanalytics trackers are outside the contract's list and were
  not read line by line; their servers are AGPL (`REFERENCE_INVENTORY.md` §2,
  §6). Sizes measure files on disk, including one checked-in `public/script.js`.
- No reference behaviour was executed; DNT, GPC, beacon signalling and consent
  bridging are read from the cited lines. Reference test counts are static file
  counts, not executed suites. Line refs are to the tree as read on 2026-11-14.
- Our 625-line `src/tracker/index.test.ts` covers identity, consent, visibility,
  linker and checkout decoration, but not retry, navigation history, PII scrub,
  GPC or size.
