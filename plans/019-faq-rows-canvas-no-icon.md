# 019 — FAQ rows: canvas-coloured, no icon, no orange state

- **Status**: DONE (executed 2026-11-24; feel checks UNVERIFIED — see `plans/README.md`)
- **Commit**: `dd1a749`
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens / Purpose & frequency / Interruptibility
- **Estimated scope**: 2 files — `FaqSection.tsx` (~8 lines), `landing.css` (~75 lines removed, ~4 changed)

## Problem

The landing page FAQ renders each row as a near-white card with a circular
blush toggle on the right, and turns the whole row blush when opened: orange
border, orange inset bar, orange offset shadow, orange index number, orange
filled icon. The user asked for rows that sit on the page colour, no blush icon,
and a plain open with no orange highlight.

The card shell (`src/features/marketing/landing/landing.css:1282-1305`):

```css
.landing-root .lp-faq-item {
  border: 1px solid #ddd5cc;
  border-radius: 10px;
  background: color-mix(in srgb, #fffdf6 55%, transparent);
  transition:
    border-color 220ms var(--lp-ease),
    background-color 220ms var(--lp-ease),
    box-shadow 220ms var(--lp-ease);
}

@media (hover: hover) {
  .landing-root .lp-faq-item:not([open]):hover {
    border-color: color-mix(in srgb, #ff4f00 24%, #ddd5cc);
    background: #fffdf6;
  }
}

.landing-root .lp-faq-item[open] {
  border-color: color-mix(in srgb, #ff4f00 38%, #ddd5cc);
  background: #fffdf6;
  box-shadow:
    inset 2px 0 0 #ff4f00,
    3px 3px 0 0 rgba(255, 79, 0, 0.1);
}
```

The orange index (`landing.css:1307-1319`):

```css
.landing-root .lp-faq-index {
  color: #a09889;
  /* … */
  transition: color 220ms var(--lp-ease);
}

.landing-root .lp-faq-item[open] .lp-faq-index {
  color: #ff4f00;
}
```

The blush toggle and its rotate (`landing.css:1321-1355`):

```css
.landing-root .lp-faq-toggle {
  display: flex;
  width: 2rem;
  height: 2rem;
  /* … */
  border: 1px solid #ddd5cc;
  border-radius: 999px;
  color: #6b6660;
  transition:
    background-color 220ms var(--lp-ease),
    border-color 220ms var(--lp-ease),
    color 220ms var(--lp-ease);
}
/* hover, [open] → border-color: #ff4f00; background: #ff4f00; color: #ffffff; */
.landing-root .lp-faq-icon {
  transition: rotate 300ms cubic-bezier(0.2, 0, 0, 1);
}
.landing-root .lp-faq-item[open] .lp-faq-icon {
  rotate: 45deg;
}
```

Its markup (`src/features/marketing/landing/sections/FaqSection.tsx:97-112`):

```tsx
<details className="lp-faq-item group">
  <summary className="flex cursor-pointer list-none items-start gap-4 p-5 text-left [&::-webkit-details-marker]:hidden">
    <span aria-hidden="true" className="lp-faq-index w-5 shrink-0 pt-0.5">
      {String(index + 1).padStart(2, '0')}
    </span>
    <span className="flex-1 text-base font-black tracking-tight text-lp-ink sm:text-lg">
      {item.question}
    </span>
    <span aria-hidden="true" className="lp-faq-toggle shrink-0">
      <PlusIcon className="lp-faq-icon size-3.5" strokeWidth={2.4} />
    </span>
  </summary>
  <p className="lp-faq-answer max-w-2xl px-5 pb-5 text-sm/6 text-lp-fg-muted sm:pl-[3.5rem]">
    {item.answer}
  </p>
</details>;
```

The answer also fades in on a keyframe (`landing.css:303-306`, `388-397`),
which restarts from zero on every rapid toggle; `AUDIT.md` §4 says keyframes
must not drive reversible UI.

