# 028 — Stop the hero fold from forcing layout on every pointermove

- **Status**: DONE
- **Commit**: `dd1a749`
- **Severity**: HIGH
- **Category**: Purpose & frequency; Performance (audit cats 1 and 5)
- **Estimated scope**: 1 file, ~25 changed lines — `src/features/marketing/landing/motion/FoldText.tsx`

## Problem

The hero's three `FoldText` words have `hoverRefold: true` and `refoldAngle: 45`
(`src/features/marketing/landing/sections/HeroSection.tsx:108-110`), so the
pointer listeners at `FoldText.tsx:379-383` are live on the primary hero:

```ts
// src/features/marketing/landing/motion/FoldText.tsx:379-383 — current
if (refold) {
  window.addEventListener('pointermove', handleMove, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', handleLeave);
}
```

Every one of those pointer events calls `aim()`, whose first statement reads
layout:

```ts
// src/features/marketing/landing/motion/FoldText.tsx:321-322 — current
const aim = () => {
  const box = root.getBoundingClientRect();
```

```ts
// src/features/marketing/landing/motion/FoldText.tsx:367-377 — current
const handleMove = (event: PointerEvent) => {
  pointer = { x: event.clientX, y: event.clientY };
  aim();
};
const handleLeave = () => {
  pointer = null;
  aim();
};
const handleScroll = () => {
  if (pointer) aim();
};
```

Meanwhile GSAP writes `transform` and `opacity` on every letter each frame via
`gsap.ticker.add(relax)` (`FoldText.tsx:361-365` → `render()` at `:219-245`).
Reading `getBoundingClientRect()` after those pending style writes forces a
synchronous layout flush at pointer rate (up to ~120 Hz on high-refresh
devices), followed by a `Math.hypot` loop over every letter (`:342-353`).
Audit cat 1 puts 100+ times/day interactions in the "no animation, ever" tier;
cat 5 requires that high-frequency work stay off the layout path. This is the
highest-leverage remaining motion fix on the landing page.

## Target

Read the rect at most once per animation frame, and let `handleMove` do nothing
but store coordinates plus schedule that read. The visible fold behaviour is
unchanged; a rect stale by at most one frame is immaterial to a 140px
hit-test radius.

