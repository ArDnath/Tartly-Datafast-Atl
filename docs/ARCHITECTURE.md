# Architecture — Modular Monolith

RevenueLens is one deployable Next.js application with explicit internal
boundaries. The restructure keeps the inherited analytics engine intact while
moving every product surface out of the router.

## Layers

```
src/app/                     Next.js routing layer only
  (main)/**/page.tsx         parse params, render a feature screen
  api/**/route.ts            re-export HTTP handlers from feature server modules
  layout.tsx, Providers.tsx  root mounting only
src/features/<domain>/       product domains
  *.tsx                      screens and domain UI
  components/                domain-specific widgets and inputs
  hooks/                     domain client state and React Query hooks
  lib/                       domain helpers, contracts, and constants
  store/                     domain-only client state, where it exists
  server/**/handler.ts       request handlers and domain server logic
  server/queries/            domain-only data access, where it exists
src/components/              shared design-system primitives only
  brand, charts, common, input, svg, hooks
src/lib/                     cross-cutting services (auth, db, email, plans,
                             brand, usage, crypto, request/response)
src/queries/                 shared analytics engine and cross-domain data access
src/permissions/             central tenant authorization
src/store/                   shared application state
```

Dependency direction:

```
app  ->  features  ->  components / lib / queries / permissions / store
```

- `src/app` never contains product logic. A page parses route params and renders
  a feature component; an API route only re-exports HTTP methods and declares
  static Next config (`dynamic`, `runtime`).
- `src/features` owns product behaviour. Server handlers live in
  `src/features/<domain>/server/**` and are the only place request logic runs.
  Domain UI lives in `components/`, domain hooks in `hooks/`, and domain
  helpers in `lib/`.
- `src/components`, `src/lib`, `src/queries`, `src/permissions`, and `src/store`
  are shared. Features may import them; they must not import `src/features` or
  `src/app`. `src/components` is limited to the shared component directories
  listed above.
- `src/lib` and `src/store` are allowlisted. They are not dumping grounds: a
  new domain helper belongs in `src/features/<domain>/lib`, and a domain store
  belongs in `src/features/<domain>/store`. Adding a module to the shared
  allowlist is an explicit architectural decision.
- Cross-feature imports go through `@/features/<domain>` barrels or explicit
  paths. Do not reach into another feature with `../../`.

## Product domains

| Domain | Owns |
| --- | --- |
| `account` | `/api/me` profile, password, owned websites |
| `analytics` | ingestion (`send`, `record`, `batch`), heartbeat, realtime, report and metric endpoints; analytics widgets, filters, and analytics query hooks |
| `app-shell` | signed-in shell, top nav, notices, workspace switcher, user menu |
| `auth` | login, signup, verification, reset, logout, auth query hooks |
| `docs` | public documentation shell and provider revenue guides |
| `legacy` | frozen boards/links/pixels APIs and the share-rendered link/pixel pages; list, edit, and board UI are deleted |
| `marketing` | landing and pricing |
| `onboarding` | onboarding canvas and website setup |
| `payments` | provider connections, manual payments, provider webhooks, provider clients/backfills, credential encryption, payment provider UI |
| `portfolio` | `/app` all-websites home and its overview hook |
| `settings` | workspace, websites, billing/usage, account, preferences, local-user admin |
| `share` | public share shell, share widgets, and share APIs |
| `system` | health, OSS update endpoints, and the cron scheduler/jobs |
| `websites` | website CRUD, workbench reports, sessions, events, replays, settings, imports/exports, API keys, website selectors/context |
| `workspaces` | workspace CRUD, members, invitations, usage, active-workspace state |

`src/features/legacy` is quarantined. Do not copy its patterns or add new
imports from it.

## API route contract

Every `src/app/api/**/route.ts` is a thin adapter:

```ts
export { GET, POST } from '@/features/websites/server/[websiteId]/stats/handler';
```

Static Next configuration stays in the route file:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

Rules enforced by `src/lib/app-structure.test.ts`:

- `src/app` contains route conventions, CSS, and the root `Providers.tsx` only.
- API route files contain only re-exports from `@/features/**/server/**` plus
  static Next config.
- Every server domain listed above has a `server/` directory.
- Legacy `/websites/*` and `/settings/*` route groups do not exist.
- `src/components` contains only the shared design-system directories
  (`brand`, `charts`, `common`, `hooks`, `input`, `svg`).
- `src/lib` contains only the explicit shared-module allowlist and `src/store`
  contains only `app.ts`.
- Domain helpers live under `src/features/<domain>/lib`, and the structure test
  names the modules that completed the restructure.
- Shared layers (`components`, `lib`, `permissions`, `queries`, `store`) never
  import a product feature.

## Adding a feature

1. Create `src/features/<domain>/` with the screen or feature UI.
2. Put domain widgets in `components/`, domain query hooks in `hooks/`, and
   domain helpers in `lib/`.
3. Put request logic in `src/features/<domain>/server/`. Domain-only client
   state goes in `store/`, not `src/store`.
4. Add a route page that parses params and renders the feature.
5. Add `src/app/api/**/route.ts` that re-exports the handler.
6. Add a test beside the handler (`src/app/api/**/route.test.ts` remains the
   route contract test) or beside the domain module.
