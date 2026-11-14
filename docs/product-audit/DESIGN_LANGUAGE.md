# Tartly — Extracted Design Language

**Status:** source-of-truth extraction from the running code, not from intent docs.
**Scope:** every value below is copied from a file in this repo. Where
`docs/UI_DESIGN_SYSTEM.md` disagrees with the code, the code wins and the
disagreement is recorded in §11.
**Purpose:** any new screen built from a reference UX must be re-expressed in
this language. Do not import a second design system.

## 0. Authority order

1. `src/app/global.css` — tokens, focus ring, app-shell overrides.
2. `src/components/charts/echarts/colors.ts` — chart colour plumbing.
3. Component CSS modules (`*.module.css`) — surface-specific values.
4. `src/lib/brand.ts` — brand identity strings and a _partial_ palette mirror.
5. `docs/UI_DESIGN_SYSTEM.md` / `docs/ONBOARDING_SPEC.md` — intent, used only
   for values that also exist in code.

There is no Tailwind theme for the product. `postcss.config.js` loads
`@tailwindcss/postcss`, but only the landing page opts in via
`src/features/marketing/landing/landing.css` (`@import "tailwindcss/theme.css"`,
`@source "./"`). Everything else is react-zen + CSS modules.

---

## 1. Brand constants

From `src/lib/brand.ts`:

| Constant              | Value                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Name                  | `Tartly`                                                                                                      |
| Domain                | `tartly.in` (`https://tartly.in`)                                                                             |
| Tagline               | `Revenue analytics for indie SaaS`                                                                            |
| Promise               | `Connect your site, connect your payments, see which channels make money.`                                    |
| Support email         | `support@tartly.in`                                                                                           |
| No-reply              | `Tartly <no-reply@tartly.in>`                                                                                 |
| Mark                  | `/brand/tartly-mark.webp` (192px WebP; 930px source)                                                          |
| Mark use              | `.brand-mark` = `border-radius: 22%`, `object-fit: cover` (`global.css:518`)                                  |
| Lockup                | mark + wordmark, `gap: 10px`, weight 600, tracking `-0.03em`                                                  |
| Wordmark              | weight 700, tracking `-0.045em`, line-height 1.25, right/bottom padding `0.06em`                              |
| Wordmark fill         | gradient `100deg` `#f2b4cb 0% → #f7d2e0 5% → #ffffff 20% → #f4f4f5 58% → #a6a6b0 100%` (`global.css:548-555`) |
| Wordmark fill (light) | `#a63a60 0% → #7d2847 34% → #1f1f1f 100%` (`global.css:571`)                                                  |
| Wordmark flat         | `.tartly-wordmark-flat` → `var(--text-primary)`                                                               |

`BrandWordmark` sizes: default mark `28px`, wordmark `max(14px, round(size*0.66))`
(`src/components/brand/BrandMark.tsx`). Top nav passes `size={24}`; auth passes
`48`; onboarding step heading passes `44`.

**Note:** `BRAND.colors` in `brand.ts` is _not_ the CSS source of truth. It
declares `canvas #1b1b1b`, while the real dark canvas token is `#1f1f1f`. See
§11.1.

---

## 2. Colour

### 2.1 Product theme tokens (`src/app/global.css:36-154`)

| Token                          | Dark                          | Light                            | Role                                  |
| ------------------------------ | ----------------------------- | -------------------------------- | ------------------------------------- |
| `--talivia-app-background`     | `#1f1f1f`                     | `#fefaea`                        | Page ground, app canvas               |
| `--talivia-card-background`    | `#262626`                     | `#ffffff`                        | Cards, panels, popovers, menus        |
| `--talivia-card-border`        | `rgba(255,255,255,.08)`       | `rgba(31,31,31,.12)`             | Every hairline                        |
| `--surface-sunken`             | `#171717`                     | `#f4efd8`                        | Wells, inset strips, stat boxes       |
| `--surface-hover`              | `#2b2b2b`                     | `#f1ecd6`                        | Hover fill for controls/rows          |
| `--surface-subtle`             | `rgba(255,255,255,.025)`      | `rgba(31,31,31,.035)`            | Quiet fills, chips, code cards        |
| `--surface-subtle-hover`       | `rgba(255,255,255,.05)`       | `rgba(31,31,31,.06)`             | Hover for quiet fills                 |
| `--interactive-bg`             | `#2a2a2a`                     | `#f4efd8`                        | Neutral interactive fill              |
| `--interactive-bg-hover`       | `#303030`                     | `#ece5c8`                        |                                       |
| `--interactive-bg-pressed`     | `#383838`                     | `#e4dab6`                        |                                       |
| `--text-primary`               | `#f4f4f5`                     | `#1f1f1f`                        | Body + headings                       |
| `--text-strong`                | `#f2f2f2`                     | `#1f1f1f`                        | Values, tooltips, emphasized rows     |
| `--text-soft`                  | `#c9c9cf`                     | `#45443f`                        | Secondary row text, metadata          |
| `--text-muted`                 | `#a1a1aa`                     | `#66655f`                        | Labels, captions, axis labels         |
| `--text-disabled`              | `#737373`                     | `#9b9a92`                        | Disabled + scrollbar thumb            |
| `--primary`                    | `#f4f4f5`                     | `#1f1f1f`                        | Primary button fill                   |
| `--primary-foreground`         | `#1f1f1f`                     | `#fefaea`                        | Text on primary                       |
| `--primary-hover`              | `#e8e8ea`                     | `#333333`                        |                                       |
| `--inverse-surface`            | `#f4f4f5`                     | `#1f1f1f`                        | Inverted chip/button                  |
| `--inverse-ink`                | `#1f1f1f`                     | `#fefaea`                        |                                       |
| `--accent-text`                | `#f2b4cb`                     | `#a63a60`                        | **Blush signal** (text/icons/borders) |
| `--accent-text-strong`         | `#f7d2e0`                     | `#7d2847`                        | Signal hover                          |
| `--focus-ring-color`           | `rgba(242,180,203,.78)`       | `#a63a60`                        | 2px focus outline                     |
| `--border-strong`              | `rgba(255,255,255,.16)`       | `rgba(31,31,31,.24)`             | Hover border, separators              |
| `--talivia-tooltip-background` | `#2e2e30`                     | `#ffffff`                        | Tooltip surface                       |
| `--talivia-tooltip-border`     | `rgba(255,255,255,.1)`        | `rgba(31,31,31,.14)`             | Tooltip hairline                      |
| `--talivia-tooltip-shadow`     | `0 16px 42px rgba(0,0,0,.42)` | `0 16px 42px rgba(31,31,31,.16)` | Tooltip only                          |
| `--talivia-control-radius`     | `10px`                        | `10px`                           | Shared control radius                 |

Status tokens:

| Status  | Dark fg / bg / text                            | Light fg / bg / text                         |
| ------- | ---------------------------------------------- | -------------------------------------------- |
| info    | `#b7d4ff` / `rgba(59,130,255,.16)`             | `#1e4f9e` / `rgba(59,130,255,.1)`            |
| success | `#2dbf72` / `rgba(45,191,114,.16)` / `#9cf0bf` | `#178a4c` / `rgba(23,138,76,.1)` / `#126c3c` |
| warning | `rgba(245,158,11,.16)` / `#f8d486`             | `rgba(180,110,10,.12)` / `#8a5407`           |
| error   | `#ff4545` / `rgba(255,69,69,.16)` / `#ffb3b3`  | `#c22f2f` / `rgba(194,47,47,.1)` / `#a12828` |

Additional literals that appear repeatedly and must be treated as tokens in
practice:

- Danger button: border `rgba(255,69,69,.36)`, fill `rgba(255,69,69,.14)`,
  hover `.52` / `.20` (`global.css:1371-1390`).
- Success confirmation surface: `border-left: 2px solid var(--status-success)`,
  `background: rgba(45,191,114,.075)`, radius `0 12px 12px 0`
  (`global.css:1604-1615`, `2530-2538`).
- Selected option / nav item: `background: rgba(242,180,203,.14)`,
  `color: var(--accent-text)` (`global.css:1815-1819`, `1961-1964`).
- Selected website nav pill: border `rgba(242,180,203,.22)`, fill `.1`
  (`global.css:3460-3464`).
- Provider card selected: border `rgba(242,180,203,.62)`
  (`global.css:1414-1417`); connected: border `rgba(45,191,114,.34)`, fill
  `rgba(45,191,114,.08)` (`global.css:1419-1426`).
- Usage limit: `#ff6b6b` (not `--status-error`) and ok `#2dbf72`
  (`src/features/billing/UsageSettingsPage.tsx:48-53`).

### 2.2 Marketing tokens (`global.css:5-22`)

Public pages are **cream**, independent of the app theme.

| Token                       | Value                   |
| --------------------------- | ----------------------- |
| `--marketing-canvas`        | `#fffbeb`               |
| `--marketing-surface`       | `#fffdf6`               |
| `--marketing-surface-muted` | `#f5eeda`               |
| `--marketing-ink`           | `#1f2937`               |
| `--marketing-ink-strong`    | `#111827`               |
| `--marketing-muted`         | `#6b7280`               |
| `--marketing-line`          | `rgba(31,41,55,.12)`    |
| `--marketing-blush`         | `#a63a60`               |
| `--marketing-blush-soft`    | `#f2b4cb`               |
| `--marketing-blush-ink`     | `#2b1622`               |
| `--marketing-texture-glow`  | `rgba(242,180,203,.14)` |
| `--marketing-texture-dot`   | `rgba(31,41,55,.07)`    |

The landing page (`src/features/marketing/landing/landing.css:39-53`) re-points
those tokens inside `.landing-root` to a **different** palette: canvas
`#fffbeb`, ink `#171717`, muted `#737373`, line `#ddd5cc`, accent
`#ff4f00` (signal orange), pink `#f2b4cb`, pink-soft `#fbe3ec`, pink-ink
`#8f2f52`, mono labels. That is a deliberate second marketing language; see
§11.3.

### 2.3 Rules

- Blush is signal only: live state, active progress, selected item, revenue
  emphasis, primary hover affordance. **Never** decorative page chrome.
- Links inherit foreground; the only coloured inline link is the external
  link pattern (`--accent-text`, underline offset 3px, 14px icon,
  `global.css:769-797`).
- No saturated blue/purple as a second product brand colour. Blue appears only
  inside charts and the auth Google glyph.
- Status colours never become page chrome; they live in badges, banners, bars.
- Dark is the default theme (`src/lib/theme.ts: DEFAULT_THEME = 'dark'`); light
  is a supported first-class theme, restored pre-paint by
  `THEME_INIT_SCRIPT`.

---

## 3. Typography

### 3.1 Family

