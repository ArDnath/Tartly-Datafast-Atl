# 032 — Navbar easing uses the landing motion token

- **Status**: DONE
- **Commit**: `dd1a749`
- **Severity**: LOW
- **Category**: 7 Cohesion & tokens
- **Estimated scope**: 1 file, 2 class strings

## Problem

The landing stylesheet defines the shared entrance/movement curve at
`src/features/marketing/landing/landing.css:60`:

```css
  --lp-ease: cubic-bezier(0.16, 1, 0.3, 1);
```

Two elements in the navbar hand-type that exact curve as Tailwind arbitrary
values:

```tsx
/* src/features/marketing/landing/Navbar.tsx:87 — current */
className={`lp-nav-in fixed top-0 right-0 left-0 z-40 transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}
```

```tsx
/* src/features/marketing/landing/Navbar.tsx:146 — current */
className={`lp-menu-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain bg-lp-canvas/95 text-lg font-medium backdrop-blur-md transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:hidden ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
```

This is a duplicate of the token, not a deliberate alternative: plan 027
(`plans/027-landing-easing-tokens.md`, DONE) consolidated the same curve in CSS
but explicitly excluded TSX files at its line 71. A later change to `--lp-ease`
would leave the navbar on the old curve. AUDIT.md category 7 calls for curves
to live as shared tokens.

## Target

Point both utilities at the existing token. Keep every duration, transform,
`motion-reduce:` variant and class order exactly as it is; this is a token
reference change with no feel change.

```tsx
/* Navbar.tsx:87 — target */
className={`lp-nav-in fixed top-0 right-0 left-0 z-40 transition-[transform] duration-300 ease-(--lp-ease) motion-reduce:transition-none ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}
```

```tsx
/* Navbar.tsx:146 — target */
className={`lp-menu-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain bg-lp-canvas/95 text-lg font-medium backdrop-blur-md transition-[transform,opacity] duration-300 ease-(--lp-ease) motion-reduce:transition-none md:hidden ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
```

`ease-(--lp-ease)` is Tailwind CSS v4's parenthesized shorthand for an arbitrary
CSS-variable value (`package.json:188` pins `tailwindcss: ^4.1.18`). It must emit
`transition-timing-function: var(--lp-ease)`. `--lp-ease` resolves on
`.landing-root`, which is an ancestor of `<Navbar />` in
`src/features/marketing/landing/LandingPage.tsx:20-23`.

## Repo conventions to follow

- Easing token: `--lp-ease: cubic-bezier(0.16, 1, 0.3, 1);` at
  `src/features/marketing/landing/landing.css:60`.
- Exemplar of a correct reference: `landing.css:155`,
  `animation: lp-mark-draw 720ms var(--lp-ease) 360ms both;`.
- Plan 027 is the precedent for consolidation; do not add a second token or a JS
  constant.
- Tailwind v4 variable shorthand is documented in the v4 upgrade guide
  ("Using parentheses for variables in arbitrary values").

## Steps

1. In `src/features/marketing/landing/Navbar.tsx:87`, replace only
   `ease-[cubic-bezier(0.16,1,0.3,1)]` with `ease-(--lp-ease)`.
2. In `src/features/marketing/landing/Navbar.tsx:146`, replace only
   `ease-[cubic-bezier(0.16,1,0.3,1)]` with `ease-(--lp-ease)`.
3. Mechanical check: `rg 'cubic-bezier' src/features/marketing/landing/Navbar.tsx`
   returns no matches. Confirm `git diff` shows exactly two changed tokens in
   two class strings and nothing else.
4. If the installed Tailwind build does not emit `transition-timing-function:
   var(--lp-ease)` for `ease-(--lp-ease)`, STOP and report. Do not substitute a
   different class syntax or edit the token without a new finding.

## Boundaries

- Do NOT touch `landing.css`, `plans/027-landing-easing-tokens.md`, or any other
  source file.
- Do NOT change `duration-300`, the translate classes, the `motion-reduce:`
  variants, class ordering, markup, or accessibility attributes.
- Do NOT add dependencies or new easing tokens.
- If either class string has drifted from the excerpt above, STOP and report
  instead of improvising.

## Verification

- **Mechanical**: `pnpm exec biome check src/features/marketing/landing/Navbar.tsx`
  clean apart from pre-existing findings; `pnpm exec tsc --noEmit --pretty false`
  clean; `NODE_ENV=test pnpm exec vitest run
  src/features/marketing/landing/navScrollState.test.ts` passes. If a CSS build
  is available, confirm the generated rule emits
  `transition-timing-function: var(--lp-ease)` for both utilities; otherwise
  label that check UNVERIFIED.
- **Feel check**: load `/` at ≥768px and scroll down then up; the navbar should
  slide in and out on exactly the same curve as before. Open and close the
  mobile menu at 390px; it should still slide from the right over 300ms. Toggle
  `prefers-reduced-motion` in DevTools: both transitions must still be removed
  (`motion-reduce:transition-none`), with no slide.
  - Set Animations playback to 10% and confirm the timing function resolves to
    `cubic-bezier(0.16, 1, 0.3, 1)` — no visible restart or change of curve.
- **Done when**: both class strings reference `ease-(--lp-ease)`, no hardcoded
  cubic-bezier remains in `Navbar.tsx`, and all other declarations are byte-for-byte
  unchanged.

### Execution record — 2026-11-25

Executed in place on the dirty working tree; no worktree, branch, commit, stash,
or reset. Only the two class strings in `Navbar.tsx` changed — the reviewed diff
contains exactly those two `ease-[cubic-bezier(0.16,1,0.3,1)]` →
`ease-(--lp-ease)` substitutions and nothing else. No plan file other than this
status/record was touched by the executor.

Mechanical results: `pnpm exec biome check src/features/marketing/landing/Navbar.tsx`
exit 0 (only the pre-existing `biome.json:18` deprecation notice);
`pnpm exec tsc --noEmit --pretty false` exit 0; `NODE_ENV=test pnpm exec vitest run
src/features/marketing/landing/navScrollState.test.ts` → 1 file, 8 tests, 8 passed;
`rg 'cubic-bezier' src/features/marketing/landing/Navbar.tsx` → no matches (exit 1).

Not run by constraint: `pnpm gate`, full suite, install, production build.
**UNVERIFIED:** no CSS build was available, so emitted
`transition-timing-function: var(--lp-ease)` was not inspected; all feel checks
(desktop scroll, 390px drawer, live reduced-motion toggle, 10% playback) need a
human with the dev server. Syntax was checked against Tailwind v4's upgrade guide
("Using parentheses for variables in arbitrary values") and the installed
`tailwindcss: ^4.1.18` (`package.json:188`).
