# 021 — Hero preview fills move on the compositor

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: HIGH
- **Category**: 5 Performance
- **Estimated scope**: 2 files, 5 edits

## Problem

`src/features/marketing/landing/sections/HeroPreview.module.css:1014-1016` (current):

```css
  transition:
    width 480ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 140ms ease;
```

`HeroPreview.module.css:1207-1213` (current):

```css
.funnelTrack span {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--d-bar-fill), var(--d-accent));
  transition: width 480ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

`HeroPreview.module.css:1413-1424` (current):

```css
.progressTrack span[data-playing="true"] {
  animation: replay-progress 14s linear infinite;
}

@keyframes replay-progress {
  from {
    width: 8%;
  }
  to {
    width: 100%;
  }
}
```

The inline widths are set in `HeroPreview.tsx:222` (`style={{ width: \`${width}%\` }}`) and `HeroPreview.tsx:355` (`style={{ width: \`${Math.max(percent, 2)}%\` }}`).

AUDIT.md category 5 says animate `transform` and `opacity` only — `width` triggers layout + paint + composite. Category 2 caps UI animations under 300ms; 480ms exceeds it. The replay progress restarting at 8% on each play is intentional (a new replay begins from the start) and is not part of this finding.

## Target

```css
/* HeroPreview.module.css — target */
.rowFill {
  /* keep all existing declarations */
  width: 100%;
  transform-origin: left center;
  transition:
    transform 240ms var(--lp-ease),
    background-color 140ms ease;
}

.funnelTrack span {
  /* keep display, height, border-radius, background */
  width: 100%;
  transform-origin: left center;
  transition: transform 240ms var(--lp-ease);
}

.progressTrack span {
  /* keep display, height, border-radius, background */
  width: 100%;
  transform: scaleX(0.38);
  transform-origin: left center;
}

.progressTrack span[data-playing="true"] {
  animation: replay-progress 14s linear infinite;
}

@keyframes replay-progress {
  from {
    transform: scaleX(0.08);
  }
  to {
    transform: scaleX(1);
  }
}
```

```tsx
/* HeroPreview.tsx:222 — target */
<span className={styles.rowFill} style={{ transform: `scaleX(${(width / 100).toFixed(4)})` }} aria-hidden="true" />

/* HeroPreview.tsx:355 — target */
<span style={{ transform: `scaleX(${(Math.max(percent, 2) / 100).toFixed(4)})` }} />
```

`var(--lp-ease)` resolves through `.landing-root` (`landing.css:60`) because the preview is a descendant. Keep `linear` on the 14s progress loop (constant motion) and `ease` on the colour change (hover/colour) exactly as AUDIT.md category 2 prescribes.

## Repo conventions to follow

- `process.css:601-606` already scales a fill with `transform: scaleX(var(--lp-bar-scale, 1)); transform-origin: left center;` — imitate that pattern.
- Easing comes from `--lp-ease` (`landing.css:60`); do not hardcode the curve again.

## Steps

1. `HeroPreview.module.css:1008-1017` — in `.rowFill`, set `width: 100%`, add `transform-origin: left center`, replace the width transition with `transform 240ms var(--lp-ease)`; keep `background-color 140ms ease`.
2. `HeroPreview.module.css:1207-1213` — in `.funnelTrack span`, set `width: 100%`, add `transform-origin: left center`, replace the width transition with `transform 240ms var(--lp-ease)`.
3. `HeroPreview.module.css:1405-1411` — in `.progressTrack span`, set `width: 100%`, add `transform: scaleX(0.38)` and `transform-origin: left center` (preserves the current static 38% bar).
4. `HeroPreview.module.css:1417-1424` — rewrite `@keyframes replay-progress` to animate `transform: scaleX(0.08)` → `scaleX(1)`. Leave the `[data-playing="true"]` rule unchanged.
5. `HeroPreview.tsx:222` and `:355` — change the inline `width` styles to the `transform: scaleX(...)` strings above.
6. Mechanical check: `rg 'width 480ms|@keyframes replay-progress' src/features/marketing/landing/sections/HeroPreview.module.css` shows no `width` animation and the progress keyframes contain only `transform`.

## Boundaries

- Do NOT change markup, class names, data, or the 14s/linear timing of the replay loop.
- Do NOT touch `.frame`'s reduced-motion block (plan 022 owns it).
- Do NOT add dependencies or change `data-playing` handling.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` clean; `pnpm exec biome check src/features/marketing/landing/sections/HeroPreview.tsx src/features/marketing/landing/sections/HeroPreview.module.css` clean (or only pre-existing formatting findings). `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing` → no new failures.
- **Feel check**: open the hero demo, toggle a chart row and switch funnel steps. Bars grow from the left edge in ~240ms. Start a replay: the bar starts at ~8% and fills over 14s. In DevTools Animations at 10% playback, confirm all three fills report `transform` changes, never `width` (no layout purple bars in Performance).
- **Done when**: no `width` transition/keyframe remains in `HeroPreview.module.css` and the bars still read as the same values.

### Execution record — 2026-11-24

Applied in place; all cited excerpts matched at the stated lines. `rg 'width 480ms|@keyframes replay-progress'`
→ only the `@keyframes replay-progress` declaration; its body contains only
`transform: scaleX(...)`. `tsc --noEmit` clean. Biome on the two files reports
only the pre-existing `organizeImports` finding in `HeroPreview.tsx`. Landing
vitest: 74 passed / 2 failed, neither in hero-preview assertions.
