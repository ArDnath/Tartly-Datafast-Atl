# Animation plans

Audit basis: `improve-animations`, commits `fb71c67`, `8500206`, `8e8c173`.

| #   | Title                                                    | Severity | Status |
| --- | -------------------------------------------------------- | -------- | ------ |
| 001 | Extend the pinned feature story to tablet, stable swap   | MEDIUM   | DONE   |
| 002 | Add a URL CTA immediately after the feature story        | MEDIUM   | DONE   |
| 003 | Attribution figure: labelled, cumulative merge           | MEDIUM   | DONE   |
| 004 | Remove the false clickable lift from process cards       | MEDIUM   | DONE   |
| 005 | Put the process hover on one 200ms beat                  | MEDIUM   | DONE   |
| 006 | Keep colour feedback under reduced motion                | LOW      | DONE   |
| 007 | Delete the photo's hover filter transition               | LOW      | DONE   |
| 008 | Grow the revenue bars once on reveal                     | LOW      | DONE   |
| 009 | Revenue callout: one outline ending in an arrow          | MEDIUM   | DONE   |
| 010 | Feature section: leaner copy, line-only figures          | MEDIUM   | DONE   |
| 011 | Feature story rail progress tracks each step segment     | HIGH     | DONE   |
| 012 | Feature story stage swap is wired and animated           | HIGH     | DONE   |
| 013 | Feature story body reveal uses compositor-only motion    | MEDIUM   | DONE   |
| 014 | Figure bubble reposition uses landing motion token       | LOW      | TODO   |
| 015 | Tune landing reveal duration to a crisper budget         | LOW      | TODO   |
| 016 | Feature stage: restore the crossfade the panels promised | HIGH     | DONE   |
| 017 | Feature stage: take the white card off the diagrams      | MEDIUM   | DONE   |
| 019 | FAQ rows: canvas-coloured, no icon, no orange open state | MEDIUM   | DONE   |
| 020 | Finish the FAQ answer animation deletion                 | MEDIUM   | DONE   |
| 021 | Hero preview fills move on the compositor                | HIGH     | DONE   |
| 022 | Hero preview reduced motion keeps feedback               | MEDIUM   | DONE   |
| 023 | Journey rail fill tracks scroll 1:1                      | MEDIUM   | DONE   |
| 024 | Typewriter ticks stop re-rendering the hero demo         | HIGH     | DONE   |
| 025 | Add press feedback to the two pressable controls         | LOW      | DONE   |
| 026 | Marquee does not paint before reduced-motion is known    | MEDIUM   | DONE   |
| 027 | Landing easing curves live in tokens                     | LOW      | DONE   |
| 028 | Hero fold stops forcing layout on every pointermove      | HIGH     | DONE   |
| 029 | Capability marquee pauses while offscreen                | MEDIUM   | DONE   |
| 030 | Process drawer reveal moves off the layout path          | MEDIUM   | DONE   |
| 031 | Reduced-motion changes reach Lenis live                  | LOW      | DONE   |
| 032 | Navbar easing uses the landing motion token              | LOW      | DONE   |

Executed 2026-11-20 on commit `fb71c67` + working tree; verified by biome
format/lint, PostCSS parse, a Tailwind CLI compile, `tsc --noEmit`, and 74
landing tests.

**Deviation from plan 008 as written:** the plan specified bar delays of
380/470/560/650ms, derived from a stale assumption that the third card's still
starts at 260ms. It actually starts at 440ms (`260 + index * 90`,
`BuildProcess.tsx:157`), so those delays would have begun the wipe ~60ms before
the still appeared. Shipped values are 900/990/1080/1170ms — the point at which
the band's 560ms rise is ~96% opaque. Plan 008 has been corrected to match.

Executed 2026-11-19 on the working tree above `fb71c67`; verified in Chromium at
820×1180, 1440×900, and 390×844. The process rail keeps its original 520 ms
entrance — only the feature variant fades.

## Order

**Process section (004–008)** — all five touch only
`src/features/marketing/landing/landing.css`, in the `.lp-step` block.

1. **004** first. It removes the card's `translate` and drop shadow, so the
   hover block that 005 rewrites is already in its final shape. Running 005
   first would mean rewriting the same rules twice.
2. **005** second. Retimes every hover transition in the block to 200ms and
   splits colour (`ease`) from movement (`--lp-ease`).
3. **006** third. Rewrites the reduced-motion block; its target durations are the
   200ms values 005 establishes.
