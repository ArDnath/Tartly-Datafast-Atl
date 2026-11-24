# 012 — Feature story stage swap is wired and animated

- **Status**: DONE
- **Commit**: `8500206`
- **Severity**: HIGH
- **Category**: Missed opportunities / Physicality & origin / Easing & duration
- **Estimated scope**: 2 files, ~90 lines

## Problem

The desktop stacked feature stage hard-cuts between figures. `StorySteps.tsx` remounts the active visual with `key={current.key}` inside `.lp-story-swap`, but there is no `.lp-story-swap` animation in CSS. At the same time, the CSS contains unused `.lp-story-stage-visuals` / `.lp-story-stage-panel` crossfade rules and the TSX renders stage chrome classes (`lp-story-stage-head`, `lp-story-stage-foot`, `lp-story-stage-num`, `lp-story-stage-kicker`, `lp-story-stage-stat`, `lp-story-ticks`, `lp-story-stage-count`, `lp-story-stage-visual`) that have no current CSS. The stage is structurally out of sync.

Current code:

```tsx
/* src/features/marketing/landing/sections/StorySteps.tsx:201-228 */
<div className="lp-story-stage">
  <div ref={stickyRef} className="lp-story-sticky">
    <div className="lp-story-swap" key={current.key}>
      <div className="lp-story-stage-card">
        <div className="lp-story-stage-head">
          <span className="lp-story-stage-num">{currentNumber}</span>
          {current.kicker ? <span className="lp-story-stage-kicker">{current.kicker}</span> : null}
          {current.stat ? <span className="lp-story-stage-stat">{current.stat}</span> : null}
        </div>

        <div className="lp-story-stage-visual">{current.visual}</div>

        <div className="lp-story-stage-foot" aria-hidden="true">
          <span className="lp-story-ticks">
            {steps.map((step, index) => (
              <span key={step.key} data-on={index <= active ? 'true' : 'false'} />
            ))}
          </span>
          <span className="lp-story-stage-count">
            {currentNumber} / {total}
          </span>
        </div>
      </div>
    </div>
  </div>
</div>;
```

```css
/* src/features/marketing/landing/landing.css:1534-1571 */
.landing-root .lp-story-stage-card {
  position: relative;
}

.landing-root .lp-story-stage-visuals {
  display: grid;
  min-height: clamp(16rem, 34vw, 26rem);
}

.landing-root .lp-story-stage-panel {
  grid-area: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translate3d(0, 10px, 0) scale(0.992);
  transition:
    opacity 420ms var(--lp-ease),
    transform 520ms var(--lp-ease);
  pointer-events: none;
  will-change: opacity, transform;
}

.landing-root .lp-story-stage-panel[data-active="true"] {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.landing-root .lp-story-stage-panel > * {
  width: 100%;
  max-width: min(44rem, 100%);
  margin-inline: auto;
}
```

```css
/* src/features/marketing/landing/landing.css:1216,1233-1237 */
.landing-root .lp-story-stage-panel,
/* ... */
.landing-root .lp-story-stage-panel {
  opacity: 1;
  transform: none;
  transition: none;
}
```

## Target

Pick the panel architecture already present in CSS: render all step visuals as stacked panels, mark the active one with `data-active`, and let CSS crossfade them. This avoids remounting figures (their internal rAF/DOM nodes stay stable) and makes the existing panel CSS meaningful. Remove unused stage-chrome markup or give it CSS; for the stacked feature story, prefer the lean no-chrome stage already implied by current CSS comment “Stacked feature stage: the drawing carries the meaning, no card chrome.”

Target TSX:

```tsx
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

Target CSS (replace the existing panel timing with UI-budget values and strong ease-out):

```css
.landing-root .lp-story-stage-panel {
  grid-area: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(0.992);
  transition:
    opacity 240ms var(--lp-ease),
    transform 240ms var(--lp-ease);
  pointer-events: none;
  will-change: opacity, transform;
}

.landing-root .lp-story-stage-panel[data-active="true"] {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
```

Keep `var(--lp-ease)` (`cubic-bezier(0.16, 1, 0.3, 1)`, already strong ease-out in this repo). Do not use `ease-in`. Keep under 300ms.

## Repo conventions to follow

- Motion gating: `.landing-root[data-motion="on"]` enables animated reveals; `[data-motion="off"]`/reduced motion must render final state. Existing reduced-motion block already sets `.lp-story-stage-panel { opacity:1; transform:none; transition:none; }` — preserve and update selectors as needed.
- Token: use `var(--lp-ease)` from `src/features/marketing/landing/landing.css:54`.
- Existing exemplar for transform/opacity state swap: `.lp-story-stage-panel` block in `landing.css:1538-1565`.
- Tests live next to landing code (`LandingPage.test.tsx`, `figures/figures.test.ts`); use Vitest.

## Steps

1. In `src/features/marketing/landing/sections/StorySteps.tsx`, replace the keyed `.lp-story-swap` stage body with the panel map shown in Target. Render every `step.visual` once in the stage; set active panel by `data-active`.
2. Remove stale stage chrome variables/markup if unused (`currentNumber`, `total`, stage head/foot/ticks/count/kicker/stat) unless they are needed elsewhere. Keep the stage accessible: inactive panels `aria-hidden="true"`; active panel visible.
3. In `src/features/marketing/landing/landing.css`, update `.lp-story-stage-panel` transition to 240ms transform/opacity with `var(--lp-ease)`. Keep transform+opacity only; do not animate layout.
4. Delete or ignore stale `.lp-story-swap` references; if any remain in CSS, remove them. Keep `.lp-story-stage-visuals` and `.lp-story-stage-panel` rules consistent with the TSX.
5. Confirm reduced-motion handling still applies to `.lp-story-stage-panel` (it already does at `landing.css:1216,1233-1237`).

## Boundaries

- Do NOT change `FigureStage` internals, figure math, or the 30fps loop.
- Do NOT remount figures on every active change; keep them mounted in panels.
- Do NOT add new dependencies.
- Do NOT change rail copy/step semantics except stage markup needed for this fix.
- Do NOT introduce `ease-in`, `transition: all`, or layout-property animation.
- If StorySteps has been intentionally redesigned away from panels in the meantime, STOP and report drift.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec vitest run src/features/marketing/landing`. Fix any test expecting old stage markup only if that markup is truly removed.
- **Feel check**: on desktop (`lg`), scroll the features section so active step changes. Confirm the outgoing figure fades/slides subtly out and incoming fades/slides in; no hard cut, no big jump, no bounce.
- In DevTools, set Animations to 10% and confirm the panel animates only opacity and transform.
- Toggle `prefers-reduced-motion`: active panel should be visible immediately with no movement.
- Confirm figure hover/readout still works on the active panel.
- **Done when**: no `.lp-story-swap` keyed remount controls the stage, all stage panels exist in DOM, active panel crossfades with <=300ms transform/opacity, and reduced motion disables the transition.