```ts
// src/features/marketing/landing/motion/FoldText.tsx — target, inserted
// immediately before `const aim = () => {`
let cachedBox: DOMRect | null = null;
let boxFrame = 0;

const refreshBox = () => {
  cachedBox = root.getBoundingClientRect();
  return cachedBox;
};

const scheduleBoxRefresh = () => {
  if (boxFrame) return;
  boxFrame = window.requestAnimationFrame(() => {
    boxFrame = 0;
    refreshBox();
  });
};
```

```ts
// FoldText.tsx:321-322 — target (first two lines of `aim`)
const aim = () => {
  const box = cachedBox ?? refreshBox();
```

```ts
// FoldText.tsx:367-370 — target
const handleMove = (event: PointerEvent) => {
  pointer = { x: event.clientX, y: event.clientY };
  scheduleBoxRefresh();
  aim();
};
```

```ts
// FoldText.tsx:375-377 — target
const handleScroll = () => {
  if (!pointer) return;
  scheduleBoxRefresh();
  aim();
};
```

Add a resize refresh inside the existing `if (refold) { ... }` block so a
layout change without pointer movement still updates the cached rect:

```ts
// FoldText.tsx — target, added inside `if (refold)` after handleLeave's listener
window.addEventListener('resize', scheduleBoxRefresh, { passive: true });
```

Extend the existing cleanup at `FoldText.tsx:385-394` (motion properties only;
all existing cleanup lines stay):

```ts
window.removeEventListener('resize', scheduleBoxRefresh);
if (boxFrame) window.cancelAnimationFrame(boxFrame);
```

The `measure(box)` call at `:337` stays where it is. It is already behind the
`near && size-changed` guard, so with the rect now refreshed once per frame it
runs at most once per frame too. Do **not** change it.

## Repo conventions to follow

- The pointer/scroll listeners are already `{ passive: true }` and gated behind
  `refold` (`FoldText.tsx:379-383`); keep both. `refold` is `0` under reduced
  motion (`:192`), which already disables the whole handler set — no new
  `prefers-reduced-motion` branch is needed.
- GSAP is the owner of per-frame writes (`gsap.ticker`, `:361-365`). Do not
  replace any of it with CSS animation or a new library.
- Landing easing/duration tokens live in `landing.css:60-63` (`--lp-ease`,
  `--lp-move`). This plan introduces no new token and changes no curve or
  duration.
- `scheduleBoxRefresh` mirrors the rAF-throttle pattern already used by the
  landing's scroll frame helper (`motion/scrollFrame.ts`): coalesce work to one
  frame and cancel the pending frame on teardown.

## Steps

1. In `FoldText.tsx`, insert `cachedBox`, `boxFrame`, `refreshBox` and
   `scheduleBoxRefresh` immediately before `const aim = () => {`, exactly as in
   the Target section.
2. Replace the first statement of `aim()` with `const box = cachedBox ?? refreshBox();`.
   Remove the old `const box = root.getBoundingClientRect();` line — it must be
   the **only** `getBoundingClientRect()` call in this file after the change,
   and it must live inside `refreshBox`.
3. Rewrite `handleMove` and `handleScroll` to the Target code. Leave
   `handleLeave` unchanged (it still calls `aim()` and can use the cached rect).
4. Add the `resize` listener inside `if (refold) { ... }` and the two cleanup
   lines (`removeEventListener`, `cancelAnimationFrame`) in the existing
   returned teardown function.
5. Run the mechanical checks in Verification. Do not touch any other file.

## Boundaries

- Do NOT touch `HeroSection.tsx`, `FoldText.css`, `landing.css`, or any GSAP
  timeline/stagger values. This is a DOM-read scheduling change only.
- Do NOT change the fold's visual output: same `angle`, `refoldRadius`,
  `stagger`, `translateZ` lift, crease shading, opacity curve and loop.
- Do NOT add dependencies, `will-change`, or a new rAF loop other than the
  single coalesced rect read described above.
- Do NOT add a `prefers-reduced-motion` check; `refold === 0` already removes
  the listeners.
- If the file at execution time differs from the excerpts above (drift since
  `dd1a749`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` exits 0. `pnpm exec biome check src/features/marketing/landing/motion/FoldText.tsx` reports no _new_ findings. `grep -n 'getBoundingClientRect' src/features/marketing/landing/motion/FoldText.tsx` returns exactly one hit — inside `refreshBox`. `grep -n 'addEventListener(.resize' ...` and `grep -n 'cancelAnimationFrame' ...` each return one hit.
- **Feel check**: run the dev server and open `/`. In Chrome DevTools → Performance, record 5 seconds while sweeping the pointer slowly across the hero headline, then repeat with a fast back-and-forth sweep. Confirm the "Layout" track shows at most one forced layout per frame tied to the rAF callback, not one per pointer event. In DevTools → Animations, set playback to 10% and confirm the letters still track the pointer smoothly with no snap-back. Resize the window with the pointer parked on the headline and confirm the hit area follows the new text position. Toggle `prefers-reduced-motion` (Rendering panel) and confirm no pointer listener is attached and the fold is static.
- **Done when**: the single `getBoundingClientRect()` call site is confirmed, typecheck is clean, and the Performance recording shows no per-pointer-event layout flush.

## Execution record — 2026-11-25

- **Files changed**: `src/features/marketing/landing/motion/FoldText.tsx` (added `cachedBox`/`boxFrame`/`refreshBox`/`scheduleBoxRefresh` before `aim`; `aim` now uses cached rect; `handleMove`/`handleScroll` schedule rAF box refresh; `resize` listener added in `if (refold)`; cleanup removes resize listener and cancels pending `boxFrame`).
- **Mechanical verification**: `pnpm exec biome check src/features/marketing/landing/motion/FoldText.tsx` — clean (no findings). `grep getBoundingClientRect` returns 2 hits: line 296 `parent.getBoundingClientRect()` inside `measure()` (pre-existing, explicitly kept by plan step/note) and line 325 inside `refreshBox` (the only root-rect read). `grep addEventListener(.resize` → 1 hit (line 402). `grep cancelAnimationFrame` → 1 hit (line 411). `tsc --noEmit` deferred to end-of-batch per global constraint.
- **Feel checks**: UNVERIFIED — no dev server/browser available in this session. Human should run the plan's Performance/Animations/reduced-motion/resize checks.
