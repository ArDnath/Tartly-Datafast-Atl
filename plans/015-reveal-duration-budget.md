# 015 — Tune landing reveal duration to a crisper budget

- **Status**: TODO
- **Commit**: `8500206`
- **Severity**: LOW
- **Category**: Easing & duration
- **Estimated scope**: 1 file, ~2 lines (optionally 2 files if a component default is also adjusted)

## Problem

The global landing reveal transition runs for 720ms. The easing is already the shared landing ease-out (`var(--lp-ease)`), which is good, but 720ms exceeds the <300ms UI animation budget in `AUDIT.md`. This is a marketing scroll reveal, where longer motion can be acceptable, so it is borderline rather than broken. The risk is that section entrances feel sluggish compared with the rest of the landing page's tighter motion.

Current code:

```css
/* src/features/marketing/landing/landing.css:945-955 */
/*
 * Content is visible by default. Only a motion-ready, hydrated page hides the
 * not-yet-revealed element, which keeps the page readable without JavaScript.
 */
.landing-root[data-motion="on"] [data-reveal] {
  transition:
    opacity 720ms var(--lp-ease),
    transform 720ms var(--lp-ease);
  transition-delay: var(--reveal-delay, 0ms);
}

.landing-root[data-motion="on"] [data-reveal]:not([data-revealed="true"]) {
  opacity: 0;
  transform: translate3d(0, var(--reveal-distance, 32px), 0);
}
```

The reveal delay is supplied by the component:

```tsx
/* src/features/marketing/landing/motion/Reveal.tsx:63-67 */
      style: {
        '--reveal-delay': `${delay}ms`,
        '--reveal-distance': `${distance}px`,
      } as React.CSSProperties,
```

## Target

Reduce the global reveal transition to a crisper duration while preserving the same easing, delay mechanism, distance mechanism, and reduced-motion behavior. Use 280ms, which stays inside the UI budget while still reading as a deliberate section entrance.

```css
/* target */
.landing-root[data-motion="on"] [data-reveal] {
  transition:
    opacity 280ms var(--lp-ease),
    transform 280ms var(--lp-ease);
  transition-delay: var(--reveal-delay, 0ms);
}
```

Keep `var(--lp-ease)` (`cubic-bezier(0.16, 1, 0.3, 1)`, defined at `landing.css:54`). Do not switch to `ease-in`. Do not change the reduced-motion branch at `landing.css:957-961`.

If 280ms feels too abrupt in the live page, 320ms is an acceptable fallback, but pick one value and apply it consistently. Do not leave 720ms.

## Repo conventions to follow

- Landing easing token: `--lp-ease: cubic-bezier(0.16, 1, 0.3, 1)` in `src/features/marketing/landing/landing.css:54`.
- Reveal behavior is CSS-owned: `Reveal.tsx` only sets `data-reveal`, observes intersection, and writes CSS custom properties (`--reveal-delay`, `--reveal-distance`).
- Reduced motion is handled in both places: JS sets `data-revealed="true"` immediately in `Reveal.tsx:32-37`, and CSS forces final state in `landing.css:957-961`.
- Existing exemplar: most landing UI transitions use 200–300ms with `var(--lp-ease)` (e.g., story body/panel transitions around `landing.css:1656-1670`, `1539-1545`).

## Steps

1. In `src/features/marketing/landing/landing.css`, change the `[data-reveal]` transition durations from `720ms` to `280ms`.
2. Keep `transition-delay: var(--reveal-delay, 0ms);` and the hidden/final transform/opacity rules unchanged.
3. Keep the reduced-motion override at `.landing-root[data-motion="off"] [data-reveal]` unchanged.
4. Check the landing page after the change. Because this is a global reveal, confirm it does not make hero/statement entrances feel accidentally abrupt. If it does, adjust to `320ms` (still crisp, slightly softer) rather than reverting to 720ms.
5. Do not change `Reveal.tsx` unless you discover a hardcoded duration assumption; current component code only supplies delay/distance.

## Boundaries

- Do NOT touch unrelated animation timings (word reveal, bar rise, step panel, etc.) unless they are the same `[data-reveal]` rule.
- Do NOT change easing to `ease-in` or `ease`.
- Do NOT animate layout properties.
- Do NOT add new dependencies.
- Do NOT remove reduced-motion handling.
- If the reveal system has been refactored away from `[data-reveal]`, STOP and report drift.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec vitest run src/features/marketing/landing/LandingPage.test.tsx`. Expect existing landing tests to pass.
- **Feel check**: load the landing page and scroll through sections that use `Reveal`. Confirm section entrances feel crisp and intentional, not sluggish.
  - In DevTools, set Animations to 10% and confirm revealed elements animate only opacity and transform over ~280ms (plus any stagger delay).
  - Toggle `prefers-reduced-motion` in Rendering and confirm revealed content appears immediately with no movement.
  - Check at least one heading reveal and one card/section reveal because this rule is global.
- **Done when**: `[data-reveal]` no longer uses 720ms, the chosen duration is <=320ms with `var(--lp-ease)`, and reduced-motion/final-state behavior is unchanged.
