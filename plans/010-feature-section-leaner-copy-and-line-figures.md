# 010 — Feature section: leaner copy, less chrome, line-only figures

- **Status**: DONE
- **Commit**: `fb71c67` + the landing working tree
- **Severity**: MEDIUM (visual hierarchy / cohesion; additive)
- **Category**: Cohesion & tokens / Missed opportunities
- **Estimated scope**: 4 files (`FeaturesSection.tsx`, `StorySteps.tsx`,
  `landing.css`, `LandingPage.test.tsx`), ~80 lines net

## Problem

The `#features` section is the heaviest block on the page in text volume and in
decorative chrome, and its three drawings are filled with a lighter cream than
the canvas they sit on, so each one reads as a faint card instead of a line
diagram.

### 1. Too many words per step

`src/features/marketing/landing/sections/FeaturesSection.tsx:9-52` — each step
carried a kicker word, a title, a 22–31 word paragraph, and a stat line. Three
steps × (kicker + title + long paragraph + stat) was ~90 words of body copy in a
pinned column meant to be scanned in rhythm with the drawing.

### 2. Three layers of label chrome per step

`src/features/marketing/landing/sections/StorySteps.tsx:193-205` rendered a
pill badge (number + kicker) above every title and a stat line under every
paragraph. The badge was a bordered, filled, uppercase, letter-spaced pill; its
number sat in a second tinted chip; the active state repainted both. The stat was
a third uppercase mono string in signal orange. Four type treatments competed
above one drawing.

### 3. The drawings are not the colour of the ground

The section background is `bg-lp-canvas` = `#fffbeb`
(`FeaturesSection.tsx:63`, `landing.css:26`). The figures were filled with a
lighter cream, `#fffdf6`, and outlined in sand. On `#fffbeb` that fill was a
visible tonal patch: every plinth, bar and terrace painted a slightly brighter
plate over the ground.

## Target

**Copy** — one idea per step, 6–10 words of body each:

| Step | Title                   | Description                                             |
| ---- | ----------------------- | ------------------------------------------------------- |
| 1    | `Traffic, meet revenue` | `Every channel, its visitors, and the dollars it paid.` |
| 2    | `Every payment, traced` | `First touch or last, the source is attached.`          |
| 3    | `See where they drop`   | `Signup, trial, payment — one funnel.`                  |

Keep the section heading exactly as it is: "Traffic tells you who came. /
Revenue tells you who paid." and its `aria-labelledby="features-title"`.

**Chrome** — one label treatment per step: a bare tabular numeral, then the
title, then one line. No pill, no kicker word, no stat line.

**Figures** — the solid fill and the cloud fill become the canvas colour, so the
drawings are outlines on the page:

```css
.landing-root .lp-fig-solid {
  fill: #fffbeb; /* = --color-lp-canvas */
}
.landing-root .lp-fig-cloud {
  fill: #fffbeb;
}
```

Everything else in the figure palette stays: the sand/ink strokes, the bright
stroke, the dots, the crease. The fill stays **opaque**, so nearer solids still
occlude the ones behind them — only the tint disappears.

### Ambiguity, resolved

"Make the line diagrams the color of the bg" was read as **the solid fill
becomes the canvas colour** (the figures become line-only on the page). Reading
it as _strokes_ in the bg colour would render every drawing invisible, so that
reading is rejected.

## Implementation

### 1. `sections/FeaturesSection.tsx`

Replaced the whole `FEATURES` array with the three short steps above. `kicker`
and `stat` removed from every step. `describe` strings kept (accessible names);
the attribution describe trimmed to match the new copy.

### 2. `sections/StorySteps.tsx`

- `StoryStep.kicker` made optional (`kicker?: string`).
- Step body renders the badge only when `step.kicker` exists, otherwise renders
  `<span className="lp-story-num">{number}</span>`.
- Stage head guards the kicker the same way: render `lp-story-stage-kicker` only
  when `current.kicker` exists.

### 3. `landing.css`

- `.lp-fig-solid` and `.lp-fig-cloud` fills changed from translucent cream to
  `#fffbeb`.
- Added `.lp-story-num` (inline-block, sand `#a09889`, 10px mono, tabular nums,
  `transition: color 320ms var(--lp-ease)`) and its active state
  (`.lp-story-step[data-active="true"] .lp-story-num { color: #ff4f00; }`).
- Added stacked-variant title/copy rhythm:
  `.lp-story[data-variant='stacked'] .lp-story-title` →
  `margin-top: 0.55rem; font-size: 1.15rem; line-height: 1.2; letter-spacing: -0.02em`.
  `.lp-story[data-variant='stacked'] .lp-story-copy` →
  `margin-top: 0.4rem; max-width: 24rem; font-size: 0.9rem; line-height: 1.55`.
- Added wide-screen stacked title bump at `min-width: 1024px`:
  `font-size: 1.25rem`.
- Added `.lp-story-num` to the reduced-motion transition-off class list.

### 4. `LandingPage.test.tsx`

- Heading matcher: `/Traffic and revenue together/i` → `/Traffic, meet revenue/i`.
- Added guards: `#features .lp-story-badge` has length 0,
  `#features .lp-story-num` has length 3.

## Boundaries

- Did **not** touch any file under `figures/` (geometry, motion, read-out
  settled).
- Did **not** remove base `.lp-story-badge*` / `.lp-story-stat` rules — the rail
  variant still uses them.
- Did **not** touch `BuildProcess`, the `#features` id, the `Reveal`, the scroll
  driver, or the mobile fallback.
- Did **not** add dependencies, keyframes, or new colour tokens.

## Verification

- `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing` — 60/63
  passing in the current worktree. The 3 failures are pre-existing in-flight
  process/provider tests unrelated to this plan:
  `lays the four build steps out on the scroll story`,
  `walks through the three-step process with drawn product stills`,
  `renders the payment providers that connect in settings`.
- `tsc --noEmit` — clean (prior session).
- `biome check` — clean on the four edited files (prior session). Two unrelated
  pre-existing import-order errors remain in in-flight `BuildProcess.tsx` and
  `HeroPreview.tsx`.
- `grep "fill: #fffdf6" landing.css` → no matches in the figure rules.
- `grep "kicker\|stat:" FeaturesSection.tsx` → no matches.

**Not verified / caveats**

- Browser feel check at 1440×900 and 390×844 was **not** run in this session (no
  local browser tooling). Worth confirming by hand: overlapping solids still
  occlude correctly after the fill change to canvas colour, and no title wraps
  past two lines at 390px.
- `pnpm gate` as a whole is not green due to pre-existing in-flight landing
  work, not this plan.

## Execution record — 2026-11-21 (reapplied)

Reapplied to the current working tree on request. Code changes restored in
`FeaturesSection.tsx`, `StorySteps.tsx`, `landing.css`, and
`LandingPage.test.tsx`; plan/README/PHASES artifacts restored.
