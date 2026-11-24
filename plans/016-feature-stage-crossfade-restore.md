# 016 — Feature stage: restore the crossfade the panels were promised

- **Status**: DONE
- **Commit**: `8e8c173`
- **Severity**: HIGH
- **Category**: Purpose & frequency / Interruptibility / Accessibility
- **Estimated scope**: 1 file (`landing.css`), ~45 lines added, ~12 removed

## Problem

The desktop feature stage has no swap animation at all. `StorySteps.tsx` was
migrated to the panel architecture in plan 012, but the CSS for that
architecture is absent from the current working tree. All three figures render
as block-level siblings in normal flow, at full opacity.

```tsx
/* src/features/marketing/landing/sections/StorySteps.tsx:195-215 — current */
<div className="lp-story-stage">
  <div ref={stickyRef} className="lp-story-sticky">
    <div className="lp-story-stage-card">
      <div className="lp-story-stage-visuals">
        {steps.map((step, index) => {
          const isActive = index === active;
          return (
            <div
              key={step.key}
              className="lp-story-stage-panel"
              data-active={isActive ? 'true' : 'false'}
              aria-hidden={isActive ? undefined : 'true'}
            >
              {step.visual}
            </div>
          );
        })}
      </div>
    </div>
  </div>
</div>;
```

`grep` for `lp-story-stage-visuals` and `lp-story-stage-panel` across `src/`
returns **only the TSX matches** — there is no rule for either class anywhere in
`landing.css` (or any other stylesheet). Consequences:

1. The three `.lp-story-stage-panel` divs stack vertically instead of sharing a
   grid cell, so the pinned stage grows to hold all three drawings at once.
2. `data-active` changes nothing visually. Scrolling between steps hard-cuts
   the rail copy while the stage never follows.
3. `aria-hidden="true"` removes the two inactive figures from the accessibility
   tree while they remain visible on screen — the visual and accessible states
   disagree.

The old mechanism is still present but dead, and it is the wrong tool for a
scroll-reversible swap because keyframes restart from zero:

```css
/* landing.css:1595-1597 — current, dead */
.landing-root .lp-story-swap {
  animation: lp-story-swap 600ms var(--lp-ease) both;
}

/* landing.css:1744-1753 — current, dead */
@keyframes lp-story-swap {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* landing.css:1240-1242 — current, dead */
.landing-root .lp-story-swap {
  animation: none;
}
```

`StorySteps.tsx` no longer renders `lp-story-swap` anywhere. Plan 012 shipped the
TSX half of this migration and marked it DONE; its CSS half is missing from the
current tree. This plan restores it.

## Target

All three panels occupy one grid cell. Only the active one is opaque and
interactive. The change is a CSS transition (retargetable mid-flight), not a
keyframe animation, so reversing the scroll never restarts it from zero.

```css
/* src/features/marketing/landing/landing.css — insert after the
   .lp-story-stage-card rule (currently ends at line 1610) */
.landing-root .lp-story-stage-visuals {
  display: grid;
  place-items: center;
}

.landing-root .lp-story-stage-panel {
  grid-area: 1 / 1;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(0.992);
  transition:
    opacity 240ms var(--lp-ease),
    transform 240ms var(--lp-ease);
  pointer-events: none;
}

.landing-root .lp-story-stage-panel[data-active="true"] {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.landing-root .lp-story-stage-panel > * {
  width: 100%;
  max-width: min(44rem, 86vh);
  margin-inline: auto;
}
```

Exact values, all from the audit playbook and the repo's own token:

- 240ms for both properties — under the 300ms UI budget.
- `var(--lp-ease)` = `cubic-bezier(0.16, 1, 0.3, 1)`, defined at `landing.css:60`.
  Do not substitute `ease-in` or a browser default.
- `translate3d(0, 8px, 0) scale(0.992)` — never `scale(0)`; the entry starts near
  full size and only shifts a few pixels.
- `transform` and `opacity` only. No layout property (`width` on the child is a
  static constraint, not animated).

Reduced motion: replace the dead swap override at `landing.css:1240-1242` inside
the `@media (prefers-reduced-motion: reduce)` block that starts at line 1178:

```css
.landing-root .lp-story-stage-panel {
  opacity: 0;
  transform: none;
  transition: none;
}

.landing-root .lp-story-stage-panel[data-active="true"] {
  opacity: 1;
}
```