```css
--font-family: var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

- Loaded with `next/font/google` `Inter({ subsets:['latin'], display:'swap',
  variable:'--font-inter' })` in `src/app/layout.tsx`.
- Chart.js is told the same stack (`CHART_FONT_FAMILY`, `src/lib/constants.ts:24`).
- Code/mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  (onboarding snippet, `Onboarding.module.css:458`). The landing page also uses
  `"Geist Mono"` in its mono stack (`landing.css:24`).
- Root size is **14px** (`global.css:159`), not 16px. All `rem` values are
  therefore relative to 14px.

### 3.2 Scale actually in use

| Role              | Size                                                     | Weight  | Line-height | Tracking     | Source                                                               |
| ----------------- | -------------------------------------------------------- | ------- | ----------- | ------------ | -------------------------------------------------------------------- |
| Marketing display | `clamp(2.25rem, 6vw, 3.75rem)` = 31.5→52.5px             | 600     | 1.05        | `-0.045em`   | `Pricing.module.css:97-104`                                          |
| Landing hero      | `42px / 60px / 76px` (`sm:`/`md:`)                       | 900     | 1.02        | `-0.045em`   | `HeroSection.tsx:164`, `landing.css:112`                             |
| Auth title        | `22px`                                                   | 600     | 1.2         | `-0.03em`    | `global.css:923-933`                                                 |
| Onboarding title  | `20px`                                                   | 600     | 1.2         | `-0.03em`    | `Onboarding.module.css:148-154`                                      |
| Section head      | `18px`                                                   | 600     | 1.2         | `-0.02em`    | `Pricing.module.css:499-504`                                         |
| Panel title       | react-zen `Heading` default; pages opt into `lg/2xl/3xl` | 600/700 | —           | —            | `Panel.tsx`, `PageHeader.tsx`                                        |
| Body / lead       | `15-16px` marketing, `14px` onboarding, `13px` app       | 400     | 1.55-1.65   | normal       | various                                                              |
| Row / dense       | `12-13px`                                                | 400-600 | 1.2-1.45    | normal       | tables, lists                                                        |
| Label             | `11-12px`                                                | 500     | 1.2         | `0.02em`     | `Onboarding.module.css:242-249`                                      |
| Eyebrow           | `9-11px`, uppercase                                      | 600-700 | 1.2-1.4     | `0.08-0.2em` | `WebsiteCharts.module.css:24-29`, `TrackerReminder.module.css:24-33` |
| KPI value         | `clamp(22px, 2vw, 28px)`                                 | 720     | 1           | `-0.01em`    | `global.css:2967-2975`                                               |
| Table numeric     | `11-13px`                                                | 500-600 | 1.2         | tabular      | global.css tables                                                    |
| Fine print        | `10-11px`                                                | 400-500 | 1.5-1.6     | normal       | auth, paywall                                                        |

Weights in the wild: `400, 500, 550, 600, 650, 700, 720, 730, 740, 750, 760, 780,
800, 900`. Treat 720/730/740/750/760/780 as one "heavy" step; see §11.4.

### 3.3 Numerals

- `font-variant-numeric: tabular-nums` is applied **locally**, never globally:
  step count (`Onboarding.module.css:113`), price (`Pricing.module.css:377`),
  usage values (`UsageSettingsPage.tsx`), chart meta
  (`WebsiteCharts.module.css:36`), step index (`WebsiteFirstRunPanel.module.css`).
- Money always carries a currency and is formatted with `Intl.NumberFormat`
  (`src/lib/format.ts` usage across the app).
- Any figure a customer compares vertically must be tabular.

### 3.4 Text layout rules

- Marketing body measure `62ch` (pricing subtitle); FAQ `760px`; docs article
  `760px`; onboarding subtitle `42ch`; first-run body `48ch`; auth fineprint
  `320px`; auth title `340px`.
- Headlines use `text-wrap: balance` where available
  (`global.css:932`, `landing.css:117`).
- Long values truncate with `text-overflow: ellipsis` + `title` attribute;
  tooltips wrap with `overflow-wrap: anywhere` (`global.css:651-674`).

---

## 4. Spacing, radii, borders, shadows, texture

### 4.1 Spacing

react-zen spacing unit is `--spacing: .25rem` = **4px**
(`node_modules/@talivia/react-zen/styles.full.css`), so props `p="1..6"` are
4/8/12/16/20/24px. `--gap-default: .75rem` (12px).

Observed rhythm:

| Context                  | Value                                                     |
| ------------------------ | --------------------------------------------------------- |
| Dense control gaps       | 4-8px                                                     |
| Form field stack         | 14px (onboarding), 22px (form blocks)                     |
| Panel interior           | 24px (`paddingY="6"`), 12/24px inline                     |
| Panel header row         | min-height 40px                                           |
| Card grid gaps           | 12px (workbench charts), 16px (portfolio), 18px (paywall) |
| Section vertical padding | 56-72px marketing; 40-56px auth/onboarding                |
| App page padding         | 12px mobile / 24px desktop, bottom 24px                   |
| Onboarding step gap      | 32px                                                      |
| Auth column gap          | 24px (`gap="6"`)                                          |

Marketing spacing set: `4, 8, 12, 16, 22, 24, 28, 30, 40, 44, 56, 72, 84`.
Do not invent 5/7/9/13/17px outside a specific optical correction.

### 4.2 Radius inventory (observed)

| Radius | Used by                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 6px    | badges, onboarding framework tabs, copy button, landing `rounded-md`, default react-zen `--radius-default`                |
| 7px    | tracker reminder action, pricing toggle thumb                                                                             |
| 8px    | buttons, inputs, nav links, app pill `--talivia-control-radius` is 10 (see note), table focus inset, landing `rounded-md` |
| 9px    | theme toggle, payment guide link                                                                                          |
| 10px   | `--talivia-control-radius`, dashboard/hero panels, site switcher, filter chip, onboarding code/provider cards, logout     |
| 11px   | paywall CTA                                                                                                               |
| 12px   | popover/menu, session stat, import card, payment status, table focus, select overlay                                      |
| 13px   | chart/tooltip card                                                                                                        |
| 14px   | filter bar, marketing plan card, tracker reminder, docs sidebar                                                           |
| 16px   | portfolio site card, hero-preview frame                                                                                   |
| 18px   | first-run panel                                                                                                           |
| 20px   | react-zen dialog, settings surface, metric overview card, usage surface, data-management panel                            |
| 22%    | brand mark corner (percentage)                                                                                            |
| 24px   | paywall plan card                                                                                                         |
| 999px  | pills, dots, progress track/thumb, category chips                                                                         |

### 4.3 Borders and elevation

- Default border is **1px** `var(--talivia-card-border)`.
- Hover = border → `var(--border-strong)` + fill → `var(--surface-hover)`.
  No shadow change on app surfaces (`global.css:741-749`, `1317-1343`).
- Focus = `outline: 2px solid var(--focus-ring-color); outline-offset: 2px`
  globally (`global.css:3517-3520`). Offsets used: 1px (dense nav), 2px
  (default), 3px (landing links, Google button), 4px (range thumbs).
- App surfaces are **flat**: `box-shadow: none !important` is forced on app,
  dialog and popover buttons (`global.css:1293-1297`); panels and menus also
  get `box-shadow: none`.
- Permitted shadows:
  - tooltip: `0 16px 42px` theme token;
  - fixed reminder: `0 18px 44px rgba(0,0,0,.16)` (overlay exception);
  - full-screen session dialog: `0 28px 90px rgba(0,0,0,.55)`;
  - paywall: `0 24px 70px -30px` / highlighted `0 30px 90px -34px`;
  - marketing plan card: `inset 0 1px 0 rgba(255,255,255,.8)`;
  - landing: hard offsets `4px 4px 0` / `8px 8px 0 rgba(255,79,0,…)`.
- Selected/active rows use a **1px inset ring**:
  `box-shadow: inset 0 0 0 1px var(--border-strong)` for table rows
  (`global.css:2096-2100`).

### 4.4 Texture and sheen

| Layer              | Definition                                                                                                                                                                | Notes                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Paper grain        | `body::after`, `url("/textures/grain.svg")`, tile `180px 180px`, opacity `.035` light / `.055` dark, `mix-blend-mode: soft-light`, `z-index: 9999`, `pointer-events:none` | Hidden in `forced-colors` and print; **hidden entirely when `.talivia-app-shell` is present** (`global.css:205-207`) |
| App dot field      | `radial-gradient(circle, var(--rl-app-dot) 0.55px, transparent 1.1px)`, `24px` tile                                                                                       | `body` background; disabled on app shell                                                                             |
| Auth texture       | two radial glows + dot field (`global.css:479-489`)                                                                                                                       | Only `login/signup/verify/reset/invite`                                                                              |
| Onboarding texture | top glow `900px 500px at 50% -10%` + dot field (`Onboarding.module.css:17-22`)                                                                                            |                                                                                                                      |
| Marketing texture  | warm top glow `900px 520px at 50% -10%` + dot field (`Pricing.module.css:16-21`)                                                                                          |                                                                                                                      |
| Landing-only       | dot field `rgba(23,23,23,.28)` at `24px`; hairline grid `48px`; hatch `45deg / 10px`; pink hatch; pink marker swipe                                                       | `.landing-root` only                                                                                                 |
| Card sheen         | `linear-gradient(180deg, var(--rl-panel-sheen) 0, transparent 112px)`                                                                                                     | `--rl-panel-sheen` dark `.045`, light `.62`                                                                          |
| Marketing sheen    | same shape, height `104px`, `--marketing-sheen rgba(255,255,255,.66)`                                                                                                     |                                                                                                                      |

Do not texture charts, table rows, inputs, focus rings, or status surfaces.

---

## 5. Component inventory

### 5.1 Buttons

| Variant                      | Height                                | Radius | Fill / text                                                  | Source                             |
| ---------------------------- | ------------------------------------- | ------ | ------------------------------------------------------------ | ---------------------------------- |
| App primary                  | 36px (`--talivia-control` min-height) | 10px   | `--primary` / `--primary-foreground`                         | `global.css:799-815`, `1361-1369`  |
| App secondary                | 36px                                  | 10px   | card bg, `--talivia-card-border`, `--text-primary`           | `global.css:1299-1343`             |
| Quiet / icon                 | 28-36px                               | 8-10px | transparent, muted → hover surface                           | `global.css:612-617`, `1345-1359`  |
| Danger                       | 36px                                  | 10px   | `rgba(255,69,69,.14)` + `.36` border + `--status-error-text` | `global.css:1371-1390`             |
| Auth primary                 | 44px (Google 50px)                    | 10px   | `--primary`                                                  | `global.css:1070-1097`             |
| Onboarding primary/secondary | 38px                                  | 8px    | fg / canvas, or transparent + hairline                       | `Onboarding.module.css:290-379`    |
| Marketing pricing CTA        | 38px                                  | 8px    | fg / canvas, or transparent + hairline                       | `Pricing.module.css:393-433`       |
| Landing CTA                  | 56px                                  | 6px    | `#ff4f00`, white, 14px/900, uppercase `0.14em`, hard shadow  | `HeroSection.tsx:241`              |
| Paywall CTA                  | 44px                                  | 11px   | `--accent-text` / app bg, 11px/750 uppercase `0.06em`        | `BillingPaywall.module.css` `.cta` |

