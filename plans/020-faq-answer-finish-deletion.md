# 020 — Finish the FAQ answer animation deletion

- **Status**: DONE
- **Commit**: dd1a749
- **Severity**: MEDIUM
- **Category**: 4 Interruptibility
- **Estimated scope**: 1 file, 3 deletions

## Problem

`src/features/marketing/landing/landing.css:303-306` (current):

```css
/* Answer fade when a native details element opens. */
.landing-root details[open] .lp-faq-answer {
  animation: lp-faq-in 420ms var(--lp-ease) both;
}
```

`landing.css:388-397` defines `@keyframes lp-faq-in` (`opacity: 0; translate3d(0, 6px, 0)` → `opacity: 1; translate3d(0, 0, 0)`), and `landing.css:1185` lists `details[open] .lp-faq-answer` in the reduced-motion `animation: none` selector list.

Plan 019 (`plans/019-faq-rows-canvas-no-icon.md:189-195`, marked DONE) explicitly required deleting all three. The current working tree still has them, so the shipped state contradicts the settled decision and the `FaqSection` doc comment. A native `<details>` toggle is reversible and hit repeatedly: keyframes restart from zero on re-open, only the open direction animates, and 420ms exceeds the 300ms UI budget in AUDIT.md category 2.

## Target

No `lp-faq-in` rule, no `@keyframes lp-faq-in`, no reduced-motion entry for it. The answer appears instantly with no state chrome — "no icon, no colour change, no animation" (`plans/019-faq-rows-canvas-no-icon.md:130`).

## Repo conventions to follow

- Plan 019 is the governing decision; do not reintroduce any answer fade.
- All landing rules are scoped under `.landing-root` (`landing.css:41`).
- Exemplar for a settled deletion: plan 019 removed the toggle rotate rules and reduced-motion entries in the same file.

## Steps

1. `src/features/marketing/landing/landing.css:303-306` — delete the comment and the `.landing-root details[open] .lp-faq-answer` rule.
2. `landing.css:388-397` — delete the whole `@keyframes lp-faq-in` block.
3. `landing.css:1185` — delete only the line `  .landing-root details[open] .lp-faq-answer {` from the comma-separated selector list; keep the surrounding `animation: none` rule and all other selectors, including `.stack-socket-node` at 1214.
4. Mechanical check: `rg 'lp-faq-in' src/features/marketing/landing/landing.css` returns nothing.

## Boundaries

- Do NOT touch `FaqSection.tsx` (its `PlusIcon` toggle is a separate, pre-existing drift — out of scope).
- Do NOT add a replacement fade, `transition`, or `@starting-style` rule.
- Do NOT renumber or edit other plans.

## Verification

- **Mechanical**: `rg 'lp-faq-in' src/features/marketing/landing/landing.css` → no output. `pnpm exec tsc --noEmit` → clean. `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing/LandingPage.test.tsx` → no new failures (one pre-existing StackSection text assertion may fail).
- **Feel check**: open and close the same FAQ row five times quickly. The answer appears and disappears immediately; no fade, no 6px travel, no restart-from-zero. With `prefers-reduced-motion: reduce` toggled, behaviour is identical.
- **Done when**: the three deletions are present and the mechanical grep is empty.

### Execution record — 2026-11-24

Applied in place; all three excerpts matched. `rg 'lp-faq-in'` still matches the
pre-existing `lp-faq-index` selector as a substring; `rg 'lp-faq-in\b'` → no
output. `tsc --noEmit` clean. `vitest run src/features/marketing/landing`: 74
passed / 2 failed, neither in FAQ assertions (see `plans/README.md`). Biome on
`landing.css` reports only the pre-existing `'Poppins'` quote finding.