**Which FAQ, resolved:** this is the landing FAQ in `FaqSection.tsx`, not the
pricing-page FAQ. The latter is a plain bordered list with a text `+` marker
(`src/features/marketing/Pricing.module.css:546-572`) — it has no white cards,
no blush icon and no open-state highlight, so none of the reported symptoms
match it. Do not touch `Pricing.module.css` or `PricingPage.tsx`.

**"Just open up", resolved:** native `<details>` expansion only. That means the
open-state styling, the toggle icon and the `lp-faq-in` answer keyframe are all
removed. The neutral `01`–`06` index and the hairline border stay — the user did
not ask to change the ledger, only its colour treatment and state chrome.

## Target

`src/features/marketing/landing/sections/FaqSection.tsx` — drop the `PlusIcon`
import and the toggle span, and make the doc comment truthful:

```tsx
import { ArrowUpRight as ArrowUpRightIcon } from '@/components/icons';
```

```tsx
/**
 * Objection handling at the point of decision. Native details keep the answers
 * keyboard accessible and work without JavaScript; opening a row reveals its
 * answer with no state chrome — no icon, no colour change, no animation. The
 * numbered ledger on the right is the reading order, so the list stays scannable
 * at a glance instead of reading as a wall of rows.
 */
```

```tsx
<div className="flex flex-col gap-3">
  {FAQS.map((item, index) => (
    <Reveal key={item.question} delay={index * 50}>
      <details className="lp-faq-item group">
        <summary className="flex cursor-pointer list-none items-start gap-4 p-5 text-left [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="lp-faq-index w-5 shrink-0 pt-0.5">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="flex-1 text-base font-black tracking-tight text-lp-ink sm:text-lg">
            {item.question}
          </span>
        </summary>
        <p className="lp-faq-answer max-w-2xl px-5 pb-5 text-sm/6 text-lp-fg-muted sm:pl-[3.5rem]">
          {item.answer}
        </p>
      </details>
    </Reveal>
  ))}
</div>;
```

`src/features/marketing/landing/landing.css` — the whole FAQ block becomes:

```css
/* ------------------------------------------------------------------------- */
/* FAQ ledger                                                                */
/* ------------------------------------------------------------------------- */

.landing-root .lp-faq-item {
  border: 1px solid #ddd5cc;
  border-radius: 10px;
  background: transparent;
}

.landing-root .lp-faq-index {
  color: #a09889;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
}
```

`background: transparent` is deliberate: the section carries
`bg-lp-canvas` (`#fffbeb`, `landing.css:28`) and `.landing-root` sets the same
colour (`landing.css:43, 67`), so the row is pixel-for-pixel the page colour
without duplicating a hex value. There is no `:hover` rule and no `[open]`
rule — expansion is the only state change.

Also delete, in `landing.css`:

- `landing.css:303-306` — the `details[open] .lp-faq-answer` animation rule.
- `landing.css:388-397` — `@keyframes lp-faq-in`.
- `landing.css:1227-1230` — the reduced-motion `transition: none` entries for
  `.lp-faq-item`, `.lp-faq-index`, `.lp-faq-toggle`, `.lp-faq-icon`; all four
  rules lose their transitions, so the entries are dead.
- `landing.css:1197` — the reduced-motion `animation: none` entry for
  `details[open] .lp-faq-answer`; the animation no longer exists.

No new token, curve, duration or dependency is introduced. No `#ff4f00` remains
anywhere in the FAQ markup or the `.lp-faq-*` rules; the page-wide accent is
untouched.

## Repo conventions to follow

- The landing palette tokens live in `@theme` at
  `src/features/marketing/landing/landing.css:21-39`: `--color-lp-canvas:
  #fffbeb`, `--color-lp-line: #ddd5cc`, `--color-lp-fg-muted: #6b6660`. The
  FAQ block already uses the raw `#ddd5cc`, so keep it as-is rather than
  rewriting declarations.
- Exemplar for "let the canvas show through": plan 017 reduced the feature
  stage shell to a positioning context with no fill —
  `src/features/marketing/landing/landing.css:1600-1602` is now just
  `position: relative`. `background: transparent` here follows the same call.
