# UI Design System — Tartly

Tartly deliberately inherits the **visual language, colour scheme,
typography, density, and onboarding motion** of the sibling Tartly email
product (`../tartly`), adapted from an email operator's desk to a revenue
analytics workstation. This is not a logo swap: the same near-black instrument
panel,
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
action. The AI/upstream accent gradient is **not** used here; Tartly is
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

| Token                        | Value                    | Use                                                             |
| ---------------------------- | ------------------------ | --------------------------------------------------------------- |
| `--rl-canvas`                | `#1b1b1b`                | Page ground, app canvas                                         |
| `--rl-card`                  | `#222222`                | Cards, panels, marketing surfaces                               |
| `--rl-muted` / `--rl-accent` | `#262626` / `#2e2e2e`    | Inputs, toggles, chips, pressed state                           |
| `--rl-fg`                    | `#f4f4f5`                | Primary text, primary button fill                               |
| `--rl-muted-fg`              | `#a1a1aa`                | Secondary text, labels, metadata                                |
| `--rl-border`                | `rgba(255,255,255,0.08)` | Hairline borders                                                |
| `--rl-blush`                 | `#f2b4cb`                | **Signal only:** live event, active progress, revenue highlight |
| `--rl-blush-soft`            | `#f7d2e0`                | On-signal icon/text                                             |
| `--rl-blush-ink`             | `#2b1622`                | Text on blush fill                                              |
| `--rl-warning`               | `#f8b84e`                | Usage warnings (80%)                                            |
| `--rl-danger`                | `#ffb3b3`                | Errors (dark-palette-safe)                                      |

Rules:

- Blush is never decorative. If it is on screen, it means signal/action.
- No saturated blue/purple as a second brand colour. Links inherit foreground.
- Status colours only inside status surfaces, never as page chrome.

### Typography

| Role       | Size                           | Weight  | Line-height | Tracking                 |
| ---------- | ------------------------------ | ------- | ----------- | ------------------------ |
| Display    | `clamp(2.25rem, 6vw, 3.75rem)` | 600     | 1.05        | `-0.045em`               |
| Page title | 20px                           | 600     | 1.2         | `-0.03em`                |
| Section    | 18px                           | 600     | 1.2         | `-0.02em`                |
| Body       | 13–15px                        | 400     | 1.55–1.65   | normal                   |
| Label      | 11–12px                        | 500     | 1.2         | `0.02em`                 |
| Eyebrow    | 10–11px                        | 500–600 | 1.2         | `0.12–0.16em`, uppercase |
| Data       | 12–13px                        | 500–600 | 1.2         | tabular numerals         |

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

### Texture

Texture is what makes the flat surfaces feel made rather than filled. It is
always decorative and never carries meaning, so it must stay below the text
contrast threshold.

- **Paper grain** — `public/textures/grain.svg` is a fixed, pointer-transparent
  overlay on `body::after` at 3.5% in light mode and 5.5% in dark mode
  (`--rl-grain-opacity`, `--rl-grain`, `soft-light` blend). It also covers the
  landing page's existing editorial textures without rewriting them. Hidden in
  `forced-colors` mode.
- **Product canvas** — a 24px dot field plus two quiet radial glows on
  `.talivia-app-shell` and `.talivia-auth-shell`
  (`--rl-app-dot`, `--rl-app-glow`, `--rl-app-glow-cool`). The dots are below
  7% alpha; they must never be used as a grid for content alignment.
- **Marketing canvas** — the same 24px dot field with a warmer top glow
  (`--marketing-texture-dot`, `--marketing-texture-glow`) on pricing, docs,
  legal, and comparison pages. The landing page keeps its hatch, hairline grid,
  and larger dot field on top.
- **Cards** — one soft top sheen (`--rl-panel-sheen` for product surfaces,
  `--marketing-sheen` for marketing surfaces, height 104–112px). No coloured
  glow, no drop shadow, no second highlight. The sheen is a texture, not
  elevation; hover still owns the only lifted state.
- **Restraint** — do not texture charts, table rows, inputs, focus rings, or
  status surfaces. When a token change would make texture compete with data,
  reduce the alpha instead of adding another layer.

