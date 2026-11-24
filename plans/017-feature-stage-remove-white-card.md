# 017 — Feature stage: take the white card off the diagrams

- **Status**: DONE
- **Commit**: `8e8c173`
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens / Missed opportunities
- **Estimated scope**: 1 file (`landing.css`), ~90 lines removed, 1 kept

## Problem

The three feature diagrams sit inside a white/cream card with a sand border, an
18px radius, a soft drop shadow and a dotted texture. The section already fills
the figures with the canvas colour (`#fffbeb`, plan 010), so this shell is the
remaining thing that makes each drawing read as a "card inset" rather than a
line drawing on the page. The file's own comment says the chrome should be gone,
but only the head and foot were hidden — the plate itself stayed.

```css
/* src/features/marketing/landing/landing.css:1599-1627 — current */
.landing-root .lp-story-stage-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #e6ddcd;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0) 7rem),
    linear-gradient(180deg, #fffdf7 0%, #fbf5e8 100%);
  box-shadow:
    0 40px 80px -56px rgba(23, 23, 23, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

/* A faint dot field fills the quieter previews without touching the content. */
.landing-root .lp-story-stage-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: radial-gradient(circle, rgba(23, 23, 23, 0.07) 0.6px, transparent 1.4px);
  background-size: 20px 20px;
  mask-image: linear-gradient(180deg, transparent, #000 18%, #000 82%, transparent);
  pointer-events: none;
}

.landing-root .lp-story-stage-card > * {
  position: relative;
  z-index: 1;
}
```

Two comments in the same file make the intended direction explicit:

```css
/* landing.css:1680 */
/* Stacked feature stage: the drawing carries the meaning, so the chrome goes. */
```

```css
/* landing.css:1926-1928 — the "who it's for" plates already made this choice */
/* No plate colour: the drawing's own background is transparent, so the
   canvas shows through and the card sits in the page rather than on it. */
background: transparent;
```

### Ambiguity, resolved

"White bg cards behind the diagrams" is read as **the stage shell** above — the
only white rectangle behind the figures. It is not the figures' own fills:
`.lp-fig-solid { fill: #fffbeb; }` (`landing.css:2065`) and
`.lp-fig-cloud { fill: #fffbeb; }` (`landing.css:2167`) were deliberately set to
the canvas colour in plan 010 and must stay. Changing those to transparent would
break the occlusion between nearer and farther solids. Do not touch them.

`StorySteps` is used only by `FeaturesSection` (`FeaturesSection.tsx:60`), so
these rules affect only the feature section — the build-process section has its
own `.lp-step-*` styles.

## Target

The stage becomes a transparent positioning context. Figures sit directly on
`#fffbeb`, framed only by their own ink strokes and the signal orange.

```css
/* src/features/marketing/landing/landing.css:1599 — target */
.landing-root .lp-story-stage-card {
  position: relative;
}
```

Delete the `overflow: hidden`, `border`, `border-radius`, both gradients in
`background`, and the two-part `box-shadow`. Delete the entire `::before` dot
field and the `> *` z-index rule — they existed only to layer content over that
plate. Removing `overflow: hidden` also stops the stage clipping the SVG, which
declares `overflow: visible` (`.lp-fig`, `landing.css:2051-2055`).

Also delete the dead stage-chrome rules. A repo-wide grep confirms none of these
class names is rendered by any TSX file — they are leftovers from the stage
architecture that plan 012 replaced:

```css
/* all in landing.css — delete whole rules */
.landing-root .lp-story-stage-head            /* 1629-1640 */
.landing-root .lp-story-stage-num             /* 1642-1653 */
.landing-root .lp-story-stage-kicker          /* 1655-1657 */
.landing-root .lp-story-stage-stat            /* 1659-1664 */
.landing-root .lp-story-stage-visual          /* 1666-1672 */
.landing-root .lp-story-stage-visual > *      /* 1674-1678 */
.landing-root[data-variant="stacked"] .lp-story-stage-head,
.landing-root[data-variant="stacked"] .lp-story-stage-foot /* 1680-1684 */
.landing-root .lp-story-stage-foot            /* 1709-1716 */
.landing-root .lp-story-ticks                 /* 1718-1721 */
.landing-root .lp-story-ticks span            /* 1723-1729 */
.landing-root .lp-story-ticks span[data-on="true"] /* 1731-1733 */
.landing-root .lp-story-stage-count           /* 1735-1742 */
```

