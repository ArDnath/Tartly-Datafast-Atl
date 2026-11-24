# 018 — Process section: interactive product demonstration

- **Status**: IN PROGRESS
- **Commit**: TBD
- **Severity**: HIGH (conversion section)
- **Category**: Landing page / interaction design
- **Estimated scope**: `src/features/marketing/landing/sections/BuildProcess.tsx`,
  new `src/features/marketing/landing/process/*`, `LandingPage.test.tsx`

## Problem

The "How it works" section is a static three-card infographic. The cards have
photographic plates and drawn stills, but no hover state beyond a tint, no
click behaviour, and no reason to linger. The brief asks the section to read as
an interactive product demonstration: a visitor should understand the process
in 5–10 seconds, then discover detail by hovering and clicking.

## Binding spec (from the owner)

1. **Entrance** — heading fades up, subtitle 200 ms later, cards sequentially
   from below at 150 ms intervals, arrows draw left to right.
2. **Card hover** — lift ~10 px, scale 1.02, orange-tinted border, stronger
   shadow, illustration animates, smooth exit.
3. **Card 1** — miniature animated editor: characters type in, `script` tag
   highlighted orange, green install indicator, checkmark, "Installed
   successfully". Click expands: "One lightweight script. That's all it takes."
4. **Card 2** — payment logos float in; individual logo scales on hover;
   connection lines draw on card hover; green connected indicator. Click
   expands: "Connect Stripe, Dodo, Lemon Squeezy, Polar, or your own payment
   API."
5. **Card 3 (the centrepiece)** — revenue bars fill, numbers count up, each
   source highlights on hover with a glow. Click expands: "Discover which
   channels and landing pages actually generate revenue."
6. **Arrows** — draw/fade left to right, one subtle pulse, understated.
7. **CTA** — orange input focus, button lift, arrow slides right, pressed
   state, website validation before submit.
8. **Mobile** — stacked cards, vertical arrows, tap-to-expand, lightweight.
9. **Performance/a11y** — transforms/opacity, no endless loops,
   IntersectionObserver, `prefers-reduced-motion`, keyboard accessible, no
   indefinite autoplay.

## Rulings (conflicts resolved before build)

- **Palette.** The brief names `#FBF6E8`; the shipped landing canvas is
  `#fffbeb` and the signal is `#ff4f00`. Use the existing tokens. AGENTS
  centralises brand values and forbids a second visual system. The difference
  is imperceptible and the brief's intent — warm cream, bright orange — is met.
- **Photographs stay.** The three photographic plates are the section's
  identity. They remain behind the stills under the existing veil; no new
  assets. Removing them was not requested and would be a larger visual reset.
- **The card lift returns.** Plan 004 removed the outer lift because the cards
  were not clickable, so it was a false affordance. The brief makes every card
  clickable and expandable, so the lift is now truthful. This plan supersedes
  004 on that point; it does not reopen the other 004–008 findings.
- **Old `.lp-step-*` CSS stays.** This plan adds `process/process.css` rather
  than editing `landing.css`, which carries uncommitted work from the previous
  session. The existing base classes are reused and supplemented; no CSS is
  deleted. Dead-rule cleanup is deferred until the dirty landing work lands.
- **No new dependency.** IntersectionObserver, CSS, and `requestAnimationFrame`
  cover every requirement. No motion library, no carousel package.
- **Commit scope.** Only files owned by this plan are staged. The pre-existing
  journey/hero/story working-tree changes are left untouched and uncommitted.
  `LandingPage.test.tsx` already contains one prior uncommitted hunk; it is
  staged whole because the process tests in the same file must be corrected.

## Global Constraints

- Work only inside `src/features/marketing/landing/`. Do not touch routes,
  APIs, schema, auth, billing, analytics ingestion, or any `docs/` file.
- No new runtime dependency, no new network call, no tenant data, no secret.
  Every backend-readiness and high-scale gate item is N/A for this static
  marketing section; record that reason, do not silently skip it.
- Use the shipped landing tokens: canvas `#fffbeb`, card `#fffdf6`, signal
  `#ff4f00`, ink `#171717`, muted copy `#655f57`, hairline `#e6dcc8`, green
  `#15803d` / `#22c55e`. Inter only. No second typeface.
- Every animation uses `transform`, `translate`, `scale`, `opacity`, or
  `clip-path`; no animated `width`, `height`, `top`, `left`, `margin`, or
  `padding` except the one `grid-template-rows` expand transition, which is
  content-size by nature.
- Animate only after an IntersectionObserver marks the card live, once. No
  infinite loops. The arrow pulse and the bar glow are finite.
- `prefers-reduced-motion: reduce` shows the final state immediately: full code,
  all chips, full bars, target numbers, static arrows, no lift/scale.
- Without JavaScript the section must still render: heading, three cards, full
  code, chips, revenue values, and the CTA form. CSS initial hidden states are
  gated on `.landing-root[data-motion="on"]`.