- All landing rules stay scoped under `.landing-root`; do not add global CSS.
- Native `<details>` is intentional for keyboard access and no-JS behaviour;
  do not replace it with a React-controlled accordion.

## Steps

1. `src/features/marketing/landing/sections/FaqSection.tsx:2` — change the icon
   import to `import { ArrowUpRight as ArrowUpRightIcon } from '@/components/icons';`
   (only `ArrowUpRightIcon` is still used, by the side links at lines 83-87).
2. `FaqSection.tsx:47-53` — replace the doc comment with the target text above;
   the current "only motion is the toggle rotate and a short answer fade" is
   no longer true.
3. `FaqSection.tsx:105-107` — delete the entire `lp-faq-toggle` span, including
   the `PlusIcon`. Leave the question span and the answer `<p>` untouched.
4. `landing.css:1282-1355` — replace the FAQ ledger rules with the two target
   rules. This removes the card fill, both hover blocks, the `[open]` block,
   the index transition and orange override, the toggle rules and the icon
   rotate rules.
5. `landing.css:303-306` and `388-397` — delete the answer-fade rule and its
   keyframes.
6. `landing.css:1197` and `1227-1230` — delete the four reduced-motion entries
   listed above, leaving the surrounding lists and comma syntax valid.
7. Mechanical confirmation — `rg 'PlusIcon|lp-faq-toggle|lp-faq-icon|lp-faq-in|#ff4f00|#fffdf6|color-mix'`
   in `FaqSection.tsx` returns nothing, and the same search limited to the
   `.lp-faq` block in `landing.css` returns nothing. No test edits are needed:
   `LandingPage.test.tsx:102, 310` queries the FAQ by region/heading name,
   which is unchanged.

## Boundaries

- Do NOT touch `src/features/marketing/Pricing.module.css` or
  `PricingPage.tsx` (separate FAQ, no reported problem).
- Do NOT change the `FAQS` copy, the `Reveal` wrappers, the side links, or the
  numbered `01`–`06` index.
- Do NOT add an icon, a chevron rotation, a height transition, or any new
  open-state styling. Do NOT change the page-wide `--lp-ease` token.
- Do NOT add dependencies, commits or other files.
- The working tree was dirty when this plan was stamped (`landing.css` has
  uncommitted reduced-motion edits around lines 1223-1238, and plan 018 is
  untracked). If the cited code does not match what is on disk, STOP and
  report the drift rather than improvising.

## Verification

- **Mechanical**:
  - `pnpm exec biome format src/features/marketing/landing/sections/FaqSection.tsx src/features/marketing/landing/landing.css` — clean (format check, no writes).
  - `pnpm exec biome lint src/features/marketing/landing/sections/FaqSection.tsx` — no new diagnostics.
  - `pnpm exec tsc --noEmit` — clean.
  - `pnpm exec vitest run src/features/marketing/landing/LandingPage.test.tsx` — FAQ region/heading assertions still pass.
  - `pnpm gate` — expected to remain red on the pre-existing uncommitted
    format failures documented in `plans/README.md`; do not "fix" unrelated
    files to make it green.
- **Feel check**: open `/#faq` in a browser at desktop and mobile widths.
  - Row fill and section background are the same cream (`#fffbeb`) — sample
    both with the DevTools eyedropper, no near-white card edge.
  - No plus icon, no circular toggle, no orange border or inset bar appears
    before or after opening.
  - Clicking a question only reveals its answer; there is no colour flash,
    no icon motion and no fade. Rapid double-click never restarts an
    animation (Animations panel shows no `lp-faq-in`).
  - Keyboard `Enter` / `Space` on a focused summary still opens the row.
  - With `prefers-reduced-motion: reduce` enabled, behaviour is identical —
    no new motion was added, so nothing to suppress.
- **Done when**: all four mechanical checks pass (apart from the documented
  pre-existing gate failures), the six feel checks hold, and `git diff` for
  this change touches only the two named source files.