States: hover = fill/border shift only; active = `translateY(1px)`
(onboarding, marketing CTA); disabled = opacity `.46` (provider),
`.55` (onboarding/paywall), `.56` (paywall), `.65` (app controls), no pointer.
No button has a drop shadow in the app.

### 5.2 Inputs and controls

| Context               | Height    | Radius   | Notes                                   |
| --------------------- | --------- | -------- | --------------------------------------- |
| App control / select  | 36px      | 10px     | card bg, hairline, hover strong border  |
| App search/text inner | 34-36px   | inherits | borderless inside control shell         |
| Auth field            | 44px      | 10px     | card bg                                 |
| Onboarding field      | 38px      | 8px      | transparent fill                        |
| Paywall/landing field | 56px      | 6px      | landing only                            |
| Filter chip           | 38px      | 10px     | `inset 0 0 0 1px var(--surface-subtle)` |
| Filter bar            | min 56px  | 14px     | padding `10px 12px`, full width         |
| Textarea (code)       | min 100px | inherits | `.code-textarea textarea`               |

Placeholder = `color-mix(in srgb, var(--rl-muted-fg) 65%, transparent)`
(onboarding) or `text-lp-fg-muted/60` (landing). Focus = blush border + subtle
fill; never a glow. Error = danger text below the field, never colour alone.
Labels are real `<label>`s, 11px/500, `letter-spacing: .02em`, muted.

### 5.3 Panels and cards

- **Panel** (`src/components/common/Panel.tsx`): card bg, 1px hairline,
  react-zen default radius, padding 24px, shared sheen gradient, optional
  title/description/fullscreen toolbar. Dashboard variants are forced to
  radius **10px** and flat (`global.css:212-226`).
- **Metric card (overview)**: radius 20px, card bg, hairline, 24px x 16px
  padding, label row + 4xl value + optional change (`MetricCard.tsx`).
  The value animates with `react-spring`.
- **Chart card**: radius 10px (`WebsiteCharts.module.css`) or 16px
  (`PortfolioCharts.module.css`) — same anatomy, two radii.
- **Portfolio site card**: min-height 196px, radius 16px, sheen, hover only
  brightens border; settings link fades in from `translateY(-2px)` over 120ms
  (`global.css:352-369`, `1504-1550`).
- **Settings surface**: radius 20px + sheen
  (`SettingsPageLayout.tsx:25-30`).
- **First-run panel**: max-width 620px, radius 18px, padding 28px.
- **Marketing plan card**: radius 14px, padding 28px, sheen + inset white
  line; Pro = blush border `.34` + 14% blush gradient to 38% height.
- **Paywall card**: radius 24px, translucent gradient + `backdrop-filter:
  blur(24px) saturate(155%)`, hover `translateY(-2px)`.

### 5.4 Tables

- Grid-based, not `<table>`, for sessions/payments; header min-height 32px,
  rows min-height 31-36px, padding `7-8px 16px`, `gap 10-18px`.
- Row separator is `border-bottom: 3px solid var(--talivia-card-background)`,
  creating a tonal gutter rather than a visible line.
- Header text `--text-muted`; body cells `--text-strong` ("session", provider,
  amount) and `--text-soft` (metadata).
- Hover row = `--surface-hover`; keyboard focus = 1px inset ring.
- Amount/date columns right-align, `white-space: nowrap`, tabular.
- Responsive: 6 columns → 4 at `≤900px` → 2 at `≤600px`; payments collapse to
  `minmax(0,1fr) auto`.

### 5.5 Navigation

- App top nav: 56px min-height, 1080px max width, wordmark left, theme toggle
  and user right, optional `Upgrade` pill (30px, 999 radius, accent border at
  34% and fill at 7%) (`global.css:376-404`).
- Website destination row: 32px links, 8px radius, 2px gap, horizontal scroll
  with hidden scrollbar; selected = `--surface-subtle` + primary text; "More"
  selected = accent text (`global.css:296-350`).
- Section nav (≥1024px): sticky `top:16px`, 36px rows, 8px radius, uppercase
  10px `0.14em` group label; selected = blush border `.22` + fill `.1` +
  accent text. Below 1024px it becomes sticky horizontal pill tabs (36px,
  999 radius) (`global.css:3423-3511`).
- Settings: 240px rail + content at `lg`, single column below; 44px rows;
  selected row = blush fill `.12` + border `.34` (`SettingsPageLayout.tsx`).
- Docs: 220px sticky sidebar + 56px gap + 760px article.
- Logout: fixed `bottom:18px left:18px`, 34px, radius 10, card bg; icon-only
  under 640px (`global.css:431-477`).

### 5.6 Tabs

- No underline. `[role="tablist"]` border removed; selected tab is
  `font-weight: 700` (dashboard panel tabs `650`) and primary text.
- Panel tab strip: 40px header, 12px/500 labels, actions on the right
  ("Visitors/Revenue" sort + expand icon at 28px).
- Mobile `.tab` min-height 34px, 12px, wraps or scrolls.

### 5.7 Modals, popovers, menus, tooltips

| Surface              | Radius | Shadow                        | Notes                                                                                                                        |
| -------------------- | ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Dialog               | 20px   | none                          | card bg, hairline; react-zen entry `0.2s ease-out` fade / `0.3s cubic-bezier(.175,.885,.32,1.275)` zoom                      |
| Session dialog       | 20px   | `0 28px 90px rgba(0,0,0,.55)` | max-width 1080, `calc(100% - 24px)` / `-48px` ≥768                                                                           |
| Popover/menu/listbox | 12px   | none                          | `clip-path: inset(0 round 12px)`, 8px item radius, selected = blush `.14`                                                    |
| Tooltip              | 13px   | theme tooltip shadow          | `padding: 10px 12px`, arrow hidden, title 13/700, row 13, grid `auto minmax(0,1fr) auto`, max width `min(400px, 100vw-24px)` |
| Chart tooltip        | 13px   | theme tooltip shadow          | same tokens as tooltip, `gap:8px`, fixed positioning, viewport margin 12px, gap 10px                                         |