4. **007** independently of 004–006 — it only deletes the photo's filter
   transition and its hover rule (`landing.css:2086`, `2109-2113`). Safe to run
   any time.
5. **008** last. Adds the bar-growth keyframes and reveal rules, and appends one
   override to the reduced-motion block. Run it after **006**, since both edit
   that block; 008's instructions assume 006's grouping.

Dependency summary: `004 → 005 → 006 → 008`, with `007` free-floating.

**009** is independent of everything above: it touches only
`src/features/marketing/landing/figures/` (`revenueColumns.ts` and its test
file) and changes no CSS. Safe to run at any time.

**010** is independent of 001–009 and should run last of the feature-section
plans. It rewrites the `#features` copy in `FeaturesSection.tsx`, makes
`StoryStep.kicker` optional in `StorySteps.tsx`, and touches two fill
declarations plus the stacked-variant copy rules in `landing.css`. It does not
touch `figures/`, so 003 and 009 are unaffected. If a later plan re-adds a
badge or stat to the feature steps, it must restore the deleted stacked rules.

## Out of scope by decision

- The `rail` (build process) story keeps its `lg` breakpoint and rail line.
- The mobile highlight is already correct: the stacked buckets divide the
  container evenly, and the mobile steps are equal-height, so the highlight
  changes exactly when the next step crosses the 44 % reading line. No change
  needed.
- Figure loops already stop offscreen via `IntersectionObserver` in
  `figures/loop.ts`; no performance finding.
- Reduced-motion and no-JS states already fall back to the plain document; the
  dimming rules are gated on `[data-motion="on"]`.
- **Process card entrances are settled and stay as they are.** The `Reveal`
  stagger (0 / 90 / 180 ms), the photo settle (`lp-step-settle`, 1000 ms) and the
  still rise (`lp-step-still-in`, 560 ms) were reviewed and are correct — a
  one-time scroll entrance is the rare tier where longer durations are allowed.
  Plans 004–008 change hover and add one reveal; none retimes an entrance.
- **The outer card lift is removed deliberately, not overlooked.** It reads as a
  click affordance on a card that contains no link, and it opens an asymmetric
  gap in the 6px tray inset. The inner choreography carries the hover. See 004.
- **`ease-in` is absent from the whole landing stylesheet.** The only `ease-in`
  match is `ease-in-out` on the brand mark's `lp-mark-swirl-wipe`
  (`landing.css:165`), which is correct for on-screen movement and outside the
  process section. No easing findings to file.
- **`transition: all` is absent** and no layout property (`width`, `height`,
  `top`, `left`, `margin`, `padding`) is animated in the process block.

## Feature-stage audit — 2026-11-24, commit `8e8c173`

Scope: `#features` motion and the white plate behind the diagrams. Both findings
were confirmed by re-reading the current, uncommitted working tree.

| #   | Severity | Finding                                                                                                                                                                                |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 016 | HIGH     | `.lp-story-stage-visuals` / `.lp-story-stage-panel` have no CSS at all; all three figures render stacked and `aria-hidden` disagrees with what is visible. The 012 crossfade was lost. |
| 017 | MEDIUM   | `.lp-story-stage-card` keeps its white/cream gradient, border, radius, shadow and dot field, contradicting the line-only direction of 010.                                             |

**Order:** run **016** first, then **017**. They share only `landing.css` but
touch different declarations (016 adds panel rules, 017 strips the card shell).
016 removes the stale `lp-story-swap` keyframes; 017 removes the dead
stage-chrome rules. If run in parallel, expect a trivial conflict in that file.

**Respected / not re-reported:**

- The 500ms rail fill transition (`landing.css:1407`) is documented as a
  deliberate "reads as progress, not a jump" choice. Left alone.
- The figure loop's 30fps shared rAF, `IntersectionObserver` pause and
  reduced-motion full stop (`figures/loop.ts`) are correct. No performance plan.
- The hardcoded bubble easing at `figures/FigureStage.tsx:219` is already
  tracked as **014** (TODO). Not duplicated here.
- The global 720ms `[data-reveal]` duration is already tracked as **015** (TODO).

**Missed opportunities, deliberately not planned:**

- The section heading uses `Reveal` but the stage has no first-arrival entrance;
  a one-time opacity + 8px lift on the stage when it first intersects would tie
  the drawing to the heading. The 016 crossfade covers every later swap.
