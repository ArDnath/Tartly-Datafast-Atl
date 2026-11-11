# Tartly

Revenue-first product analytics for developers and indie SaaS founders. Connect
your site, connect your payments, and see which channels, campaigns, and pages
actually make money.

Tartly is a hosted, multi-tenant fork of the MIT-licensed
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

Two paid plans plus a 7-day free trial:

| Plan       | Monthly       | Events / month | Websites |
| ---------- | ------------- | -------------- | -------- |
| Free trial | $0 for 7 days | 2,000          | 1        |
| Starter    | $7.99         | 100,000        | 1        |
| Pro        | $14.99        | 1,000,000      | up to 50 |

Plan data lives in `src/lib/plans.ts`. The traffic slider raises events and
price together, from 10k to 2M Starter events (Pro scales to 10M). Event,
replay, member, and retention allowances are defined there and in
`docs/PRICING_ECONOMICS.md`. A new workspace gets **7 days and 2,000 events**
without a card; after the trial, billable ingestion pauses until a paid
subscription is active.

## Local development

Requirements: Node.js 22 LTS or 24 LTS, pnpm 10+, and PostgreSQL client/server
binaries. Docker is optional.

```bash
cp .env.example .env
openssl rand -hex 32   # put the value in APP_SECRET
pnpm install
```

### Without Docker (recommended on low-RAM machines)

`pnpm dev:local` starts a user-owned PostgreSQL cluster in `.local/pgdata` on
the port from `DATABASE_URL`, applies migrations, generates the Prisma client,
and starts Next.js:

```bash
pnpm dev:local
```

Open `http://localhost:3000` and create an account at `/signup`. There is no
default account and no default password. Verification email is written to
`.dev-emails/outbox.log` when `RESEND_API_KEY` is empty.

Stop the database when you are done:

```bash
pnpm db:local stop
pnpm db:local status
pnpm db:local reset   # destructive: deletes .local/pgdata
```

### With Neon PostgreSQL

Set both Neon connection strings in `.env`, then use the same command:

```env
DATABASE_URL=postgresql://...-pooler.../db?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://..../db?sslmode=require
```

```bash
pnpm dev:local
```

The helper detects the remote host and skips the local cluster. `pnpm dev`
runs `prisma migrate deploy` in its `predev` step.

### Verify analytics

With the app running:

```bash
pnpm smoke:local   # register → website → event → stats
```

Full guide, RAM notes, Neon switching, and troubleshooting:
`docs/LOCAL_DEVELOPMENT.md`.

Useful checks:

```bash
pnpm gate   # format, lint, typecheck, full tests, production build
pnpm lint
pnpm test
pnpm build
```

Docker remains available if you prefer it:

```bash
docker compose up -d postgres
```

## Operations

- `docs/LAUNCH_CHECKLIST.md` — what is verified and what needs a human.
- `docs/RUNBOOK.md` — deploy, rollback, outages, abuse, webhook failures.
- `docs/BACKUP_AND_RECOVERY.md` — Neon restore rehearsal and verification.
- `docs/SECRETS_ROTATION.md` — `APP_SECRET` and provider credential rotation.
- `docs/ENGINEERING_STANDARDS.md` — the mandatory per-feature gate.
- `docs/PHASES.md` — current status, proof, and remaining external blockers.

## Configuration

| Variable                | Required | Purpose                                                                                                     |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | Pooled PostgreSQL connection used by the app.                                                               |
| `DATABASE_URL_UNPOOLED` | For Neon | Direct connection used by migrations.                                                                       |
| `APP_SECRET`            | Yes      | 32+ random bytes; signs sessions and encrypts provider credentials.                                         |
| `RESEND_API_KEY`        | No       | Live verification, reset, and invitation email. Without it, development writes to `.dev-emails/outbox.log`. |
| `PLATFORM_ADMIN_EMAILS` | No       | Comma-separated allowlist for platform administration.                                                      |

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

Tartly is distributed under the MIT License. The original Talivia
copyright notice is retained in `LICENSE`; dependency and asset notices are in
`THIRD_PARTY_NOTICES.md`. Tartly is not affiliated with or endorsed by
Talivia.
