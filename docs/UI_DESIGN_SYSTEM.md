# UI Design System — RevenueLens × Tartly

RevenueLens deliberately inherits the **visual language, colour scheme,
typography, density, and onboarding motion** of the sibling Tartly product
(`../tartly`), adapted from an email operator's desk to a revenue analytics
workstation. This is not a logo swap: the same near-black instrument panel,
tonal layering, single typeface, and quiet motion should be recognisable.

The source of truth for the Tartly side:

- `../tartly/DESIGN.md` — palette, typography, component tokens.
- `../tartly/app/globals.css` — CSS custom properties.
- `../tartly/lib/onboarding/constants.ts` — motion constants (12 px, 320 ms,
  70 ms).
- `../tartly/components/app/onboarding/*` — step layout, transition outlet,
  staggered reveal, welcome overlay.

The production implementation in this repo uses the **existing Talivia
component system** (`@talivia/react-zen` + CSS modules + the tokens in
`src/app/global.css`). Do not add Tailwind/shadcn or fork a second design
system.

---

## 1. Creative north star

**"The revenue workbench."**

A quiet, dark room where the numbers are the loudest thing. Surfaces are
near-black, cards are one tonal step up, borders are hairlines, and a single
warm blush signal is reserved for what matters: revenue, a live event, the next
action. The AI/upstream accent gradient is **not** used here; RevenueLens is
not an AI-authored product.

Characteristics:

- Single dark palette. No light theme at launch.
- One typeface: Inter (system fallback). No display font, no second accent.
- Dense working surfaces, breathable marketing pages.
- Tabular numerals for every figure.
- Flat by default; shadows/lift only as state.
- Motion is short, directional, and optional.

---

## 2. Tokens

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--rl-canvas` | `#1b1b1b` | Page ground, app canvas |
| `--rl-card` | `#222222` | Cards, panels, marketing surfaces |
| `--rl-muted` / `--rl-accent` | `#262626` / `#2e2e2e` | Inputs, toggles, chips, pressed state |
| `--rl-fg` | `#f4f4f5` | Primary text, primary button fill |
| `--rl-muted-fg` | `#a1a1aa` | Secondary text, labels, metadata |
| `--rl-border` | `rgba(255,255,255,0.08)` | Hairline borders |
| `--rl-blush` | `#f2b4cb` | **Signal only:** live event, active progress, revenue highlight |
| `--rl-blush-soft` | `#f7d2e0` | On-signal icon/text |
| `--rl-blush-ink` | `#2b1622` | Text on blush fill |
| `--rl-warning` | `#f8b84e` | Usage warnings (80%) |
| `--rl-danger` | `#ffb3b3` | Errors (dark-palette-safe) |

Rules:

- Blush is never decorative. If it is on screen, it means signal/action.
- No saturated blue/purple as a second brand colour. Links inherit foreground.
- Status colours only inside status surfaces, never as page chrome.

### Typography

| Role | Size | Weight | Line-height | Tracking |
| --- | --- | --- | --- | --- |
| Display | `clamp(2.25rem, 6vw, 3.75rem)` | 600 | 1.05 | `-0.045em` |
| Page title | 20px | 600 | 1.2 | `-0.03em` |
| Section | 18px | 600 | 1.2 | `-0.02em` |
| Body | 13–15px | 400 | 1.55–1.65 | normal |
| Label | 11–12px | 500 | 1.2 | `0.02em` |
| Eyebrow | 10–11px | 500–600 | 1.2 | `0.12–0.16em`, uppercase |
| Data | 12–13px | 500–600 | 1.2 | tabular numerals |

Font stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
"Segoe UI", sans-serif` (already `--font-family` in `src/app/global.css`). No
bundled font files, so no font licence to clear.

### Spacing / radius / elevation

- Spacing: 4, 8, 12, 16, 24, 40, 56, 72.
- Radius: 6 (chip), 8 (control), 10 (panel), 14 (card), 999 (pill).
- Elevation: flat. Hover = border brightens + background `rgba(255,255,255,.04)`.
  Focus = blush border + no glow. No large drop shadows on app surfaces.
- Content width: app `1080px` (existing `APP_LAYOUT_MAX_WIDTH`); onboarding
  content column `440px`; marketing body `62–75ch`.

### Motion

| Token | Value | Use |
| --- | --- | --- |
| `ONBOARDING_MOTION_SLIDE_OFFSET` | `12px` | Step enter/exit translate |
| `ONBOARDING_MOTION_STAGGER_DELAY` | `70ms` | Sequential reveal inside a step |
| `ONBOARDING_MOTION_DURATION_SECONDS` | `0.32s` | Step transition |
| Easing | `ease-in-out` | Step transitions |
| Hover/press | `160ms ease` | Buttons, inputs |
| Welcome hold | `4.2s` (0.9s reduced motion) | Welcome overlay |

Directional logic (copied from Tartly's `OnboardingTransitionOutlet`):

- Forward: enter from `+12px` (below), exit to `-12px` (above).
- Backward: enter from `-12px`, exit to `+12px`.
- `prefers-reduced-motion: reduce`: offsets become 0, animations are disabled.

---

## 3. Component recipes

### Button

- Primary: `#f4f4f5` fill, `#1b1b1b` text, 38px height, 8px radius.
- Secondary: transparent, 1px `--rl-border`, foreground text.
- Ghost/text: no border, muted text, foreground on hover.
- Disabled: 55% opacity, no pointer.
- Focus: 2px blush outline offset 2px (keyboard only).