### Motion

| Token                                | Value                        | Use                             |
| ------------------------------------ | ---------------------------- | ------------------------------- |
| `ONBOARDING_MOTION_SLIDE_OFFSET`     | `12px`                       | Step enter/exit translate       |
| `ONBOARDING_MOTION_STAGGER_DELAY`    | `70ms`                       | Sequential reveal inside a step |
| `ONBOARDING_MOTION_DURATION_SECONDS` | `0.32s`                      | Step transition                 |
| Easing                               | `ease-in-out`                | Step transitions                |
| Hover/press                          | `160ms ease`                 | Buttons, inputs                 |
| Welcome hold                         | `2.6s` (1.1s reduced motion) | App-wide welcome overlay        |

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

### Icons

- **Iconoir** (`iconoir-react`, 1.5px stroke, 24px grid) is the only icon
  library. Import every icon from `src/components/icons.ts`, which re-exports
  the library so a future swap stays a one-file change.
- Icons render at 16px in dense rows, 24px in empty states and page headers.
  Do not mix in another icon set; provider and brand logos are images, not
  icons.
- Give icon-only buttons an `aria-label`; decorative icons stay
  `aria-hidden="true"`.

---

## 4. Screen direction

### Marketing / pricing

- 1080px max, hero centred, 6xl display, one promise.
- Two plan cards only. Pro gets the blush accent; Starter stays neutral.
- No fake testimonials, logos, ratings, or customer counts.
- Pricing copy reads from `src/lib/plans.ts`; never hardcode a limit.

### App shell

- Flat canvas, 1120 px content, hairline top nav.
- Wordmark left, workspace switcher next, user menu right.
- One fixed **Logout** control at the bottom-left of every signed-in surface;
  it is the only exit and never sits inside the working area.
- The website workbench has no left rail. One horizontal destination row holds
  the daily reports; the rest live in a **More** menu.
- The blush signal appears on live/revenue states, not nav.

### Revenue-first overview

- One toolbar row: website switcher and Settings on the left; Filter, period
  steps, date range, and granularity on the right.
- First panel: revenue, revenue per visitor, conversion rate, visitors, bounce
  rate, session time, and online, above the traffic/revenue chart.
- Then a 2×2 breakdown grid (referrers/channels/campaign/keywords,
  countries/regions/cities, page/hostname/entry, browser/os/device), followed
  by the activity panel.
- Empty panels say "No data" in the centre; no fake rows or placeholder
  values.
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

Current status: pricing, onboarding shell/steps, auth screens (login, signup,
invite, verify, forgot/reset), the app shell, the revenue-first portfolio home
(including MRR by first-touch channel), the website workbench navigation, the
Plan and usage screen, and the marketing landing are implemented. The brand
config lock and the token contrast test are automated; the temporary rename demo
is therefore a test rather than a manual theme flip. Invoice history and
subscription lifecycle UI remain blocked on Phase 5 (platform billing); the rest
is tracked in `docs/PHASES.md`.

---

## 6. Implementation map