And remove the stale selector from the reduced-motion list at `landing.css:1226`:

```css
  .landing-root .lp-story-ticks span,
```

Do **not** remove `.lp-story-badge`, `.lp-story-badge-num`, or `.lp-story-stat` —
those belong to the rail steps and are still rendered.

## Repo conventions to follow

- Canvas token: `--color-lp-canvas: #fffbeb` at `landing.css:28`, applied by
  `bg-lp-canvas` on the `#features` section (`FeaturesSection.tsx:46`).
- Exemplar for a chrome-free figure plate: `.lp-who-frame` at
  `landing.css:1922-1933`, whose comment and `background: transparent` already
  establish "drawing on the page, not on a card".
- Plan 010 established the figures as line-only (`fill: #fffbeb`); this plan is
  the last half of that decision.

## Steps

1. In `src/features/marketing/landing/landing.css`, reduce the
   `.lp-story-stage-card` rule at 1599-1610 to `position: relative` only.
2. Delete the `.lp-story-stage-card::before` rule at 1612-1622 and the
   `.lp-story-stage-card > *` rule at 1624-1627.
3. Delete the twelve dead stage-chrome rules listed in Target (1629-1742).
4. Delete the `.landing-root .lp-story-ticks span,` line at 1226 from the
   reduced-motion selector list.
5. Do not edit `StorySteps.tsx`, `FeaturesSection.tsx`, or anything under
   `figures/`. Do not change the figure fill colours.

## Boundaries

- Do NOT change the rail fill, story body transition, panel crossfade, figure
  loops, copy, or markup. Plan 016 owns the panel crossfade.
- Do NOT add dependencies or new colour tokens.
- Do NOT remove `position: relative` from the stage card — it remains the
  positioning context for the stage.
- Do NOT touch `.lp-who-*`, `.lp-step-*`, or any other section's cards.
- If the stage card has been intentionally restyled since commit `8e8c173`,
  STOP and report the drift instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit --pretty false`;
  `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing` — all
  existing landing tests must pass, including the six-SVG and
  `.lp-fig-solid`/`.lp-fig-wire` assertions.
- **Mechanical**: `grep -n 'lp-story-stage-card\|lp-story-ticks\|lp-story-stage-head\|lp-story-stage-foot\|lp-story-stage-visual\|lp-story-stage-count\|#fffdf7 0%' src/features/marketing/landing/landing.css`
  → only the single `.lp-story-stage-card { position: relative; }` rule remains.
- **Mechanical**: `grep -n 'fill: #fffbeb' src/features/marketing/landing/landing.css`
  → the `.lp-fig-solid` and `.lp-fig-cloud` fills are unchanged.
- **Feel check**: load the landing page at ≥1024px and scroll to `#features`:
  - No white, bordered or shadowed rectangle sits behind the active diagram;
    the drawing reads as ink on the same cream ground as the heading.
  - No dotted texture remains in the stage.
  - The diagram is no longer clipped at its edges.
  - With plan 016 applied, confirm the crossfade still works and the figure
    stays centred when `data-active` changes.
  - Toggle `prefers-reduced-motion`: layout and visibility are unchanged; only
    motion state changes.
- **Done when**: the stage card has no background, border, radius, shadow or
  dot field, all dead stage-chrome CSS is gone, and the figures' fills are
  still `#fffbeb`.

## Execution record — 2026-11-24

Executed after 016, in place, in `src/features/marketing/landing/landing.css`
only. `.lp-story-stage-card` is now `position: relative` alone; the dot field,
z-index wrapper, twelve dead stage-chrome rules (including the two stacked
`.lp-story-stage-visual` rules the Target list omitted but the grep requires),
and the stale reduced-motion ticks selector were deleted. The figure fills
`#fffbeb` and the stacked title/copy rules were preserved.

Verified: `tsc --noEmit` clean; grep confirms no stage chrome or plate gradients
remain and both `fill: #fffbeb` declarations are unchanged. Landing Vitest:
63 pass / 3 pre-existing failures unrelated to CSS.

**UNVERIFIED:** in-browser feel check (no white plate, no clipping, crossfade
still centred) — no dev server available.
