# 023 — Journey rail fill tracks scroll 1:1

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: MEDIUM
- **Category**: 2 Easing & duration / 4 Interruptibility
- **Estimated scope**: 1 file, 1 deletion

## Problem

`src/features/marketing/landing/journey/journey.css:146-157` (current):

```css
.landing-root .rj-rail-fill {
  position: absolute;
  top: 0;
  left: -0.5px;
  width: 2px;
  height: 100%;
  border-radius: 2px;
  background: var(--rj-signal);
  transform: scaleY(0);
  transform-origin: top center;
  transition: transform 500ms var(--rj-ease);
}
```

`src/features/marketing/landing/journey/RevenueJourney.tsx:117-121` writes that transform on every rAF-throttled scroll frame:

```ts
const progress = Math.min(Math.max((line - railRect.top) / railRect.height, 0), 1);
const fill = fillRef.current;
if (fill) {
  fill.style.transform = `scaleY(${Math.round(progress * 1000) / 1000})`;
}
```

A scroll-linked indicator that is re-eased over 500ms on every frame chases the scroll instead of reporting it; reversing direction produces visible catch-up. AUDIT.md category 2 caps UI motion under 300ms and reserves `linear` for constant motion; category 4 requires continuously-driven motion to retarget without restarting. The reduced-motion block at `journey.css:783-791` already sets `transition: none` on `.rj-rail-fill`.

Note: `plans/README.md:116-117` records a deliberate 500ms fill transition, but that is the old `.lp-story-rail-fill` in `landing.css:1407`; `FeaturesSection.tsx:9` now renders `RevenueJourney` and the old figure subsystem is not mounted. This finding concerns the new live `.rj-rail-fill`, which has no documented tradeoff.

## Target

```css
.landing-root .rj-rail-fill {
  position: absolute;
  top: 0;
  left: -0.5px;
  width: 2px;
  height: 100%;
  border-radius: 2px;
  background: var(--rj-signal);
  transform: scaleY(0);
  transform-origin: top center;
}
```

No `transition` declaration on `.rj-rail-fill`; the JS-driven transform applies on the same frame as the scroll update.

## Repo conventions to follow

- `motion/scrollFrame.ts` already throttles the scroll updates to one per frame; do not add a JS animation loop.
- Reduced motion is handled by `LandingMotion.tsx` (`data-motion`) and the `journey.css:783` block — leave both intact.
- The fill is already `transform`-only, which satisfies AUDIT.md category 5; this plan changes only the transition.

## Steps

1. `src/features/marketing/landing/journey/journey.css:156` — delete the line `  transition: transform 500ms var(--rj-ease);`.
2. Leave `journey.css:783-791` unchanged; its `transition: none` for `.rj-rail-fill` remains correct and harmless.
3. Do not edit `RevenueJourney.tsx`.
4. Mechanical check: `rg 'rj-rail-fill' src/features/marketing/landing/journey/journey.css` shows no `transition: transform 500ms`.

## Boundaries

- Do NOT change the reading line, step thresholds, `subscribeScroll`, or any scene animation.
- Do NOT add a 120ms compromise transition; the goal is 1:1 tracking.
- Do NOT touch `landing.css` or plans 016/017.

## Verification

- **Mechanical**: `pnpm exec biome check src/features/marketing/landing/journey/journey.css` clean; `pnpm exec tsc --noEmit` clean.
- **Feel check**: scroll slowly through `#features`; the orange rail edge stays exactly level with the active step's reading line. Flick-scroll down and back up: no lag or catch-up. Toggle `prefers-reduced-motion`: the fill still reflects position with no movement transition.
- **Done when**: no 500ms transition remains and the fill tracks scroll on the same frame.

### Execution record — 2026-11-24

Applied in place; excerpt matched at the stated lines. `rg 'rj-rail-fill'`
→ lines 146 and 783 only; no `transition: transform 500ms`. `tsc --noEmit`
clean. Biome on `journey.css` reports one pre-existing format finding on the
untouched `mask-image: radial-gradient(...)` at line 59. Landing vitest 74
passed / 2 failed, neither related to the rail.
