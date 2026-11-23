# 011 — Feature story rail progress tracks each step segment

- **Status**: DONE
- **Commit**: `8500206`
- **Severity**: HIGH
- **Category**: Purpose & frequency / Cohesion
- **Estimated scope**: 2 files, ~40 lines

## Problem

The scroll story rail no longer fills as the reader moves through steps. The refactor moved from one rail bar to per-step rail segments, but the JS still writes a single global progress variable to the rail element while CSS reads a per-step variable on each segment. The fill never appears.

Current code:

```tsx
/* src/features/marketing/landing/sections/StorySteps.tsx:100-137 */
  useEffect(() => {
    const fills: number[] = [];

    const update = () => {
      const track = trackRef.current;

      // jsdom and a pre-layout frame report a zero-height box; wait for a real
      // measurement so the story never reports an active step it cannot see.
      const trackRect = track?.getBoundingClientRect();
      if (!track || !trackRect || trackRect.height < 1) {
        return;
      }

      // The rail scrolls with the page; a viewport-fixed reading line is what
      // makes steps activate as they pass through the pinned/sticky region.
      const line = window.innerHeight * 0.44;

      let next = 0;
      for (let index = 0; index < stepRefs.current.length; index += 1) {
        const step = stepRefs.current[index];
        if (!step) {
          continue;
        }

        const rect = step.getBoundingClientRect();
        if (rect.top <= line) {
          next = index;
        }

        // Each step owns its rail segment; fill it as the reading line travels
        // through the step, so the progress tracks the step you are on rather
        // than painting every segment at once.
        const fill =
          rect.height > 0 ? Math.min(Math.max((line - rect.top) / rect.height, 0), 1) : 0;
        const rounded = Math.round(fill * 1000) / 1000;
        if (rounded !== fills[index]) {
          fills[index] = rounded;
          step.style.setProperty('--lp-step-progress', String(rounded));
        }
      }

      setActive(previous => (previous === next ? previous : next));
    };
```

```tsx
/* src/features/marketing/landing/sections/StorySteps.tsx:158-173 */
      <ol ref={trackRef} className="lp-story-rail">
        {steps.map((step, index) => {
          const number = String(index + 1).padStart(2, '0');
          const isActive = index === active;

          return (
            <li
              key={step.key}
              ref={element => {
                stepRefs.current[index] = element;
              }}
              className="lp-story-step"
              data-active={isActive ? 'true' : 'false'}
              aria-current={isActive ? 'step' : undefined}
              style={{ '--lp-step-progress': 0 } as React.CSSProperties}
            >
```

```css
/* src/features/marketing/landing/landing.css:1380-1400 */
.landing-root .lp-story-step::before,
.landing-root .lp-story-step::after {
  content: "";
  position: absolute;
  top: 0.35rem;
  bottom: 0.35rem;
  left: 0;
  width: 2px;
  border-radius: 999px;
}

.landing-root .lp-story-step::before {
  background: #e5dccb;
}

.landing-root .lp-story-step::after {
  background: #ff4f00;
  transform: scaleY(var(--lp-step-progress, 0));
  transform-origin: top center;
  transition: transform 120ms linear;
}
```

The JS is already close to correct in the working tree, but verify it matches exactly: each `li.lp-story-step` must own `--lp-step-progress` and no global `--lp-story-progress` should remain. The old broken state was `track.style.setProperty('--lp-story-progress', ...)` with CSS reading `--lp-step-progress`.

## Target

Each step segment fills as the reading line passes through that step. The fill is a transform scale, not layout. Past steps are fully filled, the current step is partially filled, future steps are empty.

```tsx
/* target JS shape inside update() */
const line = window.innerHeight * 0.44;
let next = 0;
for (let index = 0; index < stepRefs.current.length; index += 1) {
  const step = stepRefs.current[index];
  if (!step) continue;
  const rect = step.getBoundingClientRect();
  if (rect.top <= line) next = index;
  const fill = rect.height > 0 ? Math.min(Math.max((line - rect.top) / rect.height, 0), 1) : 0;
  const rounded = Math.round(fill * 1000) / 1000;
  if (rounded !== fills[index]) {
    fills[index] = rounded;
    step.style.setProperty('--lp-step-progress', String(rounded));
  }
}
setActive(previous => (previous === next ? previous : next));
```

```tsx
/* target li */
<li
  ...
  style={{ '--lp-step-progress': 0 } as React.CSSProperties}
>
```

CSS can remain as-is if it already uses `var(--lp-step-progress, 0)` on `.lp-story-step::after`.

## Repo conventions to follow

- Scroll-driven work uses the shared bus in `src/features/marketing/landing/motion/scrollFrame.ts` via `subscribeScroll(update)`.
- Motion-ready/reduced-motion behavior is gated by `.landing-root[data-motion="on"]` / `LandingMotion.tsx`; do not add JS animation loops.
- Landing easing token is `--lp-ease: cubic-bezier(0.16, 1, 0.3, 1)` in `src/features/marketing/landing/landing.css:54`.
- Existing exemplar: `StorySteps.tsx` already uses rAF-throttled scroll bus, rect measurement, and per-node style writes.

## Steps

1. In `src/features/marketing/landing/sections/StorySteps.tsx`, confirm the `fills: number[]` cache exists in the `useEffect` and no `shownProgress` / `--lp-story-progress` writes remain.
2. In the same file, confirm the rail `<ol>` no longer sets `--lp-story-progress`; each step `<li>` must set `style={{ '--lp-step-progress': 0 } as React.CSSProperties}`.
3. In `src/features/marketing/landing/landing.css`, confirm `.lp-story-step::after` reads `scaleY(var(--lp-step-progress, 0))`. Do not switch to layout properties.
4. Keep the scroll handler cheap: no React state per frame, only style writes when rounded value changes, and keep `setActive` guarded by equality.

## Boundaries

- Do NOT touch figure code under `src/features/marketing/landing/figures/`.
- Do NOT change step copy, markup semantics, or `BuildProcess`.
- Do NOT add new dependencies.
- Do NOT animate layout properties; keep the fill on `transform`.
- If the working-tree StorySteps has diverged from this plan (different class names/structure), STOP and report the drift rather than guessing.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit --pretty false` (expect exit 0 or no new errors from touched files; note repo may have unrelated in-flight issues) and `pnpm exec vitest run src/features/marketing/landing` (expect existing landing tests pass except known unrelated failures documented in plans/README).
- **Feel check**: open the landing page at desktop width, scroll through `#features`. Confirm the orange rail segment fills only for the step the reading line is inside; completed steps stay full; upcoming steps stay empty.
- In DevTools Animations/Rendering slow motion is not necessary; scroll slowly and confirm the fill tracks continuously.
- Toggle `prefers-reduced-motion` in Rendering panel: rail fill should still reflect position (it is scroll-linked feedback), and no extra motion should be introduced.
- **Done when**: no `--lp-story-progress` references remain, each step `li` owns `--lp-step-progress`, and the rail visibly fills per step during scroll.
