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
  server/**/handler.test.ts  route contract tests, beside their handler
  server/queries/            domain Prisma repositories and the analytics SQL engine
src/components/              shared design-system primitives only
  brand, charts, common, input, svg, hooks
src/lib/                     cross-cutting services (auth, db, email, plans,
                             brand, usage, crypto, request/response)
src/queries/                 shared kernel repositories required by auth,
                             tenant authorization, request parsing, and billing
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
- `src/queries` is likewise allowlisted. Domain repositories belong in
  `src/features/<domain>/server/queries`; only repositories required by the
  shared authorization, request, auth, or billing kernel stay in
  `src/queries/prisma`. The analytics SQL engine lives in
  `src/features/analytics/server/queries/sql`.
- Cross-feature imports go through `@/features/<domain>` barrels or explicit
  paths. Do not reach into another feature with `../../`.

## Product domains

| Domain | Owns |
| --- | --- |
| `account` | `/api/me` profile, password, owned websites, account/security/preferences settings, local-user admin and permission checks |
| `analytics` | the signed-in website workbench (overview, reports, sessions, events, replay, realtime, cohorts, compare, segments), ingestion (`send`, `record`, `batch`), heartbeat, report/metric handlers and report permission checks, analytics widgets, filters, and query hooks |
| `app-shell` | signed-in shell, top nav, notices, workspace switcher, user menu |
| `auth` | login, signup, verification, reset, logout, auth query hooks |
| `billing` | platform subscription lifecycle, Dodo checkout/portal/cancel/change-plan, signed billing webhooks, invoices, and the plan/usage settings screen |
| `docs` | public documentation shell and provider revenue guides |
| `legacy` | frozen boards/links/pixels APIs and the share-rendered link/pixel pages, with their read permissions; list, edit, and board UI are deleted |
| `marketing` | landing and pricing |
| `onboarding` | onboarding canvas and website setup |
| `payments` | provider connections, manual payments, provider webhooks, provider clients/backfills, credential encryption, payment provider UI, integration settings |
| `portfolio` | `/app` all-websites home and its overview hook |
| `settings` | the settings shell, grouped navigation, and settings overview |
| `share` | public share shell, share widgets, and share APIs |
| `system` | health, OSS update endpoints, and the cron scheduler/jobs |
| `websites` | website CRUD, website settings, website list settings, imports/exports, API keys, members, shares, selectors/context |
| `workspaces` | workspace CRUD, members, invitations, usage, active-workspace state, workspace settings |

`src/features/legacy` is quarantined. Do not copy its patterns or add new
imports from it.

## API route contract

Every `src/app/api/**/route.ts` is a thin adapter:

```ts
export { GET, POST } from '@/features/analytics/server/[websiteId]/stats/handler';
```

Static Next configuration stays in the route file:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

Rules enforced by `src/lib/app-structure.test.ts`:

- `src/app` contains route conventions, CSS, and the root `Providers.tsx` only.
  Route contract tests live beside their handler under
  `src/features/<domain>/server/**/handler.test.ts`; the router has no tests.
- API route files contain only re-exports from `@/features/**/server/**` plus
  static Next config.
- Every server domain listed above has a `server/` directory.
- Analytics report handlers mirror `/api/reports/*` under
  `src/features/analytics/server/reports/`, and the realtime handler lives at
  `src/features/analytics/server/realtime/[websiteId]/handler.ts`.
- Legacy `/websites/*` and `/settings/*` route groups do not exist.
- `src/components` contains only the shared design-system directories
  (`brand`, `charts`, `common`, `hooks`, `input`, `svg`).
- `src/lib` contains only the explicit shared-module allowlist and `src/store`
  contains only `app.ts`.
- `src/queries` contains only the shared repository allowlist; domain
  repositories live under `src/features/<domain>/server/queries`, and
  `src/queries/sql` no longer exists.
- Domain helpers live under `src/features/<domain>/lib`, and the structure test
  names the modules that completed the restructure.
- The route layer never imports `@/queries`, `@/lib/prisma`, or `@/lib/redis`
  directly; it mounts feature screens or re-exports feature handlers.
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
6. Add a test beside the handler (`src/features/<domain>/server/**/handler.test.ts`
   is the route contract test) or beside the domain module.
7. Extend the domain lists and contract tests in `src/lib/app-structure.test.ts`
   if you add a new top-level domain.

## Shared client and data layers

Three layers are intentionally shared rather than copied into every feature:

- `src/components/hooks` — only generic client infrastructure: fetch/mutation
  helpers, date-range and URL state, formatting, i18n messages, dialogs, and
  grid state. Domain query hooks live in `src/features/<domain>/hooks/` and are
  exported through that feature's `hooks/index.ts`.