- The figure read-out (`.lp-fig-read`) flips its text instantly on swap; a
  ~120ms opacity dip would tie it to the 240ms panel crossfade. It is written
  imperatively in `FigureStage.tsx`, so this needs a DOM hook rather than CSS.

### Execution record — 2026-11-24

**016 + 017 executed in order, in place** (not in an isolated worktree): the
plans are stamped to this branch's uncommitted working tree, and HEAD has
different stage CSS, so a clean worktree would have hit each plan's STOP-on-drift
clause. Only `src/features/marketing/landing/landing.css` and this plan folder
were touched. No other user work was modified; nothing was committed.

Verified: `tsc --noEmit` clean; `biome format plans/` clean; mechanical greps
from both plans pass (zero `lp-story-swap`, zero dead stage chrome, figure
fills unchanged). `NODE_ENV=test vitest run src/features/marketing/landing`:
63 passed, 3 failed — all three are pre-existing assertion/component drift in
`BuildProcess` text and provider count, present unchanged at HEAD; none touch
the stage CSS.

`pnpm gate` still fails at `gate:format` on three pre-existing, uncommitted
files outside this scope: `docs/PHASES.md`, `landing.css` (`'Poppins'` quotes),
and `HeroSection.tsx` (blank lines). Fixing them is a separate human-owned
formatting pass.

**UNVERIFIED:** the in-browser feel checks in both plans (crossfade on rapid
scroll reversal, 10% Animations playback, reduced-motion toggle, no white plate)
were not run — no Next.js dev server is available on port 3000 and the app's
dev script requires database credentials. A human must open `/#features` at
≥1024px and run those checks before launch sign-off.

## FAQ direction — 2026-11-24, commit `dd1a749`

Owner request, handled as a `plan <description>` slice: the landing FAQ rows
should match the page background, drop the blush toggle icon, and reveal the
answer without an orange highlight or any other state chrome.

| #   | Severity | Finding                                                                                                                                                      |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 019 | MEDIUM   | `.lp-faq-item` is a near-white card with a blush circular `+` and an orange border/inset bar/shadow/index when open; the answer also fades in on a keyframe. |

**Order:** 019 stands alone. It touches `FaqSection.tsx` and the `.lp-faq-*`
rules in `landing.css`; it does not overlap the feature-stage work in 016–018.
The `landing.css` reduced-motion block is edited, but only to delete entries
made dead by this plan — no other entries are retimed.

**Respected / not re-reported:**

- The pricing-page FAQ (`Pricing.module.css:546-572`) is a plain bordered list
  with a text `+`; none of the reported symptoms match it. Out of scope.
- The `01`–`06` numbered ledger and hairline `#ddd5cc` border are the scannable
  structure of the section, not the reported problem. Kept.
- The `Reveal` wrappers on each row are one-time scroll entrances, not
  open-state motion. Kept.
- No `ease-in` and no `transition: all` in the FAQ block. No new curve needed.

### Execution record — 2026-11-24

**019 executed in place**, not in an isolated worktree: the plan is stamped to
this branch's uncommitted `landing.css`, so a clean worktree would have hit the
STOP-on-drift clause. Only `FaqSection.tsx` and `landing.css` were touched;
no commit was made. Review of the executor's diff caught one out-of-scope
deletion (`.landing-root .stack-socket-node` in the reduced-motion
`transition: none` list, a pre-existing working-tree line); it was restored.
`lp-story-ticks` remains absent, as it was before execution.