### Input

- 38px height, transparent fill, hairline border, 8px radius.
- Placeholder at 65% of muted foreground.
- Focus: blush border + `rgba(255,255,255,.02)` fill.
- Error: danger text below, never a red border alone.

### Card / panel

- `#222222`, 1px hairline, 14px radius, 24–28px padding.
- Accent card (Pro pricing): blush border at 34% + a 6% blush gradient at the
  top. No glow.

### Progress

- 2px track at 6% white; blush fill; width transition 320ms.
- Step count uses tabular numerals.

### Empty / loading / error

- Empty: icon or mark, one sentence, one action. No illustration bloat.
- Loading: small ring spinner (12px) inline with the action; never a full-page
  spinner for a local action.
- Error: one sentence, plain language, what to do next.

### Data display

- Tabular numerals on money, counts, percentages, and dates.
- Money always includes currency; use `Intl.NumberFormat`.
- Revenue is the hero, not pageviews. Pageviews are supporting context.

---

## 4. Screen direction

### Marketing / pricing

- 1080px max, hero centred, 6xl display, one promise.
- Two plan cards only. Pro gets the blush accent; Starter stays neutral.
- No fake testimonials, logos, ratings, or customer counts.
- Pricing copy reads from `src/lib/plans.ts`; never hardcode a limit.

### App shell

- Near-black canvas, 1080px content, hairline top nav.
- Wordmark left, workspace switcher next, user menu right.
- The blush signal appears on live/revenue states, not nav.

### Revenue-first overview

- First row: revenue, revenue per visitor, conversion rate, MRR by channel.
- Second row: revenue by source, revenue by campaign, recent payments.
- Traffic charts support the revenue story; they do not lead.
- Empty state: "Install the tracker to see your first visit" with a copy action.

### Billing / usage

- Current plan, period, next renewal, status, usage bar (80%/100% states),
  upgrade/downgrade, cancel, portal/invoice links.
- Usage bar uses blush below 80%, warning at 80–99%, danger at 100%.
- No fake invoices or statuses.

### Settings

- Left sub-nav, right panel. One permission system (workspace roles).
- Destructive actions use a typed confirmation, not a single click.

---

## 5. Additional UI workstream (owner-requested)

The phase tracker expands Phase 9 with UI-1 … UI-14. The sequence is:

1. **Audit + tokens** — extract Tartly values, map to Talivia CSS.
2. **Brand config adoption** — `src/lib/brand.ts` drives name, mark, metadata,
   emails.
3. **App shell** — quiet workstation, workspace switcher.
4. **Revenue-first overview** — revenue hero, revenue per visitor, conversion,
   MRR by channel.
5. **Onboarding shell + steps** — see `docs/ONBOARDING_SPEC.md`.
6. **Install experience** — snippet card, copy, live verification.
7. **Pricing page** — two plans, monthly/annual toggle, config-driven.
8. **Billing + usage** — plan, renewal, usage thresholds.
9. **Settings** — workspace, members, websites, integrations, security.
10. **Auth screens** — login, signup, verify, reset.
11. **Marketing landing** — promise, proof points, product visual, FAQ.
12. **Motion + polish** — transitions, hover, skeletons, mobile.
13. **Accessibility pass** — focus, contrast, labels, reduced motion.
14. **Temporary rename demo** — prove the brand config is the only source.

Current status: pricing, onboarding shell/steps, and the auth screens (login,
signup, invite, verify, forgot/reset) are implemented; the remaining screens
are tracked in `docs/PHASES.md`.

---

## 6. Implementation map

| Concern | File |
| --- | --- |
| Brand config | `src/lib/brand.ts` |
| Brand mark/wordmark | `src/components/brand/BrandMark.tsx` |
| Global Talivia tokens | `src/app/global.css` |
| Pricing page | `src/app/pricing/PricingPage.tsx`, `Pricing.module.css` |
| Onboarding flow | `src/app/onboarding/OnboardingFlow.tsx`, `Onboarding.module.css` |
| Plan config | `src/lib/plans.ts` |
| Workspace permissions | `src/lib/workspace-auth.ts` |

Do not duplicate these tokens into per-component literals. If a new screen
needs a colour, add it to the shared token block or `brand.ts`; do not invent a
one-off hex.

---

## 7. Accessibility and quality bar

- Keyboard: every action reachable; visible focus ring; no keyboard traps.
- Motion: honour `prefers-reduced-motion`; no autoplay video.
- Contrast: body text ≥ 4.5:1 on `#1b1b1b`; muted text ≥ 3:1 for large text.
- Forms: real `<label>`, `aria-describedby` for hints/errors, `aria-invalid`.
- Status: never colour alone; pair with text/icon.
- Touch targets: ≥ 40px on mobile.
- Responsive: 360px minimum; no horizontal scroll; onboarding column collapses
  to full width.
- No dark patterns: no fake urgency, no pre-checked paid add-ons, no hidden
  renewal.
