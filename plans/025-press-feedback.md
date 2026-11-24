# 025 — Add press feedback to the two pressable controls

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: LOW
- **Category**: 3 Physicality & origin
- **Estimated scope**: 2 files, 6 edits

## Problem

`src/features/marketing/landing/landing.css:477-486` (current):

```css
.landing-root .lp-swap {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 0.055em;
  padding: 0 0.08em;
  color: #171717;
  cursor: pointer;
  isolation: isolate;
}
```

It is a `<button>` (`HeroSection.tsx:72-77`) with hover/focus styling but no `:active` state.

`src/features/marketing/landing/process/process.css:137-152` (current):

```css
.landing-root .lp-process-toggle {
  /* ... */
  color: #6b6660;
  transition: color 160ms var(--lp-ease);
}
```

It is a real `<button>` (`ProcessCard.tsx:84-103`) with hover/focus and an icon rotate, but no press confirmation. `process.css:427-429` already gives the submit button `scale(0.98)` on `:active`, establishing the local pattern.

AUDIT.md category 3: press feedback is `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`, kept subtle (0.95–0.98); it explicitly hunts "pressable elements with no press feedback".

## Target

```css
/* landing.css — target */
.landing-root .lp-swap {
  /* keep all existing declarations, add: */
  transition: transform 160ms ease-out;
}

.landing-root .lp-swap:active {
  transform: scale(0.97);
}
```

```css
/* process.css — target */
.landing-root .lp-process-toggle {
  /* keep all existing declarations; replace the transition line with: */
  transition:
    color 160ms ease,
    transform 160ms ease-out;
}

.landing-root .lp-process-toggle:active {
  transform: scale(0.97);
}
```

`ease` for the colour change and `ease-out` for the press follow AUDIT.md category 2's decision order exactly.

Reduced motion drops the positional change but keeps colour feedback:

```css
/* landing.css, inside the existing @media (prefers-reduced-motion: reduce) block */
.landing-root .lp-swap:active {
  transform: none;
}

/* process.css, inside its existing @media (prefers-reduced-motion: reduce) block */
.landing-root .lp-process-toggle:active {
  transform: none;
}
```

## Repo conventions to follow

- `--lp-ease` is the entrance token (`landing.css:60`); press feedback uses literal `ease-out` per AUDIT.md category 3, not the entrance curve.
- `process.css:427-429` is the exemplar for an `:active` scale.
- Reduced-motion rules live in the existing blocks at `landing.css:1166-1264` and `process.css:435-485`; append there, do not create a new media block.

## Steps

1. `landing.css:477-486` — add `transition: transform 160ms ease-out;` to `.landing-root .lp-swap`.
2. `landing.css` immediately after that rule — add `.landing-root .lp-swap:active { transform: scale(0.97); }`.
3. `landing.css` reduced-motion block (before its closing brace at :1264) — add `.landing-root .lp-swap:active { transform: none; }`.
4. `process.css:151` — replace `transition: color 160ms var(--lp-ease);` with the two-line transition in Target.
5. `process.css` after `:158-162` — add `.landing-root .lp-process-toggle:active { transform: scale(0.97); }`.
6. `process.css` reduced-motion block (ends at :485) — add `.landing-root .lp-process-toggle:active { transform: none; }`.
7. Do not change `.lp-swap::before` (`:488-504`) or `.lp-process-toggle-icon` (`:164-172`).

## Boundaries

- Do NOT add a new hover lift or change the highlight swipe.
- Do NOT change button markup, labels, or ARIA.
- Do NOT touch other `:active` rules.

## Verification

- **Mechanical**: `pnpm exec biome check` on both CSS files clean except pre-existing findings; `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing` → no new failures.
- **Feel check**: press and hold a highlighted hero word and a "Show details" toggle. Both depress ~3% over 160ms and return on release; no jump. In DevTools Animations at 10% playback, confirm a transform transition, not a restart. Toggle `prefers-reduced-motion: reduce`: no scale on press, but the toggle's colour still changes on hover.
- **Done when**: both controls have `:active` scale(0.97) and reduced-motion overrides, with no other rules changed.

### Execution record — 2026-11-24

Applied in place; both excerpts matched by content (line numbers shifted after
020). `tsc --noEmit` clean. Biome on `landing.css` / `process.css` reports only
the pre-existing `'Poppins'` quote finding in `landing.css`. Landing vitest
74 passed / 2 failed, neither related to press feedback.