Verified: `biome lint` on `FaqSection.tsx` clean; `tsc --noEmit` clean;
`vitest run src/features/marketing/landing/LandingPage.test.tsx` 20 passed / 1
failed — the failure (`LandingPage.test.tsx:160`, expected "no code — site
builders and cms" vs rendered "Site builders and CMS") is pre-existing
`StackSection.tsx` drift, unrelated to the FAQ; every FAQ assertion passed.
`biome format` on the two files still reports the pre-existing `'Poppins'`
quote style in `landing.css`, so `pnpm gate` is unchanged and still red on
unrelated user work.

**UNVERIFIED:** the in-browser feel checks in 019 (eyedropper colour match, no
icon or orange open state, rapid toggle, keyboard, reduced motion) need a human
with the dev server. No browser run was available in this session.

## Whole-landing audit — 2026-11-24, commit `dd1a749`

Six parallel read-only auditors covered hero/nav/primitives, features/figures,
process, journey, remaining sections, and cross-cutting performance/accessibility/
cohesion. Findings were re-read at `file:line` before filing. Plans 020–027 are
the high-confidence result; each is stamped to `dd1a749` and the current dirty
working tree, so execute in place — a clean worktree would hit each STOP clause.

**Order / dependencies:**

1. **020** first (deletes the stale FAQ keyframe; independent).
2. **021**, then **022** — both in `HeroPreview.module.css`; 021 rewrites fills,
   022 replaces the reduced-motion block that wraps them.
3. **023** independent (`journey/journey.css` only).
4. **024** independent (`HeroPreview.tsx` + `RotatingText.tsx`).
5. **025** after **020** (both edit `landing.css`, different blocks) and independent
   of `process.css` edits.
6. **026** independent (`CapabilitiesMarquee.tsx` only).
7. **027** last — it edits `landing.css` easing declarations after 020/025 have
   settled that file.

**Respected / not re-reported:**

- `docs/UI_DESIGN_SYSTEM.md:42` documents "flat by default; shadows/lift only as
  state" — the marquee card lift and stack icon hover are deliberate, not findings.
- The old 500ms rail fill (`landing.css:1407`) is settled, but belongs to the
  unmounted `StorySteps` path; the live `.rj-rail-fill` in 023 has no such decision.
- `plans/README.md:84-88` settles process card entrance timings; not retimed.
- Plans 014 and 015 remain tracked TODOs; not duplicated.
- `lp-mark-draw`'s `scaleX(0)` reads as a deliberate underline draw, not an object
  appearing from nothing; the `lp-attention` box-shadow ring is a one-shot
  marketing cue on an `<input>` (pseudo-elements are unreliable there), so both
  are recorded as accepted, not planned.
- The figure subsystem (`figures/`, `loop.ts`, `FigureStage.tsx`) is not mounted:
  `FeaturesSection.tsx:9` renders `RevenueJourney`. Its `scale(0)` bubble and
  per-frame `cx`/`cy` writes have no shipped effect. Track separately if revived.
- Journey scene keyframes (cat 4), process `grid-template-rows` drawer (cat 5),
  FoldText pointermove throttling (cat 5), marquee visibility gating (cat 5),
  Lenis one-shot reduced-motion check, and stack/founder stagger (cat 7) are
  real but lower-confidence or higher-risk; not in this execution batch.

**UNVERIFIED:** every feel check in 020–027 needs a human with the dev server.
Static verification only was available in this session.

### Execution record — 2026-11-24

020–027 applied in place, in the stated order; no plan hit a STOP-on-drift
clause. Only the source files named by the plans were edited (plus the plan
status/verification lines). Nothing was committed, stashed, reset or formatted
wholesale.

Mechanical results: `pnpm exec tsc --noEmit` clean. `pnpm exec biome check` on
the seven edited files exits 1 with three findings, all pre-existing and on
untouched lines: the `'Poppins'` quotes in `landing.css`, a multiline
`mask-image` in `journey.css`, and the relative-import order in
`HeroPreview.tsx`. `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing`:
6 files, 76 tests, 74 passed / 2 failed — `LandingPage.test.tsx:160` is the
known StackSection text drift; `LandingPage.test.tsx:245` is new and caused by
026's required dual-branch DOM (`getByText('Which channel pays?')` now matches
two cards). The test file was not edited because no plan names it. Per-plan
greps passed as recorded in each plan. Plan 026 was then corrected to a single branch with `useState(true)` for a static SSR/first paint, removing the duplicate DOM and the `:245` failure.

**UNVERIFIED:** all in-browser feel checks (compositor-only transforms at 10%
playback, reduced-motion toggles, press feedback, rail tracking, React Profiler
commits, SSR first paint, ease-token computed styles) need a human with the dev
server. `pnpm gate` was deliberately not run.

## Targeted remaining-motion audit — 2026-11-25, commit `dd1a749`

Owner request: improve the remaining landing motion without heavy tooling. This
was a lean static pass — targeted greps and small file slices only, no subagent
fan-out, no builds, no tests, no source edits. The whole-landing audit of
2026-11-24 had already settled most of the surface; only unplanned items were
re-reported and every finding was re-read at `file:line`.