- `src/queries` — the small shared data kernel. It keeps only repositories that
  the shared layers need: website/user/share/team/member authorization reads,
  billing-adjacent website currency, usage audit, provider webhook cleanup, and
  the segment resolver used by `src/lib/request`. Every other Prisma repository
  now lives in its owning feature's `server/queries`, and the inherited
  analytics SQL engine lives in `src/features/analytics/server/queries/sql`.
  This keeps the dependency arrow pointing down while giving each domain its
  data access.
- `src/permissions` and `src/lib/workspace-auth.ts` — the one central
  authorization boundary. Never duplicate tenant checks in a feature.

This is the modular-monolith trade-off: domain behaviour and its data access are
owned by features, a small shared kernel stays shared, and the dependency arrow
never points from shared code back into product features.

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
| route-param-shaped `settings/websites/[websiteId]` | `src/features/websites/settings` |
| website analytics workbench (shell, overview, reports, sessions, events, replay, realtime, cohorts, compare, segments) | `src/features/analytics/workbench` |
| website analytics request handlers | `src/features/analytics/server/[websiteId]` |
| account settings UI (`/app/settings/account`, security, preferences) | `src/features/account/settings` |
| local-user admin (`/api/users`) | `src/features/account/server` |
| workspace settings UI (`/app/settings/workspace`) | `src/features/workspaces/settings` |
| website list settings UI (`/app/settings/websites`) | `src/features/websites/settings` |
| integration settings UI (`/app/settings/integrations`) | `src/features/payments/settings` |
| plan and usage settings UI (`/app/settings/billing`) | `src/features/billing` |
| collector cache, cross-domain linker, attribution query, dashboard overview, bot/client detection, analytics filters and chart helpers | `src/features/analytics/lib` |
| payment return detection | `src/features/payments/lib` |
| payment status classification (`REVENUE_PAYMENT_STATUSES`) | `src/features/payments/lib/payment-status.ts` |
| tracking identity derivation | `src/features/analytics/lib/tracking-identity.ts` |
| route contract tests | beside their handler under `src/features/<domain>/server/**` |
| analytics report handlers (`/api/reports/*`) | `src/features/analytics/server/reports` |
| realtime handler (`/api/realtime/[websiteId]`) | `src/features/analytics/server/realtime/[websiteId]` |
| auth return URL and transactional registration | `src/features/auth/lib` and `src/features/auth/server` |
| workspace invitations and member management | `src/features/workspaces/lib` |
| website API keys and domain normalization | `src/features/websites/lib` |
| legacy feature gate | `src/features/legacy/lib` |
| OSS version/update helpers | `src/features/system/lib` |
| analytics Prisma reports and the whole SQL engine | `src/features/analytics/server/queries` (`sql/` plus report, revenue, dashboard, historical, replay) |
| payment and payment-attribution repositories | `src/features/payments/server/queries` |
| portfolio MRR and website overview repositories | `src/features/account/server/queries` |
| website import repository | `src/features/websites/server/queries` |
| Stripe minor-unit formatting | `src/features/payments/lib/stripe-amount.ts` |
| revenue channel classification and overview metrics | `src/features/analytics/lib/dashboard-breakdown.ts` and `src/features/account/lib/website-overview.ts` |
| event-data flattening, payment-customer labels, and redaction | `src/features/analytics/lib/{data,paymentCustomer,redact}.ts` |
| random public-share slugs | `src/features/websites/lib/generate.ts` |
| public pixel/link collection handlers | `src/features/legacy/server/collect` |
| website shell resolution | `src/features/analytics/workbench/WebsiteLayoutRoute.tsx` |
| platform billing provider, webhook reducer, invoices, and billing UI | `src/features/billing` (`server/`, `components/`, `lib/`) |
| shared subscription lifecycle and ordering rules | `src/lib/billing-lifecycle.ts` |
| dead dashboard/website/cache stores and the unused refresh button | deleted |

Only primitives remain in `src/components`: `common` (links, panels, tables,
empty/error states), `charts`, `input` (date picker and menu primitives),
`svg`, `brand`, and generic hooks. `src/store` contains only `app.ts`, the
shared locale/timezone/date-range/user shell state.

The shared `src/lib` allowlist is enforced by the structure test. It keeps
cross-cutting infrastructure (auth sessions, CSRF, rate limits, Prisma,
crypto, email, plans/usage, branding, request/response) plus the contracts that
truly cross the shared boundary (`currency-exchange`, `reporting-currency`,
`share-sections`, `share-redaction`, and the frozen `board-types` because the
central entity lookup reads boards). Payment status classification and tracking
identity derivation are domain helpers and now live in `features/payments/lib`
and `features/analytics/lib`. Provider-specific request handling and UI still
live in `src/features/payments`.