- Cards are keyboard accessible through a real `<button aria-expanded>`; mouse
  users can click anywhere on the card. The CTA input validates on submit and
  announces its error with `role="alert"`.
- Keep the existing copy unless the brief names a change. Card 3 becomes
  "See what converts". Provider list stays Stripe, Dodo, Lemon Squeezy, Polar,
  Yolfi, Manual API.
- `pnpm gate` is expected to fail on pre-existing dirty files outside this
  plan. The required evidence for this plan is: `pnpm exec biome format` on the
  touched files, `pnpm typecheck`, and the landing Vitest files green.

## Task 1 — Section shell, interaction, code card, CTA

### Files

- `src/features/marketing/landing/sections/BuildProcess.tsx` — rewrite as a
  client component (`'use client'`).
- `src/features/marketing/landing/process/process.css` — new global stylesheet,
  imported by `BuildProcess.tsx`.
- `src/features/marketing/landing/process/useInView.ts` — once-only observer
  hook, reduced-motion aware.
- `src/features/marketing/landing/process/ProcessCard.tsx` — reusable card
  shell with expand state.
- `src/features/marketing/landing/process/ProcessArrow.tsx` — drawn SVG arrow.
- `src/features/marketing/landing/process/ProcessCta.tsx` — validated form.
- `src/features/marketing/landing/process/CodeCard.tsx` — typed editor visual.
- `src/features/marketing/landing/sections/BuildProcess.test.tsx` — new focused
  tests.
- `src/features/marketing/landing/LandingPage.test.tsx` — correct the stale
  process assertions and the duplicate-provider query.

### Requirements

1. Section keeps `id="process"`, the region label
   `"From one script tag to revenue in 3 steps"`, the eyebrow "How it works",
   the H2 `FROM ONE SCRIPT TAG TO REVENUE IN 3 STEPS`, and adds the subtitle:
   "One lightweight script, your payment tools, and a revenue view that tells
   you what to do next."
2. Entrance: eyebrow at delay 0, H2 at 80 ms, subtitle at 200 ms; cards at
   280 + 150×index ms, distance 28; arrows at 355 + 150×index ms. Use the
   existing `Reveal` component and its `--lp-ease` curve.
3. `ProcessCard` API:

   ```ts
   type ProcessCardProps = {
     stepKey: string;
     index: number;
     title: string;
     description: string;
     detail: string;
     photo: string;
     delay: number;
     visual: (live: boolean) => React.ReactNode;
   };
   ```

   It owns `useInView`, `expanded`, the detail button, `aria-expanded`,
   `aria-controls`, and the whole-card click. The visual is passed the live
   flag. The root is the existing `.lp-step-shell` / `.lp-step-card` /
   `.lp-step-figure` / `.lp-step-body` structure, plus `lp-process-*` classes.
   Keep the `Image` plate with `alt=""`, `fill`, and the existing sizes.
4. Hover (pointer devices only): shell `translate: 0 -10px; scale: 1.02`,
   orange-tinted card border, stronger shadow, 220 ms transition. Reset on
   leave. Expanded state adds a persistent accent border and a small lift.
5. Detail region: CSS grid `0fr → 1fr` + visibility, 260 ms; collapsed content
   is not focusable. Button label is unique per card, e.g.
   `aria-label="Show details for Install Tartly"` / `Hide details ...`.
6. Arrows: custom inline SVG, `pathLength="1"`, line + head, orange stroke.
   Draw one time when the wrapper's `data-revealed` is true, then a small dot
   travels the line once. Mobile stacks the cards and rotates the arrow 90°.
7. `CodeCard`: four typed lines
   (`<script`, `defer src="https://tartly.in/t.js"`, `data-site="site_8f2a">`,
   `</script>`) in a window with dots and `index.html`. Typing is a per-line
   `clip-path` reveal via `steps()`, gated on live. `script` tag tokens orange,
   attributes plum, punctuation muted. A status row appears last with a green
   dot, a `Check` icon, and "Installed successfully". No loop.
8. CTA: keep `action="/signup" method="get"`, hidden `returnUrl=/onboarding`,
   input `name="website"`, button "Add your site". Input focus border orange
   plus ring. Button lifts on hover, arrow translates 3 px, pressed scale .98.
   On submit validate a normalized host (`https://` stripped, trailing slash
   stripped): reject empty, spaces, and hosts without a dot; show
   "Enter a website like yoursite.com." in `role="alert"`, set
   `aria-invalid="true"`, keep focus on the input, and prevent submission.
   Clear the error on change.
9. Cards 2 and 3 may keep the existing static provider/revenue visuals in this
   task (extracted into local functions or simple placeholders), but must
   already use the new `ProcessCard` shell and detail copy. Task 2 replaces the
   visuals.
