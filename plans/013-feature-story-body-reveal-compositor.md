# 013 — Feature story body reveal uses compositor-only motion

- **Status**: DONE
- **Commit**: `8500206`
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, ~35 lines

## Problem

The desktop story body collapse animates `grid-template-rows`, which triggers layout. It runs on occasional active-step changes in a scroll-linked section, but it is still layout work and violates the “animate transform and opacity only” rule.

Current code:

```css
/* src/features/marketing/landing/landing.css:1465-1473 */
.landing-root .lp-story-body {
  display: grid;
  grid-template-rows: 1fr;
}

.landing-root .lp-story-body-inner {
  min-height: 0;
  overflow: hidden;
}
```

```css
/* src/features/marketing/landing/landing.css:1650-1664 */
.landing-root[data-motion="on"] .lp-story-body {
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 480ms var(--lp-ease),
    opacity 240ms var(--lp-ease);
}

.landing-root[data-motion="on"] .lp-story-step[data-active="true"] .lp-story-body {
  grid-template-rows: 1fr;
  opacity: 1;
  transition:
    grid-template-rows 520ms var(--lp-ease),
    opacity 300ms var(--lp-ease) 90ms;
}
```

```css
/* src/features/marketing/landing/landing.css:1217,1239-1242 */
.landing-root .lp-story-body,
/* ... */
.landing-root .lp-story-body {
  grid-template-rows: 1fr;
  opacity: 1;
}
```

## Target

Keep the same information architecture: on desktop motion-ready mode, inactive step bodies are visually hidden and active body is visible. Animate only opacity and transform. Avoid layout animation.

Target CSS:

```css
.landing-root .lp-story-body {
  display: grid;
  grid-template-rows: 1fr;
}

.landing-root .lp-story-body-inner {
  min-height: 0;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .landing-root[data-motion="on"] .lp-story-body {
    opacity: 0;
    transform: translate3d(0, -6px, 0);
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 200ms var(--lp-ease),
      transform 200ms var(--lp-ease),
      visibility 0s linear 200ms;
  }

  .landing-root[data-motion="on"] .lp-story-step[data-active="true"] .lp-story-body {
    opacity: 1;
    transform: none;
    visibility: visible;
    pointer-events: auto;
    transition:
      opacity 240ms var(--lp-ease),
      transform 240ms var(--lp-ease),
      visibility 0s linear 0s;
  }
}
```

Notes:

- `visibility` is not a smooth animated property here; the delay flip prevents hidden content from being focusable/clickable after fade-out while avoiding layout animation. If this causes an undesirable snap, prefer keeping rows at `1fr` and only animating opacity/transform without collapsing height, accepting the extra spacing tradeoff — but do not reintroduce layout-property animation.
- Keep all timing <=300ms and use `var(--lp-ease)`.

## Repo conventions to follow

- Use `--lp-ease` token (`landing.css:54`).
- Motion-ready gating uses `.landing-root[data-motion="on"]` and the reduced-motion guard in `landing.css` around 1217-1265.
- Existing exemplar: reveal and stage panel use transform/opacity transitions (`[data-reveal]`, `.lp-story-stage-panel`).

## Steps

1. Edit `src/features/marketing/landing/landing.css` in the desktop `@media (min-width: 1024px)` story block. Replace the `grid-template-rows` transition on `.landing-root[data-motion="on"] .lp-story-body` and its active variant with transform/opacity/visibility transitions as in Target.
2. Update the reduced-motion block around `1217-1242` so it does not force `grid-template-rows` as the primary reveal mechanism; it should ensure body is visible, opaque, no transform, no transition.
3. Keep the default/mobile rule `grid-template-rows: 1fr` so mobile/no-JS content remains readable.
4. Check for focusable/interactive elements inside story bodies. If any appear in future, `visibility`/`pointer-events` handling prevents hidden active-only content issues; for current plain text/visuals this is safe.

## Boundaries

- Do NOT touch `StorySteps.tsx` unless a tiny class/data hook is strictly required; prefer CSS-only.
- Do NOT animate `grid-template-rows`, `height`, `max-height`, `top`, `margin`, or other layout properties.
- Do NOT change copy or step ordering.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec vitest run src/features/marketing/landing`.
- **Feel check**: desktop scroll through features. Active step body should fade/shift in subtly; inactive bodies should hide without layout jank. Confirm no large gap/overlap regression in the rail.
- In DevTools Performance/Rendering, confirm no layout animation is driven by `grid-template-rows` during step changes.
- Toggle `prefers-reduced-motion`: all step bodies should be readable without movement.
- **Done when**: no `grid-template-rows` transition remains for story body reveal/collapse, and step body visibility changes use transform/opacity only (plus non-animated visibility/pointer-events management).