| Concern                                 | File                                                                  |
| --------------------------------------- | --------------------------------------------------------------------- |
| Brand config                            | `src/lib/brand.ts`                                                    |
| Brand mark/wordmark                     | `src/components/brand/BrandMark.tsx`                                  |
| Global tokens                           | `src/app/global.css`                                                  |
| Landing page                            | `src/features/marketing/LandingPage.tsx`, `Landing.module.css`        |
| Pricing page                            | `src/features/marketing/PricingPage.tsx`, `Pricing.module.css`        |
| Documentation shell                     | `src/features/docs/DocsPage.tsx`, `Docs.module.css`                   |
| Revenue guides                          | `src/features/docs/content.ts`                                        |
| App shell / top nav                     | `src/features/app-shell/App.tsx`, `TopNav.tsx`                        |
| Portfolio overview                      | `src/features/portfolio/AppEntryPage.tsx`                             |
| Settings shell/overview                 | `src/features/settings/SettingsHomePage.tsx`                          |
| Account, security, preferences settings | `src/features/account/settings/`                                      |
| Integrations settings                   | `src/features/payments/settings/`                                     |
| Plan and usage settings                 | `src/features/billing/UsageSettingsPage.tsx`                          |
| Website workbench                       | `src/features/analytics/workbench/`                                   |
| Website workbench nav                   | `src/features/analytics/workbench/WebsiteSectionNav.tsx`              |
| Analytics widgets                       | `src/features/analytics/components/metrics/`                          |
| Analytics filters/selectors             | `src/features/analytics/components/input/`                            |
| Share widgets                           | `src/features/share/components/`                                      |
| Domain query hooks                      | `src/features/<domain>/hooks/`                                        |
| Workspace settings                      | `src/features/workspaces/settings/`                                   |
| Website list settings                   | `src/features/websites/settings/`                                     |
| Onboarding flow                         | `src/features/onboarding/OnboardingFlow.tsx`, `Onboarding.module.css` |
| Plan config                             | `src/lib/plans.ts`                                                    |
| Workspace permissions                   | `src/lib/workspace-auth.ts`                                           |
| Frozen legacy features                  | `src/features/legacy/{boards,links,pixels}/`                          |

Do not duplicate these tokens into per-component literals. If a new screen
needs a colour, add it to the shared token block or `brand.ts`; do not invent a
one-off hex.

### Source layout

`src/app` is the routing layer only: pages, layouts, route handlers, and the
small components that are genuinely route-local (auth screens, share shell,
pricing, marketing). Every product surface with more than one file lives in a
domain module under `src/features`:

```
src/app/                     routes only (pages + thin API re-exports)
src/features/
  account/                   /api/me profile, password, owned websites,
                             account/security/preference settings, local users,
                             server/queries for portfolio overview and MRR
  analytics/                 workbench shell + reports/sessions/events/replay/
                             realtime/cohorts/compare/segments, ingestion, lib/,
                             server/queries (the SQL engine + Prisma reports)
  app-shell/                 signed-in shell, top nav, notices
  auth/                      login, signup, verify, reset, invite, logout, lib/
  billing/                   plan and usage settings screen
  docs/                      public documentation shell and revenue guides
  legacy/                    frozen boards, links, pixels, public pixel/link
                             collection handlers, lib/
  marketing/                 landing and pricing
  onboarding/                activation onboarding (website → tracker →
                             revenue), welcome-overlay port, lib/
  payments/                  provider connections, webhooks, integration
                             settings, lib/, server/queries
  portfolio/                 /app home (all websites)
  settings/                  settings shell, grouped nav, overview
  share/                     public share shell
  system/                    health and OSS updates, cron, lib/
  websites/                  website CRUD, settings, imports, API keys, members,
                             server/queries
  workspaces/                workspace, member, invitation, usage APIs,
                             workspace settings, lib/
src/queries/                 small shared repository kernel only
```

Each domain that serves HTTP has a `server/` directory, and each domain that
owns database access has `server/queries/`. API routes under `src/app/api`
re-export handlers from `src/features/<domain>/server`. See
`docs/ARCHITECTURE.md`.

`src/components` keeps shared design-system primitives only (`common`, `charts`,
`input`, `svg`, `brand`, generic `hooks`). Analytics widgets live in
`src/features/analytics/components/metrics`, share widgets in
`src/features/share/components`, and domain selectors in the owning feature.

Rules:

- A route file stays thin: parse params, mount a feature component, or re-export
  a feature handler. It never imports `@/queries`, `@/lib/prisma`, or
  `@/lib/redis` directly.
- Cross-feature imports go through `@/features/...`; do not reach into another
  feature with `../../`.
- Shared layers must not import a feature. `src/lib/app-structure.test.ts`
  enforces both directions, plus `src/lib`, `src/queries`, and `src/store`
  allowlists. Domain helpers and repositories belong in
  `src/features/<domain>/lib` and `src/features/<domain>/server/queries`; domain
  stores belong beside the feature.
- The old `/websites/*` and `/settings/*` URLs are compatibility redirects in
  `next.config.ts`; the canonical product routes are `/app/*`.
- `src/features/legacy` is quarantined, not a pattern to copy. New work must not
  add imports from it.

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