10. Tests (new `BuildProcess.test.tsx`):
    - renders three headings, three `.lp-process-card` nodes, three detail
      buttons with `aria-expanded="false"`, the provider list, the revenue
      labels, and the code text;
    - clicking the detail button toggles `aria-expanded` and reveals the
      detail copy;
    - clicking the card (not the button) also toggles once;
    - submitting `"not a site"` shows the alert, sets `aria-invalid`, and does
      not clear the form; typing a valid host clears the error;
    - form action/method/returnUrl are unchanged.
      Update `LandingPage.test.tsx`: replace the stale four-step assertions with
      the three `.lp-process-card` nodes, change "Grow what pays" to
      "See what converts", and scope the duplicate "Lemon Squeezy" assertion to
      the stack region so the suite is green.

### Acceptance

- `pnpm exec biome format --write` on the touched files is clean.
- `pnpm typecheck` has no new errors.
- `NODE_ENV=test pnpm vitest run src/features/marketing/landing` is green.
- No file outside the list above is staged or committed.

## Task 2 — Interactive provider web and revenue dashboard

### Files

- `src/features/marketing/landing/process/ProviderCard.tsx` — new.
- `src/features/marketing/landing/process/RevenueCard.tsx` — new.
- `src/features/marketing/landing/process/useCountUp.ts` — new.
- `src/features/marketing/landing/sections/BuildProcess.tsx` — swap the two
  visuals into their cards; do not change the shell, entrance, arrows, or CTA.
- `src/features/marketing/landing/process/process.css` — append the new visual
  rules.
- `src/features/marketing/landing/sections/BuildProcess.test.tsx` — add the
  visual assertions.

### Requirements

1. **ProviderCard** keeps the six chips (Stripe, Dodo, Lemon Squeezy, Polar,
   Yolfi, Manual API) in the existing 2 × 3 grid. Chips float in from
   `translateY(10px)` + opacity 0 with an 80 ms stagger when live. Each chip
   scales to 1.06 and tints its border on hover, 160 ms.
2. An absolutely positioned SVG behind the chips draws a faint web/spine.
   Under motion it draws on card hover or when expanded (`stroke-dashoffset`
   1 → 0, 600 ms, staggered); it is static and faint under reduced motion.
   Add a green connected status row: dot + `Check` + "All sources connected".
3. **RevenueCard** is the visual centrepiece. Header "Revenue by source" with
   the "Sample" pill and a total "This month" figure `$7,540`. Three rows:
   Organic / Google $4,280 (100%), Direct $2,140 (50%), Product Hunt $1,120
   (26%). The total and each row value count up from 0 over 900 ms when live
   (`useCountUp`, cubic ease-out, one rAF, cancelled on unmount). Always expose
   the final figure to assistive tech in an `sr-only` span; the animated number
   is `aria-hidden="true"`.
4. Bars fill via `transform: scaleX(target)` with `transform-origin: left`;
   initial 0 is gated on `[data-motion="on"]` + `[data-live="false"]`, so SSR
   and no-JS show full bars. Stagger 80 ms. Hovering a row highlights it
   (tinted background, orange value, glow on the fill) and quiets the other
   rows with `:has`; use `@media (hover: hover)`.
5. Reduced motion: instant full bars, target numbers, no glow loop. The count
   hook receives `reduced` and sets the target directly.
6. Tests:
   - three revenue row labels and the sample marker render;
   - the final values `$4,280`, `$2,140`, `$1,120`, `$7,540` are in the
     accessible text;
   - provider names and the connected status render;
   - extraction did not change the card shell count or the detail copy.

### Acceptance

- Same commands as Task 1.
- Only the listed files are staged.
- The section still passes the full landing test file.

## Verification (controller)

- `pnpm exec biome format plans/018-process-section-interactive.md`
- `pnpm typecheck`
- `NODE_ENV=test pnpm vitest run src/features/marketing/landing`
- `git diff --check` on the staged ranges
- Browser feel checks are **UNVERIFIED** if no dev server is available. Record
  the missing environment and the exact human checks (desktop hover, mobile
  tap, reduced motion, no-JS) in the final report.

## Feature gate record

- [x] Architecture: all code stays in `src/features/marketing/landing`; no
  route, API, schema, auth, billing, or persistence change.
- [x] Validation/data, security/tenancy: N/A — one marketing form validates a
  public website string and submits to the existing `/signup` route; no
  tenant data, secret, or storage is touched.
- [x] Reliability/operations, scale/cost: N/A — static section; one
  IntersectionObserver per card, one finite rAF count-up per revenue card,
  no network call, worker, cache, or query.
- [x] Accessibility: native expand buttons, `aria-expanded`/`aria-controls`,
  `role="alert"` validation, keyboard focus rings, reduced-motion final
  state, decorative figures hidden from AT.
- [x] Tests: `BuildProcess.test.tsx` covers expand, card click, validation,
  providers, and revenue values; `LandingPage.test.tsx` corrects the stale
  process assertions.
- [ ] `pnpm gate`: blocked by pre-existing dirty files outside this plan; the
  scoped evidence above is the plan's proof.
- [ ] Browser motion QA: **UNVERIFIED** until a dev server is available.
