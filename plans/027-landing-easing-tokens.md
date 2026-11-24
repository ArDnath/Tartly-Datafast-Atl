# 027 — Landing easing curves live in tokens

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: LOW
- **Category**: 7 Cohesion & tokens
- **Estimated scope**: 1 file, 7 edits

## Problem

`src/features/marketing/landing/landing.css:60` defines:

```css
  --lp-ease: cubic-bezier(0.16, 1, 0.3, 1);
```

The identical curve is hand-typed in the same file at `:276` (`lp-rise`), `:281` (`lp-kpi-in`), `:286` (`lp-bar-rise`) and `:290` (`lp-row-in`), e.g.:

```css
  animation: lp-rise 640ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

A second curve, `cubic-bezier(0.2, 0, 0, 1)`, is typed twice: `:295` (`lp-price-tick`) and `:1079` (`.lp-seg-thumb`).

```css
  animation: lp-price-tick 180ms cubic-bezier(0.2, 0, 0, 1) both;
  transition: translate 200ms cubic-bezier(0.2, 0, 0, 1);
```

AUDIT.md category 7: "Curves and durations should live as shared tokens. Five hand-typed cubic-beziers that almost match is a consolidation finding."

## Target

Add one token next to `--lp-ease` in `.landing-root` and reference both tokens everywhere:

```css
  /* One weighted curve for every entrance. Never a browser default. */
  --lp-ease: cubic-bezier(0.16, 1, 0.3, 1);

  /* On-screen movement: the existing segmented-control / price-tick curve. */
  --lp-move: cubic-bezier(0.2, 0, 0, 1);
```

```css
  animation: lp-rise 640ms var(--lp-ease) both;
  animation: lp-kpi-in 520ms var(--lp-ease) both;
  animation: lp-bar-rise 680ms var(--lp-ease) both;
  animation: lp-row-in 420ms var(--lp-ease) both;
  animation: lp-price-tick 180ms var(--lp-move) both;
  transition: translate 200ms var(--lp-move);
```

Do NOT change any duration, delay, or the numeric curve values — this is a token consolidation, not a feel change. Do NOT switch `--lp-move` to the AUDIT.md example `cubic-bezier(0.77, 0, 0.175, 1)` without a visual check; the current value is the repo's established motion.

## Repo conventions to follow

- Easing tokens live in `.landing-root` at `landing.css:41-72`; add `--lp-move` there.
- The exemplar for correct reference is `landing.css:300` (`animation: lp-attention 720ms var(--lp-ease)`).
- `--rj-ease` / `--rj-spring` in `journey/journey.css:21-22` are a deliberately scoped palette for that section — out of scope for this plan.

## Steps

1. `landing.css:60` — add `--lp-move: cubic-bezier(0.2, 0, 0, 1);` immediately after `--lp-ease`, with the comment in Target.
2. `landing.css:276, 281, 286, 290` — replace `cubic-bezier(0.16, 1, 0.3, 1)` with `var(--lp-ease)` in the four `animation` shorthands.
3. `landing.css:295` — replace `cubic-bezier(0.2, 0, 0, 1)` with `var(--lp-move)`.
4. `landing.css:1079` — replace `cubic-bezier(0.2, 0, 0, 1)` with `var(--lp-move)`.
5. Mechanical check: `rg 'cubic-bezier' src/features/marketing/landing/landing.css` returns only the two token definitions (plus any unrelated pre-existing appearance outside the lines above — report rather than edit it).

## Boundaries

- Do NOT edit `journey.css`, `process.css`, `HeroPreview.module.css`, or any TSX file.
- Do NOT change durations, delays, or keyframe bodies.
- Do NOT add new tokens beyond `--lp-move`.

## Verification

- **Mechanical**: `pnpm exec biome check src/features/marketing/landing/landing.css` clean except the pre-existing `'Poppins'` quote finding; `pnpm exec tsc --noEmit` clean; `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing` → no new failures.
- **Feel check**: reload `/`; the KPI/card entrances and price tick look identical. Toggle the monthly/yearly segmented control: the thumb slides on the same curve as before. In DevTools computed styles, those elements report `var(--lp-ease)` / `var(--lp-move)` resolved to the original curves.
- **Done when**: only the two token definitions contain hardcoded cubic-beziers in `landing.css`.

### Execution record — 2026-11-24

Applied in place; all seven excerpts matched by content (`lp-seg-thumb` rule at
1068 after earlier edits). `rg 'cubic-bezier'` → only the two token definitions
(lines 60 and 63). `tsc --noEmit` clean. Biome on `landing.css` reports only
the pre-existing `'Poppins'` quote finding. Landing vitest 74 passed / 2 failed,
neither related to easing tokens.
