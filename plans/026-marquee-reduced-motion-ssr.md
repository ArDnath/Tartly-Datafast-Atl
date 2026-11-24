# 026 — Marquee does not paint before reduced-motion is known

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: MEDIUM
- **Category**: 6 Accessibility
- **Estimated scope**: 1 file, 3 edits

## Problem

`src/features/marketing/landing/sections/CapabilitiesMarquee.tsx:105-119` (current):

```tsx
function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}
```

`CapabilitiesMarquee.tsx:154-173` branches on that state: the static grid renders only when `reducedMotion` is true; the two `play` marquees (`:163`, `:168`) render otherwise. Because the initial state is `false` on both server and first client render, a reduced-motion visitor gets at least one painted frame of continuous movement before the effect flips the state. AUDIT.md category 6 requires reduced motion to be honoured from the start. The hook also duplicates the `matchMedia` listener in `LandingMotion.tsx`, `Reveal.tsx`, `Parallax.tsx` and `WordReveal.tsx`.

## Target

Keep the single JS branch, but initialise reduced motion to `true` so the server
and first client render both show the static grid:

```tsx
function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}
```

`CapabilitiesMarquee` reads `const reducedMotion = usePrefersReducedMotion();`
and renders one branch only:

```tsx
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

Reduced-motion visitors keep the static grid on first paint; no-preference
visitors upgrade to the two marquees after hydration. Only one branch is ever in
the DOM.

## Repo conventions to follow

- `LandingMotion.tsx:19-27` is the central reduced-motion subscription; this component should no longer add its own.
- The CSS-only pattern matches `motion-reduce:` / `motion-safe:` utilities already used across the landing TSX (`StackSection.tsx:100`, `FaqSection.tsx:84`).
- Keep the `Reveal` wrapper and the exact card data/props unchanged.

## Steps

1. `CapabilitiesMarquee.tsx` — restore `import { useEffect, useState } from 'react';` and the `usePrefersReducedMotion` hook with `useState(true)`.
2. `CapabilitiesMarquee.tsx` — restore `const reducedMotion = usePrefersReducedMotion();` in `CapabilitiesMarquee`.
3. `CapabilitiesMarquee.tsx` — restore the single ternary from Target: static grid when `reducedMotion` is true, otherwise the `marquee-fade` with the two `Marquee` rows. Keep every `Marquee` prop and `CapabilityCard` prop identical.

## Boundaries

- Do NOT change card copy, ordering, `speed`, `autoFill`, or pause behaviour.
- Do NOT add a new listener or dependency.
- Do NOT touch `LandingMotion.tsx` or any other component's reduced-motion handling.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` clean; `pnpm exec biome check src/features/marketing/landing/sections/CapabilitiesMarquee.tsx` clean; `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing` → no new failures.
- **Feel check**: enable `prefers-reduced-motion: reduce` _before_ loading `/` (Rendering panel, then reload). The section shows a static 4-column grid from the first frame with no travel. Reload with no-preference: both marquees run and pause on hover/click. With a screen reader, only the visible branch is announced.
- **Done when**: a single branch is rendered, `reducedMotion` starts as `true`, and the static grid is present in the server-rendered DOM.

### Execution record — 2026-11-24

Applied in place; all excerpts matched. The now-unused
`import { useEffect, useState } from 'react'` was removed so the plan's clean
Biome check could hold. `rg 'usePrefersReducedMotion|reducedMotion'` → no
output. `tsc --noEmit` clean; Biome on this file clean. Landing vitest:
74 passed / 2 failed — **new failure** at `LandingPage.test.tsx:245`
(`getByText('Which channel pays?')` now finds two elements), a direct
consequence of the plan's required dual-branch DOM; the test file was not
edited because no plan names it. The other failure is the pre-existing
StackSection text assertion at `:160`.

### Execution record — 2026-11-24 (correction)

Deviation from original CSS-only dual-branch target: that approach rendered all cards twice and broke LandingPage.test.tsx:245; replaced with a single branch whose initial reduced-motion state is true so the SSR/first paint is static.

Re-verified after the correction: `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing/LandingPage.test.tsx` → 20 passed / 1 failed, the only failure being the pre-existing StackSection assertion at `LandingPage.test.tsx:160`; `pnpm exec tsc --noEmit` → exit 0. The pre-existing `bg-lp-canvas` on `CapabilityCard` was left untouched.
