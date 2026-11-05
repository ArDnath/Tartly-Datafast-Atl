# RevenueLens

Revenue-first product analytics for developers and indie SaaS founders. Connect
your site, connect your payments, and see which channels, campaigns, and pages
actually make money.

RevenueLens is a hosted, multi-tenant fork of the MIT-licensed
[Talivia](https://github.com/talivia-group/talivia) analytics engine. The
tracker, ingestion path, session replay, attribution, and payment-provider
integrations are retained; workspaces, billing, plans, and the product UI are
built for the hosted SaaS.

## What is included

- Web analytics: visitors, sessions, pageviews, events, realtime, funnels,
  goals, retention, UTM, breakdowns, and comparisons.
- Revenue attribution: first-touch and last-touch journeys, revenue by source,
  and diagnostics.
- Payment integrations: Stripe, Dodo Payments, Lemon Squeezy, Polar, Yolfi, and
  the Manual Payment API.
- Session replay with plan-based entitlements, separate metering, and input
  masking.
- Multi-tenant workspaces, roles, invitations, and tenant-isolated queries.

## Plans

Exactly two plans, no free tier:

| Plan | Monthly | Websites |
| --- | --- | --- |
| Starter | $7.99 | 1 |
| Pro | $14.99 | up to 20 |

Plan data lives in `src/lib/plans.ts`. Event, replay, member, and retention
allowances are defined there and in `docs/PRICING_ECONOMICS.md`.

## Local development

Requirements: Node.js 22 LTS or 24 LTS, pnpm 10+, and PostgreSQL 9.4+ (the
local Compose file uses PostgreSQL 17).

```bash
cp .env.example .env
openssl rand -hex 32
```

Put the generated value in `APP_SECRET`, then install, migrate, and start:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm dev
```

Open `http://localhost:3000` and create an account at `/signup`. There is no
default account and no default password.

Sessions are server-side and delivered through an HttpOnly, SameSite=Lax
cookie. Password changes and resets revoke every session.

Useful checks:

```bash
pnpm lint
pnpm test
pnpm build
```

Or start PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection used by the app. |
| `DATABASE_URL_UNPOOLED` | For Neon | Direct connection used by migrations. |
| `APP_SECRET` | Yes | 32+ random bytes; signs sessions and encrypts provider credentials. |
| `RESEND_API_KEY` | No | Live verification, reset, and invitation email. Without it, development writes to `.dev-emails/outbox.log`. |
| `PLATFORM_ADMIN_EMAILS` | No | Comma-separated allowlist for platform administration. |

See `docs/ENVIRONMENT.md` for Neon setup, pooled/direct strings, and
preview/production branching.

## First setup

1. Create a workspace and website.
2. Copy the tracking snippet into your site.
3. Confirm that a visit appears in the dashboard.
4. Connect a payment provider under **Website settings → Payments**.
5. Open **Revenue** to see attributed revenue.

Payment-provider webhook URLs are generated from the incoming request origin.
Behind a reverse proxy, forward the original `Host` and `X-Forwarded-Proto`
headers.

## Project layout

```text
src/app/          route files only (pages, layouts, thin route handlers)
src/features/     product modules by domain, each owning UI, hooks, lib,
                  server handlers, and server/queries data access
src/lib/          cross-cutting services shared by every domain
src/queries/      small shared repository kernel (authorization, request,
                  auth, billing contracts)
prisma/           schema and forward-only migrations
docs/             phase tracker, design system, tenancy, pricing, operations
```

## Documentation

- `docs/PHASES.md` — current phase and remaining work.
- `docs/UI_DESIGN_SYSTEM.md` — visual language and source layout.
- `docs/TENANCY.md` — workspace isolation rules.
- `docs/PRICING_ECONOMICS.md` — plans, costs, and margin model.
- `docs/ENVIRONMENT.md` — local, Neon, and production configuration.

## Licence and attribution

RevenueLens is distributed under the MIT License. The original Talivia
copyright notice is retained in `LICENSE`; dependency and asset notices are in
`THIRD_PARTY_NOTICES.md`. RevenueLens is not affiliated with or endorsed by
Talivia.