Destructive confirmation uses `TypeConfirmationForm`: type the exact value,
then confirm (`src/components/common/TypeConfirmationForm.tsx`).

### 5.8 Charts

See §8.

### 5.9 Empty, loading, error, success, paywall

See §9.

---

## 6. Layout and content widths

| Surface                          | Max width                            | Gutter                 | Notes                                        |
| -------------------------------- | ------------------------------------ | ---------------------- | -------------------------------------------- |
| App shell (`TopNav`, `PageBody`) | **1080px** (`APP_LAYOUT_MAX_WIDTH`)  | 12px mobile / 24px ≥md | Nav 56px tall                                |
| Website workbench                | 1080px (`WEBSITE_LAYOUT_MAX_WIDTH`)  | same                   | No left rail; header + destination row       |
| Settings                         | 1080px                               | same                   | `240px + 1fr` grid ≥lg, gap 24               |
| Portfolio home                   | 1080px                               | same                   | Site grid 1/2/3 columns, gap 16              |
| Onboarding shell                 | **880px** header/footer              | 20px mobile / 32px     | Content column **440px**, body padding 32/48 |
| Auth                             | **400px** (`min(400px, 100vw-40px)`) | 20px                   | Centered, `padding: 32px 20px`               |
| Marketing pricing                | 1080px nav/compare/footer            | 24px                   | Hero/plans **880px**; FAQ 760px              |
| Docs                             | 1080px                               | 24px                   | 220px sidebar + 56px gap + 760px article     |
| Legal                            | 860px page / 720px prose             | 24px                   |                                              |
| Options/alternatives             | 1080px                               | 24px                   | Lede 760px                                   |
| Landing                          | **1280px** (`max-w-7xl`)             | 24px (`px-6`)          | Sections `py-16 md:py-20`; hero `pt-24/28`   |
| Paywall                          | **920px**                            | 20px                   | Two cards, gap 18; hero copy 680px           |
| Share embed                      | `100vw`, `overflow-x: hidden`        | 18px block padding     | Metric strip scroll disabled                 |
| Expanded analytics modal         | 1320px                               | —                      |                                              |

Breakpoints in use: `560, 600, 620, 640, 720, 760, 768, 860, 900, 980, 1023,
1024, 1200 (xl), 1280, 1536 (2xl)`. The product CSS modules cluster on
`600/640/760/900`; the landing uses Tailwind `sm 40rem`, `md 48rem`,
`lg 64rem`, `xl 80rem`.

Grid patterns:

- Portfolio: `1fr` → `repeat(2, minmax(0,1fr))` → `repeat(3, minmax(0,1fr))`.
- Workbench charts: `repeat(2, minmax(0,1fr))`, gap 12, one column ≤900.
- Breakdown panels: 2×2 (`repeat(2, …)`), each a `Panel`.
- Metric strip: auto-flowing columns, 96px tall, 30px gaps, 1px separators at
  84% height, value `clamp(22px,2vw,28px)`; ≤600 becomes a 2-column grid of
  six rows.

---

## 7. Motion

### 7.1 Tokens and durations

| Motion                                    | Value                                                          | Source                                                  |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Onboarding step offset                    | `12px`                                                         | `Onboarding.module.css:688-708`                         |
| Onboarding duration                       | `320ms ease-in-out`                                            | same                                                    |
| Onboarding stagger                        | `70ms × index`                                                 | `OnboardingControls.tsx:13,32`                          |
| Step heading reveal                       | `320ms ease-in-out`, translateY 12px                           | `Onboarding.module.css:145,326`                         |
| Hover/press (onboarding, auth, marketing) | `160ms ease`                                                   | multiple                                                |
| App hover (rows, nav, cards)              | `120ms ease` / `150ms ease`                                    | `global.css:323-326`, `389-391`                         |
| Card lift (portfolio settings icon)       | `120ms` color/opacity/transform                                | `global.css:1522-1526`                                  |
| Progress width                            | `320ms ease-in-out`                                            | `UsageSettingsPage.tsx:111-113`                         |
| Welcome word                              | `600ms cubic-bezier(.16,1,.3,1)`, delay `1100 + i*70ms`        | `welcome-overlay.tsx:87-95`, `Welcome.module.css:77-86` |
| Welcome hold                              | `2.9s` (`1.1s` reduced)                                        | `docs/ONBOARDING_SPEC.md:129-132`                       |
| Welcome title exit                        | `340ms cubic-bezier(.4,0,1,1)`, `translateY(-10px)`            | `Welcome.module.css:53-64`                              |
| Welcome backdrop fade                     | `700ms cubic-bezier(.5,0,.1,1)` (`400ms` reduced)              | `Welcome.module.css:29-37`                              |
| Marketing hero rise                       | `520-560ms cubic-bezier(.22,1,.36,1)`, 10px, 70ms card delay   | `Pricing.module.css:81,311,319`                         |
| Landing entrance                          | `640-760ms cubic-bezier(.16,1,.3,1)`, 18px                     | `landing.css:284-300`                                   |
| Landing word stagger                      | `18ms` per word                                                | `landing.css:486`                                       |
| Landing scroll reveal                     | `720ms`, distance 32px, optional delay                         | `landing.css:457-467`                                   |
| Landing process node                      | `300ms`; stack tiles `200ms ease-out`                          | `landing.css:507-544`                                   |
| Reminder entrance                         | `220ms ease-out`, 8px                                          | `TrackerReminder.module.css:96-104`                     |
| Modal/popover (react-zen)                 | `0.2s ease-out`; zoom `0.3s cubic-bezier(.175,.885,.32,1.275)` | react-zen stylesheet                                    |
| Toast                                     | `3000ms` visible                                               | `src/app/Providers.tsx:57`                              |
| Chart animation                           | `300ms` (`DEFAULT_ANIMATION_DURATION`)                         | `src/lib/constants.ts:17`                               |
| KPI number                                | `react-spring` default spring                                  | `MetricCard.tsx`                                        |

### 7.2 Directional logic

Forward: enter from `+12px` (below), exit to `-12px`. Backward: enter `-12px`,
exit `+12px`. The implementation only animates the entering panel
(`stepForward` / `stepBackward`); the outgoing panel is replaced. Both keyframes
end at `translateY(0)`, `opacity: 1`.

### 7.3 Reduced motion

- Global kill switch: `@media (prefers-reduced-motion: reduce)` sets
  `animation-duration: .01ms`, `transition-duration: .01ms`, iteration 1,
  `scroll-behavior: auto` on everything (`global.css:3534-3546`).
- Onboarding disables panel/heading/reveal animations
  (`Onboarding.module.css:742-749`).
- Landing disables every named entrance and sets scroll reveals, tagline words
  and parallax to their final state (`landing.css:691-742`).
- Reminder, pricing hero/cards, paywall transforms are individually disabled.
- Welcome shortens hold to 1.1s and fade to 400ms.