7. Extend the domain lists and contract tests in `src/lib/app-structure.test.ts`
   if you add a new top-level domain.

## Shared client and data layers

Three layers are intentionally shared rather than copied into every feature:

- `src/components/hooks` — only generic client infrastructure: fetch/mutation
  helpers, date-range and URL state, formatting, i18n messages, dialogs, and
  grid state. Domain query hooks live in `src/features/<domain>/hooks/` and are
  exported through that feature's `hooks/index.ts`.
- `src/queries` — the preserved analytics SQL engine plus cross-domain Prisma
  repositories. Tenant authorization (`src/permissions`) and the analytics
  engine depend on this layer, so it stays below features instead of moving up
  into one domain. Domain-only data access belongs in
  `src/features/<domain>/server/queries/`.
- `src/permissions` and `src/lib/workspace-auth.ts` — the one central
  authorization boundary. Never duplicate tenant checks in a feature.

This is the modular-monolith trade-off: domain behaviour is owned by features,
shared infrastructure stays shared, and the dependency arrow never points from
shared code back into product features.

## Domain UI, hooks, and data access

The restructure moved the remaining domain-specific UI out of `src/components`:

| Old location | New owner |
| --- | --- |
| `src/components/metrics` | `src/features/analytics/components/metrics` |
| `src/components/share` | `src/features/share/components` |
| `src/components/overlays/AnalyticsOverlayContext` | `src/features/analytics/components` |
| analytics filters and selectors | `src/features/analytics/components/input` |
| `WebsiteSelect` | `src/features/websites/components` |
| `WorkspaceSwitcher`, `UserButton` | `src/features/app-shell/components` |
| board/link/pixel selectors | deleted with the dead legacy dashboard UI |
| `PaymentProviderLogo` | `src/features/payments/components` |
| domain React Query hooks | `src/features/<domain>/hooks` |
| cron scheduler and jobs | `src/features/system/cron` |
| route-param-shaped `settings/websites/[websiteId]` | `src/features/websites/workbench/settings` |
| collector cache, cross-domain linker, attribution query, dashboard overview, bot/client detection, analytics filters and chart helpers | `src/features/analytics/lib` |
| payment return detection | `src/features/payments/lib` |
| auth return URL and transactional registration | `src/features/auth/lib` and `src/features/auth/server` |
| workspace invitations and member management | `src/features/workspaces/lib` |
| website API keys and domain normalization | `src/features/websites/lib` |
| legacy feature gate | `src/features/legacy/lib` |
| OSS version/update helpers | `src/features/system/lib` |
| dead dashboard/website/cache stores and the unused refresh button | deleted |

Only primitives remain in `src/components`: `common` (links, panels, tables,
empty/error states), `charts`, `input` (date picker and menu primitives),
`svg`, `brand`, and generic hooks. `src/store` contains only `app.ts`, the
shared locale/timezone/date-range/user shell state.

The shared `src/lib` allowlist is enforced by the structure test. It keeps
cross-cutting infrastructure (auth sessions, CSRF, rate limits, Prisma,
crypto, email, plans/usage, branding, request/response) plus the data
contracts the preserved analytics engine reads (`payment-status`,
`paymentCustomer`, `tracking-identity`, `dashboard-breakdown`,
`website-overview`, `currency-exchange`, `reporting-currency`, `board-types`).
Those contracts stay shared because `src/queries` is below features; moving
them upward would invert the dependency arrow. Provider-specific request
handling and UI still live in `src/features/payments`.

`src/queries/sql` stays in place deliberately: it is the inherited analytics
engine described in `docs/TENANCY.md`, and multiple features plus tenant
authorization read through it. Moving it into one feature would invert the
dependency direction without improving isolation.

`src/features/legacy` is intentionally tiny. Public share pages still render the
link and pixel detail screens, so their provider, panels, controls, and four
query hooks remain. Boards, list pages, edit forms, the board component
registry, and the old selectors had no route and were deleted; the legacy API
handlers remain only to return a consistent `legacy-feature-disabled` response.
`src/lib/app-structure.test.ts` pins this surface.

The portfolio MRR panel is served by `/api/me/websites/overview`. The Prisma
query (`src/queries/prisma/portfolioMrr.ts`) reads active subscriptions in the
authorized workspace and falls back to the earliest attributed payment when the
subscription has no visitor. Channel classification and currency-safe grouping
are pure functions in `src/lib/dashboard-breakdown.ts` and
`src/lib/website-overview.ts`, so they stay below features and are unit tested.

## Security boundary

The restructure is organizational only. Tenant isolation still runs through
`src/permissions/website.ts` and `src/lib/workspace-auth.ts`; handlers in
`features/websites/server` must resolve the website from the authorized
workspace before reading or writing. See `docs/TENANCY.md`.

## Why this shape

- One deployable, one database, no new infrastructure.
- The analytics engine (`src/queries/sql`, `src/tracker`, `src/recorder`,
  attribution and payment integrations) is preserved.
- A route file is now readable in seconds, and domain logic can be tested
  without importing the router.
- Analytics widgets, share widgets, domain selectors, and query hooks live with
  the feature that owns their behaviour instead of in a catch-all shared folder.
- Shared code cannot silently depend on a product feature; the structure test
  fails the build if that arrow reverses.
