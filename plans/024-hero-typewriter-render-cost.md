# 024 — Typewriter ticks stop re-rendering the hero demo

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: HIGH
- **Category**: 1 Purpose & frequency / 5 Performance
- **Estimated scope**: 2 files, 3 edits

## Problem

`src/features/marketing/landing/sections/HeroSection.tsx:188-215` runs an endless typewriter:

```ts
const timeout = setTimeout(
  () => {
    setCharIndex(prev => prev + (deleting ? -1 : 1));
  },
  deleting ? 26 : 55,
);
```

`HeroSection` renders `<HeroPreview />` (~`HeroSection.tsx:444`), and `HeroPreview.tsx:811` exports an un-memoized component:

```tsx
export function HeroPreview() {
```

So every 26–55ms state tick re-renders the entire interactive analytics demo (charts, tables, replay controls) even though none of its props change. AUDIT.md category 5 warns about work under load; category 1 says decorative motion on a high-frequency element needs a purpose.

`src/features/marketing/landing/motion/RotatingText.tsx:363` and `:408` (current):

```tsx
        layout={!highlight}
```

`HeroSection.tsx:84` passes `highlight={false}`, so both layout animations are active on every 4200ms auto-rotation and every click. AUDIT.md category 5: "Layout animations (`layout`, `layoutId`) still run on the main thread in every version." The `effect="slide"` (`HeroSection.tsx:82`) already animates transform/opacity, so the layout prop is redundant.

## Target

```tsx
/* HeroPreview.tsx:3 — target */
import { memo, useEffect, useMemo, useRef, useState } from 'react';

/* HeroPreview.tsx:811 — target */
export const HeroPreview = memo(function HeroPreview() {
```

Close the `memo(...)` call at the component's existing final `}` (the function currently ends at the end of the file — add `);` after it).

```tsx
/* RotatingText.tsx:363 and :408 — target: remove both layout props entirely */
      <motion.span
        key={activeIndex}
        className={splitBy === 'lines' ? 'text-rotate-lines' : 'text-rotate-content'}
        aria-hidden="true"
      >
...
      <motion.span
        className={`text-rotate ${highlight ? 'text-rotate-highlight' : ''} ${mainClassName ?? ''}`}
        {...rest}
        style={blockStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
```

Keep `transition`, `MotionConfig reducedMotion="user"`, `AnimatePresence`, and the slide effect untouched.

## Repo conventions to follow

- `motion/RotatingText.tsx` uses `motion` 14.14.0; transform shorthands are hardware-accelerated at this version (AUDIT.md category 5).
- `HeroPreview.tsx:3` already imports React hooks from `react`; add `memo` to that import rather than creating a new one.
- No existing `memo` wrapper in this folder should be duplicated; `rg 'memo\\(' src/features/marketing/landing` before editing to confirm.

## Steps

1. `HeroPreview.tsx:3` — add `memo` to the `react` import.
2. `HeroPreview.tsx:811` — change `export function HeroPreview() {` to `export const HeroPreview = memo(function HeroPreview() {`, and change the component's closing `}` to `});`.
3. `RotatingText.tsx:363` — delete the `layout={!highlight}` line from the keyed `motion.span` inside `AnimatePresence`.
4. `RotatingText.tsx:408` — delete the `layout={!highlight}` line from the outer `motion.span`.
5. Mechanical check: `rg 'layout=\\{!highlight\\}' src/features/marketing/landing/motion/RotatingText.tsx` returns nothing.

## Boundaries

- Do NOT remove the typewriter, the 4200ms auto-rotation, `pauseOnHover`, or the click-to-cycle button (`HeroSection.tsx:71-94`). They are settled hero behaviour.
- Do NOT change `effect="slide"`, stagger timing, or the highlight path used by other callers.
- Do NOT memo `HeroSection` itself — it must still update its placeholder text.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` clean; `pnpm exec biome check` on both files clean except pre-existing findings; `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing` → no new failures.
- **Feel check**: with React DevTools Profiler open, watch the hero for two typewriter words: `HeroPreview` must not appear in the commit list for character ticks, while the placeholder still types. Click a highlighted word: the swap still slides, and DevTools Animations shows no "layout" animation entry. Auto-rotation every 4.2s still works.
- **Done when**: no `layout` prop remains in `RotatingText.tsx`, `HeroPreview` is memoized, and the visible behaviour is unchanged.

### Execution record — 2026-11-24

Applied in place; excerpts matched (`HeroPreview` export at 815 after 021).
`rg 'memo\('` found no prior wrapper before editing;
`rg 'layout=\{!highlight\}'` → no output. `tsc --noEmit` clean. Biome on both
files reports only the pre-existing `organizeImports` finding in
`HeroPreview.tsx` (relative-import order unchanged from HEAD). Landing vitest
74 passed / 2 failed, neither related to these files.