The settings surface is now a shell plus domain-owned screens. `features/settings`
contains only `SettingsLayout`, `SettingsPageLayout`, and `SettingsHomePage`;
account, security, and preference screens live in `features/account/settings`,
workspace settings in `features/workspaces/settings`, website list settings in
`features/websites/settings`, integration settings in
`features/payments/settings`, and plan/usage in `features/billing`. The
structure test pins this so `settings` cannot regrow into a catch-all domain.

The workbench split is deliberate: `analytics` owns everything a customer does
to read their traffic and revenue, while `websites` owns the site itself
(creation, settings, API keys, members, sharing, imports). The route layout
mounts the analytics workbench shell, and the website settings route renders the
`websites` settings surface inside it. This keeps analytical screens and their
handlers together instead of burying them in the site-management domain.

The analytics SQL engine lives in `src/features/analytics/server/queries/sql`.
It is still the inherited engine described in `docs/TENANCY.md`; only its
location changed. `websites` imports it for imports, exports, and backups, which
is an allowed feature-to-feature dependency. The shared `src/lib/request.ts`
does not read SQL directly, and the tenant-scoped session cache now lives beside
the engine in `src/features/analytics/server/queries/session-cache.ts`.

`src/features/legacy` is intentionally tiny. Public share pages still render the
link and pixel detail screens, so their provider, panels, controls, and four
query hooks remain. Boards, list pages, edit forms, the board component
registry, and the old selectors had no route and were deleted; the legacy API
handlers remain only to return a consistent `legacy-feature-disabled` response.
`src/lib/app-structure.test.ts` pins this surface.

The portfolio MRR panel is served by `/api/me/websites/overview`. The Prisma
query (`src/features/account/server/queries/portfolioMrr.ts`) reads active
subscriptions in the authorized workspace and falls back to the earliest
attributed payment when the subscription has no visitor. Channel classification
and currency-safe grouping are pure functions in
`src/features/analytics/lib/dashboard-breakdown.ts` and
`src/features/account/lib/website-overview.ts`, unit tested beside their owners.

## Platform billing is a separate context

`src/features/billing` charges workspace owners for RevenueLens (context A). It
is deliberately independent of `src/features/payments`, which holds the
customer's own Stripe/Dodo/etc. revenue connections (context B).

- Billing credentials come from environment variables
  (`DODO_PAYMENTS_*`); analytics provider credentials are encrypted per website.
- The billing webhook lives at `/api/billing/webhook/dodo`; analytics webhooks
  live at `/api/payments/<provider>/[websiteId]/webhook`. The signing secrets
  are not interchangeable.
- Billing state is stored in `billing_customer`, `platform_subscription`,
  `billing_event`, `billing_invoice`, and `billing_subscription_change`, never
  in the analytics `payment`/`subscription` tables.
- `src/lib/entitlements.ts` reads `platform_subscription`; a checkout redirect
  never grants access. `src/lib/billing-lifecycle.ts` is the shared pure
  lifecycle/ordering contract used by billing and entitlements.

See `docs/PLATFORM_BILLING.md` for the provider flow and the live-test
checklist.

## Security boundary

The restructure is organizational only. Tenant isolation still runs through
`src/permissions/website.ts` and `src/lib/workspace-auth.ts`; handlers in
`features/websites/server` must resolve the website from the authorized
workspace before reading or writing. See `docs/TENANCY.md`.

`src/permissions` now contains only the central website/entity authorization
boundary (`website.ts`, `entity.ts`, the barrel). Report, local-user, and frozen
legacy permission checks live in `features/analytics/lib/report-permissions.ts`,
`features/account/lib/permissions.ts`, and `features/legacy/lib/permissions.ts`.
That keeps domain authorization next to the handlers that use it without
weakening the shared website/workspace check.

## Why this shape

- One deployable, one database, no new infrastructure.
- The analytics engine (`src/features/analytics/server/queries/sql`,
  `src/tracker`, `src/recorder`, attribution and payment integrations) is
  preserved.
- A route file is now readable in seconds, and domain logic can be tested
  without importing the router.
- Analytics widgets, share widgets, domain selectors, query hooks, and
  repositories live with the feature that owns their behaviour instead of in
  catch-all shared folders.
- Shared code cannot silently depend on a product feature; the structure test
  fails the build if that arrow reverses or if a domain repository drifts back
  into `src/queries`.