This keeps the final state legible with zero movement and keeps the visual and
`aria-hidden` states in agreement. Do not nuke all feedback globally — only
this panel transition is removed.

Delete the dead keyframes and rule:

- `landing.css:1595-1597` — the `.lp-story-swap` rule.
- `landing.css:1744-1753` — the `@keyframes lp-story-swap` block.

## Repo conventions to follow

- Landing easing token: `--lp-ease: cubic-bezier(0.16, 1, 0.3, 1);` at
  `src/features/marketing/landing/landing.css:60`.
- Motion-ready/reduced-motion gating: `LandingMotion.tsx` sets
  `data-motion="on"|"off"` on `.landing-root`; the master reduced-motion media
  block is `landing.css:1178-1271`.
- Exemplar for the same pattern: plan 012's target (the rules above are that
  target, with the duration already inside the UI budget).
- Tests live beside the feature (`LandingPage.test.tsx`); no new test file is
  needed — the existing `#features .lp-fig svg` count of 6 must still pass.

## Steps

1. In `src/features/marketing/landing/landing.css`, insert the four panel rules
   above immediately after the `.lp-story-stage-card` rule (after line 1610).
2. In the reduced-motion media block, replace the three lines at 1240-1242 with
   the two panel rules above.
3. Delete the `.lp-story-swap` rule at 1595-1597.
4. Delete the `@keyframes lp-story-swap` block at 1744-1753.
5. Do not edit `StorySteps.tsx` — the panel markup and `data-active` are already
   correct. Do not edit `FigureStage.tsx` or anything under `figures/`.

## Boundaries

- Do NOT touch the card's background, border or shadow — that is plan 017.
- Do NOT touch the rail (`--lp-step-progress`, the 500ms fill) or the story body
  transition; both are settled and documented as deliberate.
- Do NOT add dependencies, keyframes, `ease-in`, `transition: all`, or layout
  animation.
- Do NOT change step copy, order, or markup semantics.
- If `StorySteps.tsx` no longer renders `.lp-story-stage-panel` when you open it,
  STOP and report the drift instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit --pretty false` (expect no new errors
  from touched files); `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing`
  (existing landing tests, including the six-SVG count, must pass).
- **Mechanical**: `grep -n 'lp-story-stage-panel\|lp-story-swap' src/features/marketing/landing/landing.css`
  → panel rules present, zero `lp-story-swap` references.
- **Feel check**: load the landing page at ≥1024px and scroll slowly through
  `#features`:
  - Exactly one figure is visible at a time; the other two are not stacked
    underneath it.
  - Each step change fades/slides over ~240ms — no hard cut.
  - Scroll down two steps, then immediately back up: the incoming panel
    retargets from its current opacity instead of jumping back to the keyframe's
    zero state.
  - In DevTools Animations at 10% playback, confirm the panel animates only
    `opacity` and `transform`.
  - Toggle `prefers-reduced-motion` in the Rendering panel: the active figure is
    shown immediately with no movement, and inactive figures are hidden.
- **Done when**: only the active panel is visible, the swap is a 240ms
  transform/opacity transition using `var(--lp-ease)`, no `lp-story-swap`
  references remain, and reduced motion shows the active figure instantly.

## Execution record — 2026-11-24

Executed in place on the working tree stamped above (HEAD lacks these rules, so
an isolated worktree would have drifted). Edits landed in
`src/features/marketing/landing/landing.css` only:

- Added `.lp-story-stage-visuals`, `.lp-story-stage-panel`,
  `.lp-story-stage-panel[data-active="true"]` and
  `.lp-story-stage-panel > *` with the exact target values.
- Replaced the reduced-motion `lp-story-swap` override with panel rules.
- Deleted the `.lp-story-swap` rule and `@keyframes lp-story-swap`.

Verified: `tsc --noEmit` clean; `biome format plans/` clean; grep confirms six
`lp-story-stage-panel` references and zero `lp-story-swap`. Landing Vitest:
63 pass / 3 fail, all three pre-existing `BuildProcess` text/provider assertion
drift present at HEAD, unrelated to CSS.

**UNVERIFIED:** in-browser feel checks (crossfade on rapid scroll reversal,
10% Animations playback, reduced-motion toggle) — no dev server available.
