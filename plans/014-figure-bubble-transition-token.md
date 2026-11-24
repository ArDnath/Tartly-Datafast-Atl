# 014 — Figure bubble reposition uses landing motion token

- **Status**: TODO
- **Commit**: `8500206`
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, ~3 lines

## Problem

When a figure bubble makes a large jump, `FigureStage` applies an inline transition with a hardcoded easing curve. The duration is reasonable, but the easing bypasses the landing motion token and is a near-duplicate of `--lp-ease`. This makes the figure motion drift from the rest of the landing page's motion language.

Current code:

```tsx
/* src/features/marketing/landing/figures/FigureStage.tsx:129-142 */
if (node.bx !== item.x || node.by !== item.y) {
  const dx = item.x - (node.bx ?? item.x);
  const dy = item.y - (node.by ?? item.y);
  const jump = Math.hypot(dx, dy);
  if (!reduce && jump > 12) {
    group.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)';
    node.bTransUntil = performance.now() + 260;
  } else if ((node.bTransUntil ?? 0) < performance.now()) {
    group.style.transition = 'none';
  }
  group.style.transform = `translate(${item.x}px, ${item.y}px)`;
  node.bx = item.x;
  node.by = item.y;
}
```

## Target

Reuse the landing easing token so figure motion stays cohesive with the page. Keep the 240ms duration (under the 300ms UI budget) and keep the reduced-motion/no-transition path unchanged. Do not add a JS constant unless the figures already share one; a CSS custom property reference is sufficient here because the inline style resolves against the landing root.

```tsx
/* target */
if (!reduce && jump > 12) {
  group.style.transition = 'transform 240ms var(--lp-ease)';
  node.bTransUntil = performance.now() + 260;
} else if ((node.bTransUntil ?? 0) < performance.now()) {
  group.style.transition = 'none';
}
```

`--lp-ease` is defined in `src/features/marketing/landing/landing.css:54` as:

```css
--lp-ease: cubic-bezier(0.16, 1, 0.3, 1);
```

This is a small easing normalization from `cubic-bezier(0.22, 1, 0.36, 1)` to the shared landing ease-out. The visual difference should be subtle; confirm it in the feel check.

## Repo conventions to follow

- Landing motion token: `--lp-ease: cubic-bezier(0.16, 1, 0.3, 1);` in `src/features/marketing/landing/landing.css:54`.
- Figure DOM updates happen imperatively inside `paint()` in `src/features/marketing/landing/figures/FigureStage.tsx`; this code intentionally avoids React renders for pointer/animation updates.
- Reduced motion is already respected: `reducedMotion()` gates the animated transition and the `else if ((node.bTransUntil ?? 0) < performance.now())` branch restores `transition: none`.
- Existing exemplar: most landing transitions use `var(--lp-ease)` (see `landing.css` reveal/story transitions).

## Steps

1. In `src/features/marketing/landing/figures/FigureStage.tsx`, update the bubble jump transition at the `jump > 12` branch to use `transform 240ms var(--lp-ease)` instead of the hardcoded cubic-bezier.
2. Leave `node.bTransUntil = performance.now() + 260;` unchanged so the transition-clearing guard still covers the 240ms animation.
3. Leave the reduced-motion path and `transition: 'none'` fallback unchanged.
4. Do not introduce a new shared JS constant unless you find an existing figure motion-constants module; there is no such module today.

## Boundaries

- Do NOT touch figure math, pose generation, or the 30fps loop in `src/features/marketing/landing/figures/loop.ts`.
- Do NOT change bubble jump threshold (`12`), duration (`240ms`), or the `260ms` clear guard unless you verify the feel requires it.
- Do NOT add new dependencies.
- Do NOT change markup structure; this is a motion-property value change only.
- If `FigureStage.tsx` has drifted so the bubble transition is no longer at the cited location, STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec vitest run src/features/marketing/landing/figures/figures.test.ts src/features/marketing/landing/LandingPage.test.tsx`. Expect existing landing/figure tests to pass.
- **Feel check**: open the landing page and hover/interact with a figure that moves bubbles (attribution rails / any figure producing >12px bubble jumps). Confirm the bubble reposition still animates smoothly and feels consistent with other landing transitions.
  - In DevTools, set Animations to 10% and confirm the bubble moves via transform transition, not by jumping instantly (except reduced motion).
  - Toggle `prefers-reduced-motion` in the Rendering panel and confirm bubble jumps apply immediately with no animated transition.
- **Done when**: no hardcoded cubic-bezier remains for the bubble reposition transition in `FigureStage.tsx`, the transition uses `var(--lp-ease)`, and reduced-motion behavior is unchanged.
