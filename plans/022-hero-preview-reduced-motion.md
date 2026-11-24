# 022 — Hero preview reduced motion keeps feedback

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: MEDIUM
- **Category**: 6 Accessibility
- **Estimated scope**: 1 file, 2 edits

## Problem

`src/features/marketing/landing/sections/HeroPreview.module.css:1795-1803` (current):

```css
@media (prefers-reduced-motion: reduce) {
  .frame *,
  .frame *::before,
  .frame *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

AUDIT.md category 6: reduced motion is "fewer and gentler animations, **not zero** — keep transitions that aid comprehension, remove position changes", and explicitly hunts reduced-motion implementations that nuke all feedback. This blanket rule also kills the theme toggle's colour feedback (`HeroPreview.module.css:61-63`).

Separately, `HeroPreview.module.css:1374-1376` (current) is ungated:

```css
.playButton:hover {
  scale: 1.06;
}
```

AUDIT.md category 6 requires hover movement behind `@media (hover: hover) and (pointer: fine)` because touch fires false hovers on tap.

## Target

```css
/* HeroPreview.module.css — target, replaces lines 1795-1803 */
@media (prefers-reduced-motion: reduce) {
  .scrollHint span,
  .progressTrack span[data-playing="true"] {
    animation: none;
  }

  .playButton:hover {
    scale: 1;
  }
}
```

```css
/* HeroPreview.module.css — target, replaces lines 1374-1376 */
@media (hover: hover) and (pointer: fine) {
  .playButton:hover {
    scale: 1.06;
  }
}
```

Colour/opacity transitions (theme toggle, tab feedback, row hover) remain active under reduced motion. No global `0.01ms` override exists anywhere in this module.

## Repo conventions to follow

- The landing page's hover gate is `@media (hover: hover) and (pointer: fine)` (`landing.css:57`, `landing.css:262`). Use that exact condition.
- `LandingMotion.tsx` already marks `.landing-root[data-motion="off"]`; this module owns its own reduced-motion block, so keep the rules local as they are today.
- Exemplar for preserving colour feedback: `process.css:435-485` keeps colour transitions while disabling movement.

## Steps

1. `HeroPreview.module.css:1374-1376` — wrap the existing `.playButton:hover { scale: 1.06; }` rule in `@media (hover: hover) and (pointer: fine) { ... }`. Keep the declaration unchanged.
2. `HeroPreview.module.css:1795-1803` — replace the entire blanket block with the targeted reduced-motion block in Target. Use the module's own class names (no `.frame *` descendants).
3. Do not edit any other reduced-motion block in the repository.
4. Mechanical check: `rg '0.01ms|animation-duration' src/features/marketing/landing/sections/HeroPreview.module.css` returns nothing.

## Boundaries

- Do NOT remove colour/opacity transitions under reduced motion.
- Do NOT touch plan 021's fill/progress rules.
- Do NOT add new dependencies or JS listeners.

## Verification

- **Mechanical**: `pnpm exec biome check src/features/marketing/landing/sections/HeroPreview.module.css` clean except pre-existing findings; `pnpm exec tsc --noEmit` clean.
- **Feel check**: in Rendering → Emulate `prefers-reduced-motion: reduce`, reload. The scroll hint and replay bar are static; the play button does not scale on hover; clicking the theme toggle and tabs still changes colour immediately. On a touch emulation, tapping the play button produces no sticky 1.06 scale. Toggle back to no-preference: the bob and replay animation resume.
- **Done when**: no blanket override remains, hover movement is gated, and colour feedback survives reduced motion.

### Execution record — 2026-11-24

Applied in place; both excerpts matched by content (line numbers +4/+6 after
021). `rg '0.01ms|animation-duration'` → no output. `tsc --noEmit` clean.
Biome on the CSS module clean; landing vitest 74 passed / 2 failed, neither
related to this module.