| #   | Severity | Finding                                                                                                                                                                                                             |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 028 | HIGH     | `FoldText.tsx:367-370` → `:321-322` reads `getBoundingClientRect()` on every hero pointermove, forcing a layout flush after GSAP writes each frame. `hoverRefold: true` at `HeroSection.tsx:108-110` makes it live. |
| 029 | MEDIUM   | `CapabilitiesMarquee.tsx:151-172` keeps two continuous CSS marquees compositing while the section is offscreen; no visibility gate.                                                                                 |
| 030 | MEDIUM   | `process.css:105-120` interpolates `grid-template-rows`, a layout property, on drawer expand/collapse. Contained subtree, hence MEDIUM.                                                                             |
| 031 | LOW      | `LandingScroll.tsx:43-46` reads reduced motion once at mount; an OS toggle mid-session leaves Lenis smooth scrolling on.                                                                                            |

**Correction to the verbal finding summary:** the marquee does _not_ run a JS rAF
loop. `react-fast-marquee@1.6.5` emits a CSS `scroll` keyframe with
`animation-play-state: var(--play)` (`dist/index.js:23,112`), and `play?:
boolean` is declared at `dist/components/Marquee.d.ts:27`. Plan 029 gates that
CSS animation via `play`, not rAF.

**Order / dependencies:** all four are independent and safe to execute in any
order. The only shared constraint is that 030 and 031 both have reduced-motion
handling in their own files; they do not overlap. Recommended: **028** first
(highest leverage), then **029**, **030**, **031**.

**Respected / not re-reported:**

- Plans 014 and 015 remain tracked TODOs from earlier audits; not duplicated.
- The figure subsystem is unmounted (`FeaturesSection.tsx` renders
  `RevenueJourney`), so plan 014 has no shipped effect.
- One-time scroll entrances (720ms reveals, 1600/1700ms journey scenes) are
  settled as the rare tier (`README.md:92-96`, `:239-243`); no duration finding.
- `ease-in`, `transition: all`, `scale(0)` and animated layout properties are
  absent from the shipped landing surface apart from 030, which is filed.
- StackSection already staggers its `Reveal` wrappers at 80/140/160ms
  (`StackSection.tsx:151-168`); FounderBand uses `index * 90` (`FounderBand.tsx:67`).
  No stagger finding.
- The `--fold-crease` custom property is written on the same element that reads
  it (`FoldText.tsx:232,244` → `FoldText.css:114`); it is not a parent-driven
  child transform, so audit cat 5's variable warning does not apply.
- Process card entrance timings, the 500ms journey rail fill (settled on the
  unmounted path), `lp-mark-draw`'s `scaleX(0)` underline and the `lp-attention`
  ring are all previously accepted decisions; left alone.

**Missed opportunities, deliberately not planned:** the journey stage still
has no first-arrival entrance when it scrolls into view, and the figure read-out
text flips instantly on stage swap. Both were already recorded at lines
134-139 above; they stay open rather than being re-filed.

**UNVERIFIED:** every feel check in 028–031 needs a human with the dev server.
Only static verification was available in this session. No plans were executed
and `pnpm gate` was not run.

## Execution record — 2026-11-25 (028–031)

- **Scope**: Plans 028–031 executed in place, sequentially, on the dirty working tree (no worktree/branch/commit). Only the four named source files, the four plan files, and this README were touched.
- **028** `FoldText.tsx`: cached hero fold rect behind one rAF-coalesced refresh; pointer/scroll schedule refresh, resize listener added, cleanup cancels frame. Biome clean. `getBoundingClientRect` remains in `refreshBox` (root) and pre-existing `measure()` (parent, intentionally kept).
- **029** `CapabilitiesMarquee.tsx`: `IntersectionObserver` gates both marquees via `play={visible}`; `useState(true)` preserves SSR/first paint; reduced-motion grid branch unchanged. Biome clean.
- **030** `process.css`: drawer grid switch made discrete (`0s`, 200ms collapse delay); inner reveal uses opacity/translateY only; reduced-motion neutralizes inner transition and forces visible inner state. Biome clean.
- **031** `LandingScroll.tsx`: Lenis lifecycle now reacts to live `prefers-reduced-motion` `change` events; start/stop manages rAF and `activeLenis`; helpers/options unchanged. Biome clean.
- **Mechanical verification** (executor result, re-checked independently): `pnpm exec tsc --noEmit` exit 0. `pnpm exec biome check` on the four edited source files clean — only the pre-existing `biome.json` `linter.recommended` deprecation notice. `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing/LandingPage.test.tsx` → 1 file, 21 tests, 21 passed / 0 failed. No pre-existing failure appeared in this run. Not run by constraint: `pnpm gate`, full suite, install, build.
- **UNVERIFIED**: all feel/browser checks from plans 028–031 (Performance layout-flush recording, compositor animation-play-state, drawer paint flashing, live reduced-motion Lenis toggle, 10% playback, rapid interaction) require a human with the dev server.

