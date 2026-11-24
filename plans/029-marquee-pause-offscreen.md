# 029 — Pause the capability marquee while its section is offscreen

- **Status**: DONE
- **Commit**: `dd1a749`
- **Severity**: MEDIUM
- **Category**: Performance (audit cat 5)
- **Estimated scope**: 1 file, ~22 changed lines — `src/features/marketing/landing/sections/CapabilitiesMarquee.tsx`

## Problem

The two capability marquees run a continuous CSS keyframe animation
(`@keyframes scroll`, `transform: translateX(-100%)`) while the section is far
below the fold. There is no visibility gating:

```tsx
// src/features/marketing/landing/sections/CapabilitiesMarquee.tsx:151-172 — current
<Reveal delay={180}>
  {reducedMotion ? (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CAPABILITIES.map(item => (
        <CapabilityCard key={item.question} item={item} fluid />
      ))}
    </div>
  ) : (
    <div className="marquee-fade mt-12 space-y-4">
      <Marquee autoFill pauseOnClick pauseOnHover play speed={32}>
        {FIRST_ROW.map(item => (
          <CapabilityCard key={item.question} item={item} />
        ))}
      </Marquee>
      <Marquee autoFill direction="right" pauseOnClick pauseOnHover play speed={32}>
        {SECOND_ROW.map(item => (
          <CapabilityCard key={item.question} item={item} />
        ))}
      </Marquee>
    </div>
  )}
</Reveal>;
```

This is a CSS animation, **not** a JS rAF loop: `react-fast-marquee@1.6.5`
emits `animation: scroll var(--duration) linear ...` and
`animation-play-state: var(--play)` (`node_modules/react-fast-marquee/dist/index.js:23,112`).
It is still needless continuous compositor work for an element nobody can see.
The library exposes `play?: boolean`
(`node_modules/react-fast-marquee/dist/components/Marquee.d.ts:27`), which maps
directly to `animation-play-state: running | paused` — so gating it is a
one-prop change once visibility is known.

## Target

Observe the `<section>` with an `IntersectionObserver` and pass the resulting
boolean to both marquees' `play` prop. Offscreen → `animation-play-state:
paused`; onscreen → `running`. Reduced motion still renders the static grid and
is untouched.

```tsx
// CapabilitiesMarquee.tsx:3 — target
import { useEffect, useRef, useState } from 'react';
```

```tsx
// CapabilitiesMarquee.tsx — target, inserted after `usePrefersReducedMotion`
// (which ends at line 116)
function useSectionVisible<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => {
      setVisible(entries[0]?.isIntersecting ?? true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}
```

```tsx
// CapabilitiesMarquee.tsx:118-125 — target
export function CapabilitiesMarquee() {
  const reducedMotion = usePrefersReducedMotion();
  const { ref: sectionRef, visible } = useSectionVisible<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="capabilities-title"
      className="relative overflow-hidden border-b border-lp-line bg-lp-card/40"
    >
```

Both marquees change only the `play` prop; all other props stay identical:

```tsx
<Marquee autoFill pauseOnClick pauseOnHover play={visible} speed={32}>
```

```tsx
<Marquee autoFill direction="right" pauseOnClick pauseOnHover play={visible} speed={32}>
```

## Repo conventions to follow

- `usePrefersReducedMotion` in this same file (`CapabilitiesMarquee.tsx:102-116`)
  is the exemplar for a small `matchMedia`/observer hook with `useEffect` and a
  teardown. Mirror its shape: local hook, `useState` initial value, `useEffect`
  with cleanup, returned to the component.
- `useState(true)` for the initial visibility is deliberate: it matches the
  established SSR/first-paint convention recorded for plan 026 in
  `plans/README.md:275` ("single branch with `useState(true)` for a static
  SSR/first paint"). Do not initialise to `false`, which would paint a paused
  marquee before the observer fires.
- Reduced motion is already handled by `usePrefersReducedMotion` at
  `CapabilitiesMarquee.tsx:102-119` (plan 026). Keep that branch exactly as is.
- No easing token applies — the marquee uses the library's `linear` keyframe,
  which audit cat 2 sanctions for constant motion.

## Steps

1. Add `useRef` to the React import at `CapabilitiesMarquee.tsx:3`.
2. Insert `useSectionVisible` after `usePrefersReducedMotion` (after line 116).
3. In `CapabilitiesMarquee`, add
   `const { ref: sectionRef, visible } = useSectionVisible<HTMLElement>();` and
   put `ref={sectionRef}` on the `<section>` element (`:122-125`).
4. Replace the bare `play` prop with `play={visible}` on both `<Marquee>`
   elements at lines 160 and 165. Do not alter `autoFill`, `direction`,
   `pauseOnClick`, `pauseOnHover`, `speed` or children.
5. Run the mechanical checks in Verification. Touch no other file.

## Boundaries

- Do NOT touch the `reducedMotion` static-grid branch, `CAPABILITIES`,
  `FIRST_ROW`/`SECOND_ROW`, `CapabilityCard`, `Reveal` delays, `Parallax`, or
  any CSS file.
- Do NOT add an `IntersectionObserver` polyfill or a new dependency; the
  browser API is used directly, consistent with `figures/loop.ts`.
- Do NOT change the marquee speed, direction or hover/tap pause behaviour.
- If the code at execution time differs from the excerpts above (drift since
  `dd1a749`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` exits 0. `pnpm exec biome check src/features/marketing/landing/sections/CapabilitiesMarquee.tsx` reports no new findings. `grep -n 'play' src/features/marketing/landing/sections/CapabilitiesMarquee.tsx` shows exactly two `play={visible}` props and no bare `play`. `grep -n 'IntersectionObserver\|removeEventListener\|disconnect' ...` shows the observer and its teardown.
- **Feel check**: run the dev server and open `/`. In DevTools → Elements, inspect a `.rfm-marquee` node while the section is offscreen at the top of the page and confirm its computed `animation-play-state` is `paused`; scroll it into view and confirm it becomes `running` without a jump (the CSS animation resumes from its current position). Set playback to 10% in the Animations panel and confirm no visible restart when crossing the threshold. Enable `prefers-reduced-motion` in the Rendering panel and confirm the static grid renders with no marquee nodes at all. Hover and tap a card while visible and confirm pause-on-hover/pause-on-click still work.
- **Done when**: computed `animation-play-state` toggles `paused`/`running` with intersection, typecheck is clean, and the reduced-motion branch is unchanged.

## Execution record — 2026-11-25

- **Files changed**: `src/features/marketing/landing/sections/CapabilitiesMarquee.tsx` (added `useRef` import; inserted `useSectionVisible<T>()` hook after `usePrefersReducedMotion`; wired `sectionRef`/`visible` in component; set `play={visible}` on both `<Marquee>` elements).
- **Mechanical verification**: `pnpm exec biome check src/features/marketing/landing/sections/CapabilitiesMarquee.tsx` — clean after formatting the second marquee props. `grep play` shows only the two `play={visible}` props (plus a false-positive "display" match). `grep IntersectionObserver|disconnect` shows observer creation and teardown. `tsc --noEmit` deferred to end-of-batch.
- **Feel checks**: UNVERIFIED — no dev server/browser available. Human should confirm offscreen `animation-play-state: paused`, onscreen `running`, no restart jump, reduced-motion static grid unchanged, hover/tap pause still works.