### 7.4 Motion rules

- Motion explains direction or state, never decorates a data read.
- One-shot entrances only; nothing loops except a genuine loading indicator and
  the landing marquee/star border.
- Hover never moves a data row or a panel; only non-data chrome (cards,
  settings icon) may translate 1-2px.
- `@media (hover: hover)` guards all hover-only reveals so touch devices still
  show the control.

---

## 8. Chart styling

### 8.1 Axis, grid, tooltip

Chart.js (`src/components/charts/BarChart.tsx`):

```ts
x: { grid: { display: false }, border: { color: '#3a3a3a' },
     ticks: { color: '#7b7b7b', autoSkip: false, maxRotation: 0 } }
y: { min: 0, grid: { color: '#3a3a3a' }, border: { color: '#3a3a3a' },
     ticks: { color: '#7b7b7b' } }
```

- Text `#7b7b7b`, line `#3a3a3a` (`VISUALIZATION_COLORS.chart`, `src/lib/colors.ts:59-75`).
- X grid is off; Y grid is on, 1px.
- Y axis hidden below `600px` (`global.css:3093-3096`).
- Compact x-axis labels drop to `11px`, first label untransformed, last label
  `translateX(-100%)` (`global.css:3041-3051`).
- Tooltips are HTML cards, not canvas: 13px radius, hairline, theme shadow,
  `10px 12px` padding, 9px colour dot with 3px radius, row grid
  `auto minmax(0,1fr) auto`, 13px values, 12px subtle secondary line.

### 8.2 Palettes (all currently live)

| Source                                             | Values                                                                                                  | Use                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `VISUALIZATION_COLORS.chart` (`lib/colors.ts`)     | primary `#2680eb` at α `.4/.7` (views), `.6/.9` (visitors)                                              | Pageviews chart, map                  |
| `CHART_COLORS` (`lib/constants.ts:219`)            | `#2680eb #9256d9 #44b556 #e68619 #e34850 #f7bd12 #01bad7 #6734bc #89c541 #ffc301 #ec1562 #ffec16`       | Events, performance, event properties |
| `CHART_PALETTE` (`charts/echarts/colors.ts:42`)    | `#a63a60 #3b82f6 #8b5cf6 #0f8a5f #d97706 #0891b2`                                                       | ECharts multi-series                  |
| `METRIC_COLORS` (`analytics/lib/metric-colors.ts`) | visitors `#3b82f6`, revenue `#16a34a`                                                                   | Revenue/visitors bar charts           |
| `DualMetricTable`                                  | visitors `#4c9aff`, revenue `#ff8f6b`                                                                   | Breakdown rows                        |
| `HeroPreview` (marketing)                          | dark accent `#6f9fff`; light accent `#2f6fd6`; series `#2f6fd6 #8b5cf6 #0ea5a4 #d97706 #db2777 #4f46e5` | Landing product visual only           |
| Map                                                | base/stroke/hover `#2680eb`, fill `#191919`                                                             | World map                             |

`readChartColors()` resolves live CSS vars for ECharts: text `--text-primary`,
muted `--text-muted`, grid `--talivia-card-border`, surface
`--talivia-card-background`, border `--border-default`, accent `--accent-text`,
positive `--status-success`, negative `--status-error`. This is the only
theme-aware chart path; Chart.js colours are hard-coded.

### 8.3 Accents and semantics

- Revenue is green (`#16a34a` in Chart.js, `--status-success` in ECharts).
- Visitors/views are blue.
- Blush is not a chart series colour except as `CHART_PALETTE[0]` in ECharts and
  selected/heatmap states.
- Heatmap: 5 steps of blush alpha `.18/.32/.52/--accent-text` with matching
  borders (`global.css:2232-2250`).
- Change labels: positive `--status-success`, negative `--status-error`,
  dimmed row `opacity .32` (`global.css:2995-3001`, `2339-2341`).

### 8.4 Chart layout rules

- Hero chart height 400px; card body `padding: 4px 8px 10px`.
- Chart card header: 14px 16px top padding, 10px uppercase eyebrow
  (`0.08em`), bold title, right-aligned 11px tabular meta.
- Loading a chart keeps its frame; a translucent overlay
  (`--surface-subtle`, radius 10) sits over the previous render.
- Empty chart area is centred muted text at min-height 200px.
- Never show a fake series or placeholder value; empty means empty.

---

## 9. State patterns

### 9.1 Empty

- **In-panel**: centred muted `No data` (`Empty.tsx`, `DualMetricTable.tsx`) or
  `No data for this period` (charts, portfolio). Minimum height 70px / 200px.
- **Full surface**: `EmptyPlaceholder` = optional 24px muted icon, bold 16px
  title, muted sentence, one action. Used for workspace-empty website lists.
- **First-run**: `WebsiteFirstRunPanel` = 620px panel, radius 18, eyebrow,
  22px title, 13px body at 48ch, numbered steps in 22px circles, one primary
  action at 38px.
- Copy rule: one sentence, one action, no illustration bloat, never fake rows.

### 9.2 Loading

- Initial shell: full `Loading placement="absolute"` (react-zen dots).
- Local panel: `LoadingPanel` shows a loader only on the first load; refetches
  keep the previous content mounted (`LoadingPanel.tsx`).
- Local action: an inline 12px ring spinner, 1.5px track, top border
  foreground, `700ms linear` (`Onboarding.module.css:639-647`).
- Chart refresh: overlay, not a layout swap.
- Skeleton placeholders are **not** used anywhere in the product.

### 9.3 Error

- Route/panel error: centred warning triangle + one sentence
  (`ErrorMessage.tsx`, `messages.error`).
- Auth error: full-width box, 12px 14px padding, radius 10, border
  `color-mix(danger 38%)`, fill `10%`, 13px/1.45, `role="alert"`.
- Import error: 12px radius, `rgba(255,69,69,.26)` border, `.08` fill,
  13px/700 `--status-error-text`.
- Field error: 12px danger text below the input, 1.5 line-height.
- Rule: say what happened + what to do next; never a raw stack trace or code.
- Every error keeps the existing numbers on screen where possible.

### 9.4 Success

- Toast: react-zen toast, 3s, one short sentence (`Saved.`, `User created.`).
- Inline status: 2px success left border + `.075` fill + 12px radius on the
  right (`payment-connection-status`, `talivia-import-summary`).
- Install status card: hairline + `--surface-subtle`; when installed, border
  `rgba(45,191,114,.35)`, fill `.06`, dot `--status-success` with a 3px
  `rgba(45,191,114,.16)` ring.
- Copy action: `aria-live="polite"` text feedback, never a colour flash alone.

### 9.5 Warnings and paywall

- Usage banner: full-width strip, blush `.08` fill + `.22` border normally;
  `rgba(255,107,107,.1)` fill + `.3` border when paused. Text states the fact
  and links `View plan and usage`.
- Usage bar: 8px track `--surface-subtle`, radius 999; fill green
  (`#2dbf72`) at ok, accent at warning/grace, `#ff6b6b` at limit; width
  `320ms ease-in-out`.
