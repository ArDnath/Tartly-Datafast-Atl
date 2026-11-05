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
  server/**/handler.ts       request handlers and domain server logic
src/components/              shared design-system primitives and widgets
src/lib/                     cross-cutting services (auth, db, email, plans,
                             brand, usage, crypto, request/response)
src/queries/                 shared data access (Prisma + analytics SQL)
src/permissions/             central tenant authorization
src/store/                   shared client state
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
- `src/components`, `src/lib`, `src/queries`, `src/permissions`, and `src/store`
  are shared. Features may import them; they must not import `src/features` or
  `src/app`.
- Cross-feature imports go through `@/features/<domain>` barrels or explicit
  paths. Do not reach into another feature with `../../`.

## Product domains

| Domain | Owns |
| --- | --- |
| `account` | `/api/me` profile, password, owned websites |
| `analytics` | ingestion (`send`, `record`, `batch`), heartbeat, realtime, report and metric endpoints |
| `app-shell` | signed-in shell, top nav, notices |
| `auth` | login, signup, verification, reset, logout |
| `legacy` | frozen boards, links, pixels and their APIs |
| `marketing` | landing and pricing |
| `onboarding` | onboarding canvas and website setup |
| `payments` | provider connections, manual payments, provider webhooks, provider clients/backfills, credential encryption |
| `portfolio` | `/app` all-websites home |
| `settings` | workspace, websites, billing/usage, account, preferences |
| `share` | public share shell and share APIs |
| `system` | health and OSS update endpoints |
| `websites` | website CRUD, workbench reports, sessions, events, replays, settings, imports/exports, API keys |
| `workspaces` | workspace CRUD, members, invitations, usage |

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

## Adding a feature

1. Create `src/features/<domain>/` with the screen or feature UI.
2. Put request logic in `src/features/<domain>/server/`.
3. Add a route page that parses params and renders the feature.
4. Add `src/app/api/**/route.ts` that re-exports the handler.
5. Add a test beside the handler (`src/app/api/**/route.test.ts` remains the
   route contract test) or beside the domain module.
6. Extend the domain lists and contract tests in `src/lib/app-structure.test.ts`
   if you add a new top-level domain.

## Shared client and data layers

Three layers are intentionally shared rather than copied into every feature:

- `src/components/hooks` — client state and React Query data hooks. Both
  feature screens and shared analytics widgets consume them; moving them under
  a feature would make shared components depend on a feature. Split a hook out
  only when the widgets that use it move with it.
- `src/queries` — the server data-access layer (Prisma repositories and the
  analytics SQL engine). Domain-specific repositories live in feature server
  modules; genuinely cross-domain repositories stay here.
- `src/permissions` and `src/lib/workspace-auth.ts` — the one central
  authorization boundary. Never duplicate tenant checks in a feature.

This is the modular-monolith trade-off: domain behaviour is owned by features,
shared infrastructure stays shared, and the dependency arrow never points from
shared code back into product features.

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
- Shared UI stays shared instead of being duplicated into each feature.