## Whole-landing follow-up — 2026-11-25, commit `dd1a749`

Owner request: improve the remaining landing motion without heavy tooling. Lean
static pass only — targeted greps and small file slices, no subagent fan-out, no
builds, no tests, no source edits. The prior audits had already settled most of
the surface; every finding below was re-read at `file:line` before filing.

| #   | Severity | Finding                                                                                                                                                                                           |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 032 | LOW      | `Navbar.tsx:87` and `:146` hand-type `cubic-bezier(0.16,1,0.3,1)`, duplicating `--lp-ease` (`landing.css:60`). Plan 027 explicitly excluded TSX files, so the duplication was never consolidated. |

**Order:** 032 stands alone. It touches only `Navbar.tsx` and does not overlap
any open plan.

**Respected / not re-reported:**

- Plans 014 and 015 remain tracked TODOs. 014 has no shipped effect because the
  figure subsystem is unmounted (`FeaturesSection.tsx:9` renders
  `RevenueJourney`); 015 was accepted as a one-time scroll entrance in the rare
  tier at lines 92–96 and 317–318. Neither is duplicated here.
- `ease-in`, `transition: all`, `scale(0)` and animated layout properties are
  absent from the shipped landing surface. `cubic-bezier` in TypeScript appears
  only at the two Navbar lines filed as 032 and at the unmounted figure stage
  already tracked by 014.
- Reduced motion is handled live in `LandingMotion.tsx:19-27`, `LandingScroll.tsx:44-84` (031), `Parallax.tsx:27-47`, `WordReveal.tsx:31-126` and `CapabilitiesMarquee.tsx:102-113`. `Reveal.tsx:32-37` and `useInView.ts:25` read it once, but both only run one-shot entrances, so a mid-session toggle does not leave continuous motion running.
- `StarBorder.tsx:217` also reads it once, but `StarBorder` is not mounted on the
  landing page (only its test imports it), so its continuous canvas loop is not
  a shipped landing finding.
- `scrollFrame.ts` is a single passive, rAF-throttled scroll bus; `parallax.ts`
  batches all rect reads before writes; `FoldText.tsx`'s cached fold rect is the
  settled result of plan 028. No performance finding.
- Navbar show/hide and mobile drawer durations (300ms) sit inside the modal and
  drawer budget; press feedback and hover transitions are 140–200ms. No duration
  finding.
- The `lp-attention` input ring, `lp-mark-swirl-wipe`, the 500ms rail fill on the
  unmounted path, process entrance timings and the journey scene keyframes are
  all previously accepted decisions; left alone.

**Missed opportunities, deliberately not planned:** the journey stage has no
container-level first-arrival entrance of its own (the active scene's nodes do
animate when `data-live` flips), and the unmounted figure read-out would need a
DOM hook for a swap-time opacity dip. Both were already recorded at lines 134–139
and 331–334; they stay open rather than being re-filed.

**UNVERIFIED:** the feel check in 032 needs a human with the dev server. Only
static verification was available in this session. No plans were executed and
`pnpm gate` was not run.

### Execution record — 2026-11-25 (032)

- **Scope**: 032 executed in place, on the dirty working tree (no worktree/branch/commit). Only `Navbar.tsx` was edited; the reviewed diff is exactly two `ease-[cubic-bezier(0.16,1,0.3,1)]` → `ease-(--lp-ease)` substitutions at lines 87 and 146. Plans 014 and 015 were NOT executed.
- **Mechanical**: `pnpm exec biome check src/features/marketing/landing/Navbar.tsx` exit 0 (pre-existing `biome.json:18` deprecation notice only). `pnpm exec tsc --noEmit --pretty false` exit 0. `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing/navScrollState.test.ts` → 8 passed / 0 failed. `rg 'cubic-bezier' src/features/marketing/landing/Navbar.tsx` → no matches. Not run by constraint: `pnpm gate`, full suite, install, build.
- **UNVERIFIED**: emitted CSS (`transition-timing-function: var(--lp-ease)`) and all feel checks (desktop scroll in/out, 390px mobile drawer, live reduced-motion toggle, 10% Animations playback) need a human with the dev server and a CSS build.