- Paywall: full-height, 920px column, glow blobs, two 24px cards, annual
  toggle, traffic slider, warning notices for blocked states. It is the one
  intentionally "loud" product screen; do not copy its glow/blur into the
  dashboard.
- No fake invoices, statuses, testimonials, logos, ratings or counts anywhere.

### 9.6 Accessibility state rules

- Status is never colour alone: pair with text or icon.
- `aria-live` for copy feedback and the welcome overlay; `role="alert"` for
  errors; `role="status"` for async progress.
- Focus is always visible at 2px blush, offset 2px.
- Touch targets ≥40px on mobile; app icon buttons are 28-36px but sit in
  44px rows or gain padding.
- `prefers-reduced-motion` is a hard requirement for every new animation.

---

## 10. Microcopy tone

### 10.1 Rules

1. Second person, present tense, sentence case. No exclamation marks, emoji or
   hype.
2. Lead with the customer's outcome, not the feature: "See which channels make
   money", not "Multi-touch attribution engine".
3. One idea per sentence. Short. Concrete nouns.
4. State the constraint honestly. `No free tier.` / `No password needed.` /
   `No per-seat surprises.`
5. Errors: what happened + what to do. "We could not load your setup progress."
   then the retry action.
6. Limits: say the number and the consequence. "Billable events ingestion is
   paused. Your dashboard is still available."
7. Never invent urgency, social proof, counts or statuses.
8. Money always includes a currency; counts always use a thousands separator.
9. Avoid internal jargon in customer copy ("tenant", "ingest" → only where the
   user must understand billing; "billable ingestion" is accepted in usage
   copy).
10. Em dashes are used sparingly for an aside, never as the main sentence
    structure.

### 10.2 Real examples to imitate

- `Connect your site, connect your payments, see which channels make money.`
  (`brand.ts`)
- `Two plans. No free tier.` (`PricingPage.tsx:89`)
- `Revenue analytics that grows with your traffic.` (`PricingPage.tsx:90`)
- `Pick the plan that matches your traffic. Move the slider to see the event
  allowance and price for each plan. No per-seat surprises.`
- `Start tracking revenue` / `Add the website or app where you want to see which
  channels make money. We set up everything behind it for you.`
  (`WebsiteStep.tsx:24-27`)
- `One tracker script. One payment connection. No workspace setup required.`
- `Install the tracker` / `Paste one script into acme.com so Tartly can measure
  visits, sessions, and the path to revenue.` (`TrackerStep.tsx:70-71`)
- `Connect revenue` / `Connect the payment provider that already handles your
  revenue. Tartly reads payments and matches them to the traffic that created
  them.` (`PaymentStep.tsx:145-146`)
- `Tracker not connected` / `acme.com has not sent an event yet. Install the
  snippet, or hand the AI prompt to your coding agent, to start collecting
  revenue data.` (`TrackerReminder.tsx`)
- `Billable events ingestion is paused. Your dashboard is still available.`
  (`UsageBanner.tsx`)
- `80% of this month's events used — grace period active.`
- `No data for this period` / `No websites in this workspace yet.`
- `We could not load your setup progress.`
- `Google sign-in was cancelled.` / `Your sign-in session expired. Try again.`
- Button verbs: `Continue`, `Save and continue`, `Finish setup`, `View plan and
  usage`, `Connect with Google`, `Start tracking`.

### 10.3 Structural copy patterns

- Marketing eyebrow = the promise's constraint in caps: `TWO PLANS. NO FREE
  TIER.` or `FIRST + LAST TOUCH`.
- Plan tagline = who it is for, not a feature list: `Your first revenue signal`
  / `For indie SaaS, teams, and small agencies`.
- Step heading = verb + object; subtitle = why it matters + what we do.
- Hint under a field explains the mechanical consequence ("We normalize HTTPS,
  paths, and query strings to the domain.").
- Inline note under the primary action removes a fear ("No workspace setup
  required.", "cancel anytime").

---

## 11. Inconsistencies found (evidence) and minimal consolidation proposal

These are observations, not a redesign request. Each is fixable without
touching behaviour.

### 11.1 `brand.ts` colours are a stale parallel palette

`src/lib/brand.ts:35-47` declares `canvas #1b1b1b`, `card #222222`,
`muted #262626`, `accent #2e2e2e`; the live dark theme is
`app #1f1f1f`, `card #262626`, `sunken #171717`, `interactive #2a2a2a`
(`global.css:99-130`). `docs/UI_DESIGN_SYSTEM.md` repeats the stale
`#1b1b1b/#222222` table. `brand.ts` is used for contrast tests and metadata,
not for rendering.

**Proposal:** delete `BRAND.colors` and point the contrast test at resolved CSS
tokens, or rename it to `BRAND.contrastPairs` with values matching
`global.css`. One palette, one file.

### 11.2 Docs claim a texture and theme model the app does not use

`UI_DESIGN_SYSTEM.md:38` says "Single dark palette. No light theme at launch."
The app ships light **and** dark, dark by default (`global.css:36-154`,
`theme.ts`). The docs also say the app shell has a 24px dot field and two
glows (`UI_DESIGN_SYSTEM.md:107-110`); `global.css:194-207` explicitly removes
the dot field, the grain and the body texture for `.talivia-app-shell`.

**Proposal:** update the two paragraphs and add "product surfaces are flat; only
auth/onboarding/marketing carry a dot field" as a rule.

### 11.3 The landing page is a second, different brand language

`.landing-root` re-points marketing tokens to `#171717` ink, `#737373` muted,
`#ddd5cc` lines and **`#ff4f00` signal orange** (`landing.css:39-53`), uses mono
eyebrows, 6px radii, 56px buttons and hard offset shadows
(`HeroSection.tsx:241`, `landing.css:225-310`). Every other public page
(pricing, docs, legal, alternatives) uses 1080px, `#a63a60` blush, Inter only,
14px cards, soft sheen and no hard shadows
(`Pricing.module.css`, `Docs.module.css`). The landing hero preview adds a third
accent (`#6f9fff`). `UI_DESIGN_SYSTEM.md` does not mention the orange at all.

**Proposal (pick one, cheapest first):**

- **A (recommended, minimal):** keep the landing as the "editorial" marketing
  surface and document it as an explicit exception in
  `UI_DESIGN_SYSTEM.md` §2, with a hard rule: the orange and mono eyebrows never
  cross into `/pricing`, `/docs`, `/legal`, or the app. Change one token
  (`--marketing-blush` inside `.landing-root`) if the owner wants the blush
  signal to stay the only accent.
- **B:** bring `/pricing` and `/docs` onto the landing tokens (larger change,
  not needed for correctness).

### 11.4 Radius and weight sprawl

Radii in production: `6,7,8,9,10,11,12,13,14,16,18,20,22%,24,999`. Weights:
`400,500,550,600,650,700,720,730,740,750,760,780,800,900`. Two chart cards with
identical anatomy use 10px (`WebsiteCharts.module.css:9`) and 16px
(`PortfolioCharts.module.css:5`). The generic `Panel` resolves to the react-zen
default 6px unless a dashboard class overrides it to 10px, while metric cards
and settings panels use 20px and the paywall uses 24px.

**Proposal:** publish a 5-step radius scale and map every existing surface:

| Step    | Value | Use                                                |
| ------- | ----- | -------------------------------------------------- |
| control | 8px   | buttons, inputs, nav links, tabs                   |
| panel   | 12px  | popovers, menus, tooltips, small cards             |
| card    | 16px  | content/dashboard cards (replace 10/14/18/20 here) |
| sheet   | 20px  | dialogs, settings shells, page-level panels        |
| pill    | 999px | pills, dots, progress                              |

Keep `--talivia-control-radius: 10px` only if the 8px shift is rejected; do not
add a sixth value. Same for weights: `400` body, `500` labels/secondary,
`600` headings/primary, `700` emphasis/data, `800` marketing display. Replace
`650/720/730/740/750/760/780` with the nearest of these.

### 11.5 Six chart palettes

`VISUALIZATION_COLORS` (`#2680eb`), `CHART_COLORS` (12 hues), `CHART_PALETTE`
(6), `METRIC_COLORS` (blue/green), `DualMetricTable` (`#4c9aff/#ff8f6b`) and
the landing preview palette all coexist. Revenue is `#16a34a` in one chart and
`#ff8f6b` in another; visitors are `#2680eb`, `#3b82f6`, `#4c9aff` and
`#6f9fff` depending on the file.

**Proposal:** one `src/lib/chart-colors.ts` that re-exports CSS-variable-derived
values plus a fixed 6-colour series order. Semantic mapping must be stable:
revenue = `--status-success`, visitors/traffic = one blue, everything else walks
the series order. Migrate call sites without changing chart behaviour.

### 11.6 Numerals are not consistently tabular

Only some figures set `font-variant-numeric: tabular-nums`. Table cells, metric
strip changes and some KPI values rely on the font default.

**Proposal:** add a single utility class (e.g. `.rl-num`) and a global rule for
table numeric cells, KPI values and prices. No visual redesign; only alignment.

### 11.7 Docs vs code on onboarding progress and widths

- `UI_DESIGN_SYSTEM.md:165-168` describes a 2px blush progress bar; the flow
  renders the text `1 of 3` in 11px uppercase tabular type
  (`OnboardingFlow.tsx:439`, `Onboarding.module.css:110-116`) and has no bar.
- The docs say app content is 1120px (`UI_DESIGN_SYSTEM.md:207`); the constant
  is 1080px (`src/lib/constants.ts:14`).
- `ONBOARDING_SPEC.md` says the welcome holds `2.9s`; the design doc says
  `2.6s` (`UI_DESIGN_SYSTEM.md:132`). Both are documentation drift.
- Usage bar: docs say 2px (`UI_DESIGN_SYSTEM.md:167`); code renders 8px
  (`UsageSettingsPage.tsx:95-114`).

**Proposal:** pick the implemented values (text step count, 1080px, 2.9s, 8px
bar) and correct the docs. If a progress bar is wanted, add it to code — do not
leave the docs describing a component that does not exist.

### 11.8 Plan limit contradicts the owner instruction

`AGENTS.md` says Pro = "up to 20" websites; `src/lib/plans.ts:167` says
`websiteLimit: 50`, and `plans.test.ts` asserts 50. Pricing and paywall copy
render from config, so the UI currently sells 50.

**Proposal:** owner decision, then one edit in `src/lib/plans.ts` (plus the
test). Design rule: never hardcode a limit in a component; this is exactly why.

### 11.9 Missing token for repeated literals

`rgba(242,180,203,·)` is inlined in at least 15 places; `#ff6b6b` is a second
error red; `#2dbf72` duplicates `--status-success`; `#2680eb`, `#16a34a`,
`#3b82f6`, `#4c9aff` are chart literals. `--text-secondary` is referenced in
`BillingPaywall.module.css` but never defined (falls back to `--text-muted`).

**Proposal:** add `--rl-blush-rgb`, `--rl-blush-wash-14`, `--rl-success`,
`--rl-danger-soft` to `:root` and replace the inline rgba usage. Add
`--rl-chart-1…6` alongside §11.5. Define or remove `--text-secondary`.

### 11.10 Landing width is 1280px, everything else 1080px

`max-w-7xl` (`HeroSection.tsx:129`, all sections) vs `min(1080px, …)`
(`Pricing.module.css`, `Docs.module.css`, `constants.ts`).

**Proposal:** keep 1280 only if the landing is formally the "wide editorial"
surface; otherwise change the landing container to 1080px. Do not add a third
width.

### 11.11 Micro-label drift

Uppercase eyebrows use `9,10,11px` with tracking `0.08,0.1,0.12,0.14,0.16,0.18,
0.2em`. `WebsiteCharts` uses `10px/0.08em`, `TrackerReminder` `9px/0.08em`,
docs sidebar `10px/0.14em` and docs article `11px/0.14em`, pricing hero
`11px/0.12em`, landing `10px/0.2em` mono.

**Proposal:** two eyebrow recipes only — product `10px/600/0.08em` and marketing
`11px/600/0.12em` (landing may keep its mono `0.2em` under the §11.3 exception).

---

## 12. Do / Don't for a developer

### Do

- Read tokens from `global.css`; use `var(--…)`, never a new hex.
- Keep app surfaces flat: border + 1px inset ring for state, no drop shadow.
- Use one blush signal per screen region, and only for meaning.
- Use 1080px for app/public product pages; 440px onboarding column; 400px auth.
- Use 4px-grid spacing; 8px controls, 12px popovers, 16px cards, 20px sheets.
- Make focus `2px solid var(--focus-ring-color)` with `2px` offset.
- Use `tabular-nums` on every comparable figure and always format money with a
  currency.
- Use Iconoir from `src/components/icons.ts` only; 16px in rows, 24px in empty
  states/headers.
- Use `@media (hover: hover)` for hover-only reveals.
- Write one sentence for empty/error, then one action.
- Honour `prefers-reduced-motion`; test with it on.
- Keep `role="status"` / `role="alert"` / `aria-live` on async state.

### Don't

- Don't add Tailwind/shadcn to product surfaces (landing only).
- Don't introduce a new accent (blue, purple, orange) into the app.
- Don't use a glow, gradient border, or `backdrop-filter` on a dashboard panel.
- Don't invent a radius, weight, eyebrow size, or breakpoint outside §4/§7.
- Don't hardcode plan limits, prices, brand names or domains in components.
- Don't show a full-page spinner for a local action.
- Don't use a skeleton screen; the product uses loaders over existing content.
- Don't fake rows, counts, invoices, statuses, logos or testimonials.
- Don't use colour alone for success/error/selection.
- Don't animate a data row on hover or loop an entrance.
- Don't copy the paywall's 24px/glow/blur into the workbench.
- Don't trust `UI_DESIGN_SYSTEM.md` over this file where they disagree; see §11.
