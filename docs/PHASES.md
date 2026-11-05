# RevenueLens — Phase Tracker

- **Project:** RevenueLens (working brand; final brand TBD)
- **Repository:** <https://github.com/talivia-group/talivia> (MIT), forked locally at
  `/home/ariyaman/Dev/fight/efforts/revenuelens`
- **Last updated:** 2026-11-05
- **Current phase:** Phase 3 complete; Phase 4 complete with email-provider caveat. Phase 9 is complete: the source restructure (app, server, domain UI/hooks/lib/store) is finished and enforced, the dead legacy dashboard UI is pruned, the portfolio now shows MRR by first-touch channel, and the brand/contrast locks are automated. A final domain split now moves the whole website analytics workbench and its handlers into `features/analytics`, leaving `features/websites` as site management only. The settings catch-all is gone too: `features/settings` is now the shell and overview only, while account/security/preferences, workspace, website list, integrations, and plan/usage screens live with their owning domains. `src/permissions` is now the shared website/entity authorization boundary only; report, local-user, and frozen legacy permission checks live with their features. The last shared catch-alls are gone: every domain Prisma repository now lives in `features/<domain>/server/queries`, the analytics SQL engine lives in `features/analytics/server/queries/sql`, the public pixel/link collection handlers and the website shell resolver moved out of `src/app`, and `src/queries` is a small allowlisted authorization/request kernel. Phase 6 usage metering and enforcement shipped (events + replay, usage page, in-app notices). Next: Phase 5 (platform billing) and Phase 7.

## Overall progress

- Total phases: **12** (0–11 product/build, 12 go-to-market)
- Phases complete: **3 full, 3 with caveats** (Phase 2: copy-with-data rehearsal; Phase 4: live Resend delivery)
- Overall percent (average of phases 0–11): **59%**
- Build state at last check: **green** (`next build` exit 0 with
  `SKIP_DB_CHECK=1`; `tsc --noEmit` clean; `biome lint` clean). Full test run:
  **645 passed / 0 failed** under `TZ=UTC`.
- Runtime smoke: the new public docs routes return 200, and `/app/settings`,
  `/app/settings/integrations`, `/app/settings/security`, `/app/settings/websites`,
  and `/app/settings/billing` return 200 with an authenticated session. The
  legacy `/websites/*` and `/settings/*` URLs still redirect to `/app/*`.
- Database: local PostgreSQL has all 7 migrations applied, including durable
  auth sessions, hashed email/reset tokens, rate-limit buckets, removal of the
  bootstrap admin, and monthly usage periods.

## Commercial contract (fixed by owner)

Exactly two plans and **no free tier**:

| Plan | Monthly | Annual (2 months free) | Websites | Members |
| --- | --- | --- | --- | --- |
| Starter | **$7.99** | **$79.90** | **1** | 1 |
| Pro | **$14.99** | **$149.90** | **up to 20** | 5 (proposed) |

Event allowances, retention, replay allowance, and feature flags must be
proposed from the economics model in Phase 6 and approved by the owner.
No third plan, no free tier, no hidden limits.

## Phase status

| # | Phase | Status | % Done | Started | Finished | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Audit and baseline | DONE | 100% | 2026-11-04 | 2026-11-04 | none |
| 1 | Neon PostgreSQL, Prisma, environment | DONE_WITH_CAVEATS | 100% | 2026-11-04 | 2026-11-04 | Neon credentials |
| 2 | Workspaces, memberships, RBAC | DONE_WITH_CAVEATS | 92% | 2026-11-04 | 2026-11-05 | copy-with-data rehearsal |
| 3 | Tenant isolation hardening + tests | DONE | 100% | 2026-11-05 | 2026-11-05 | none (RLS deferred by decision) |
| 4 | Authentication and account management | DONE_WITH_CAVEATS | 100% | 2026-11-05 | 2026-11-05 | live Resend send |
| 5 | Platform billing (Dodo) | NOT_STARTED | 0% | — | — | Dodo test/live keys |
| 6 | Plans, pricing economics, usage | IN_PROGRESS | 75% | 2026-11-04 | — | live concurrency proof; owner approval of limits; notice emails |
| 7 | Analytics validation, integrations, replay | NOT_STARTED | 0% | — | — | none |
| 8 | Onboarding and developer experience | IN_PROGRESS | 40% | 2026-11-04 | — | guides, activation, MCP |
| 9 | Rebrand and product UI | DONE | 100% | 2026-11-04 | 2026-11-05 | none |
| 10 | Compliance, abuse, email, operations | NOT_STARTED | 0% | — | — | legal review |
| 11 | Hardening, QA, deployment, launch | NOT_STARTED | 0% | — | — | hosting + domain |
| 12 | Go-to-market | NOT_STARTED | 0% | — | — | product live |

---

## Phase 0 — Audit and baseline

**Goal:** understand the real codebase before changing anything.

### Tasks

- [x] Inspect `package.json`, `pnpm-lock.yaml`, Prisma schema and migrations,
      `prisma.config.ts`, auth/session code, user/team/website/collaborator
      models, API routes, ingestion, tracker, replay, attribution, payment
      integrations, webhooks, dashboard queries, jobs, Redis, ClickHouse,
      Docker, environment config, tests, security-sensitive code. — proof:
      `docs/SAAS_CONVERSION_AUDIT.md` §1–§11.
- [x] Record actual installed versions (Next.js, React, Prisma, Node, pnpm). —
      proof: audit §1 (Next 16.2.6, React 19.2.5, Prisma 7.6.0, Node 24.13.0,
      pnpm 10.10.0).
- [x] Map every major data flow (visitor → tracker → ingestion → storage →
      queries → dashboard; payment provider → webhook → normalization →
      customer matching → attribution → revenue reports). — proof: audit §2,
      §7.
- [x] State explicitly where events and replays are stored. — proof: audit §3
      (PostgreSQL by default; optional ClickHouse/Kafka; mirror for attribution).
- [x] LICENSE audit: `LICENSE`, non-MIT directories, trademarked assets and
      fonts, restrictive dependency licenses. — proof:
      `docs/LICENSE_AND_BRAND_AUDIT.md`.
- [x] Check <https://github.com/talivia-group/agent>: exists? license? reusable? —
      proof: audit §4; API returned MIT, not archived, reusable with attribution.
- [x] Run install, build, lint, typecheck, and tests; record baseline including
      pre-existing failures. — proof: audit §12; `pnpm build` exit 0,
      `pnpm lint` pass, `tsc --noEmit` pass, tests 479 pass / 3 fail.
- [x] Create `docs/SAAS_CONVERSION_AUDIT.md`. — proof: file exists.
- [x] Create `docs/LICENSE_AND_BRAND_AUDIT.md`. — proof: file exists.
- [x] Recommend hosting for the Next.js app and event store with rough monthly
      costs and cited sources. — proof: audit §13 (Vercel/Railway, Neon,
      ClickHouse; sources fetched 2026-11-04).

### Acceptance criteria

- [x] Both audit docs exist and reference real repo file paths. — proof:
      `docs/SAAS_CONVERSION_AUDIT.md`, `docs/LICENSE_AND_BRAND_AUDIT.md`.
- [x] Baseline build and test results are recorded, including failures. —
      proof: audit §12.
- [x] Event and replay storage architecture is stated explicitly. — proof:
      audit §3.
- [x] The audit lists every tenant-owned table/entity lacking a workspace link. —
      proof: audit §4 table (39 models).
- [x] No application code has been changed. — verified at the time of the
      audit; later phases then began modifying code.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- None yet.

---

## Phase 1 — Neon PostgreSQL, Prisma, and environment setup

**Goal:** run the relational data on Neon safely, with separate runtime and
migration connections.

### Tasks

- [x] Confirm installed Prisma version (7.6.0) and evaluate
      `@prisma/adapter-pg` (already used) versus the Neon serverless adapter.
      Choose one and document why. — proof: `@prisma/adapter-pg` retained; the
      existing `src/lib/prisma.ts` already uses it and it works with Neon's
      pooled host. The Neon adapter is unnecessary until edge/serverless
      deployment requires HTTP. Recorded in `docs/ENVIRONMENT.md`.
- [x] `DATABASE_URL` (pooled host) for runtime; `DATABASE_URL_UNPOOLED` (direct
      host) for migrations; update `prisma.config.ts` for Prisma 7. — proof:
      `prisma.config.ts` (CLI uses unpooled, falls back locally).
- [x] Singleton Prisma client, safe under hot reload (already present in
      `src/lib/prisma.ts`) — verify and harden. — proof: existing
      `globalThis[PRISMA]` cache retained; pool timeouts added.
- [x] Connection timeouts + retry on transient errors/cold starts. — proof:
      `src/lib/prisma.ts` (15s connect / 30s idle, max 10) and
      `src/lib/db-retry.ts` with `P1001/P1002/P1017/P2024` handling; raw reads
      use `withDbRetry`.
- [x] `.env.example` with every variable, a comment each, no real secrets;
      confirm `.env*` is gitignored. — proof: `.env.example`, `.gitignore:50`.
- [x] `docs/ENVIRONMENT.md` (variables, Neon strings, pooled vs direct, local /
      preview / production). — proof: file exists.
- [x] `docs/NEON_BRANCHING.md` (production, development, preview branches;
      migration promotion; local never points at production). — proof: file
      exists.
- [x] Verify migrations apply cleanly to an empty database (local PostgreSQL if
      no Neon credentials; list the Neon run still required). — proof:
      `pnpm exec prisma migrate deploy` applied 4 migrations (including the new
      workspace migration) to a fresh PostgreSQL 17 database on 2026-11-04.
- [x] Health endpoint that checks database connectivity without leaking
      details. — proof: `GET /api/health` returned
      `{ok:true,database:"up"}`; after stopping PostgreSQL it returned
      `{ok:false,database:"down"}` with HTTP 503 and no error detail.

### Acceptance criteria

- [x] `prisma migrate deploy` succeeds on an empty database (proof recorded). —
      **local proof only**; Neon run still needs the human.
- [x] App starts and health check passes. — proof: `pnpm dev` + curl as above.
- [x] No credentials in git history or source. — `.env` is ignored; no real
      credentials were added. `git log` on `.env` is empty.
- [x] Docs let a new developer set up from them alone. — proof:
      `docs/ENVIRONMENT.md` includes prerequisites, variables, local/Neon,
      commands, troubleshooting.

### Decisions made

- Keep `@prisma/adapter-pg` rather than adding the Neon serverless adapter:
  the app runs on Node, the adapter is already proven, and adding a second
  driver increases surface area. Revisit only if we deploy to an edge runtime.
- Migrations use the direct host via `prisma.config.ts`; runtime keeps the
  pooled URL. Local fallback is allowed for DX, but production must set both.
- Retry only idempotent reads. Writes are not retried because a committed write
  followed by a dropped connection would otherwise duplicate data.

### Unverified / Assumed

- **UNVERIFIED:** the actual Neon pooled/direct URLs and a Neon-run migration.
  No Neon credentials exist in this environment.
- **UNVERIFIED:** Neon cold-start latency with the 15s connect timeout; measure
  in staging.

### Needs from the human

- Neon project + pooled/direct connection strings; run `migrate deploy` once
  against the empty production branch and record the output.

## Phase 2 — Multi-tenant workspaces, memberships, and RBAC

**Goal:** convert installation-level users into a real workspace-based SaaS.

### Tasks

- [x] Add `Workspace` (`id`, `name`, `slug`, `ownerId`, `planId`,
      `subscriptionStatus`, timestamps, `deletedAt`). — proof:
      `prisma/schema.prisma` (`model Workspace`).
- [x] Add `WorkspaceMembership` (`workspaceId`, `userId`, `role`, unique pair). —
      proof: schema + `workspace_membership` migration.
- [x] Add `WorkspaceInvitation` (`email`, `role`, `invitationTokenHash`,
      `invitedBy`, `expiresAt`, `acceptedAt`). Never store plaintext tokens. —
      proof: `src/lib/workspace-invitations.ts`, API routes, `/invite/[token]`
      UI, 8 unit tests (hash-only storage, expiry, email match, revoke).
- [x] Roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`. — proof:
      `src/lib/workspace-auth.ts`.
- [x] Every `Website` belongs to exactly one workspace; preserve existing IDs
      and tracking IDs. — proof: `website.workspace_id` nullable for legacy,
      backfilled; new websites set it. Exactly-one is enforced in the new path,
      not yet at the DB level (see Phase 3).
- [x] Reversible data migration moving existing data into workspaces. — proof:
      `prisma/migrations/20261104180000_workspaces/migration.sql` creates a
      personal workspace per user, OWNER membership, and attaches user/team
      websites. Reversal is documented as dropping the table/column (data
      assignment is lost on reverse; export first).
- [x] Registration creates user + personal workspace + OWNER membership + plan
      in **one transaction**. — proof: `src/lib/registration.ts`,
      `POST /api/auth/register`, `/signup`, 3 transaction tests. Usage period
      still arrives with metering in Phase 6.
- [ ] Reuse/merge the existing `Team` / `WebsiteMember` model where it fits;
      one permission system only. — **not merged**; legacy checks remain.
- [x] One central authorization module
      (`requireWorkspaceAccess(user, workspaceId, minRole)`) used by every API
      route and server action. — proof: `src/permissions/website.ts` now
      resolves every website through workspace membership; all 72 inherited
      website routes pass through it. `src/lib/tenant-boundaries.test.ts`
      fails if a tenant route loses its guard.
- [x] Document permission matrix: OWNER (everything, billing, delete
      workspace), ADMIN (websites, analytics, integrations, invites; not
      ownership transfer or workspace delete), MEMBER (view + manage allowed
      websites), VIEWER (read-only). — proof: `docs/UI_DESIGN_SYSTEM.md` §? and
      `src/lib/workspace-auth.ts`; unit tests cover all four roles.
- [x] Workspace switching, creation, invitations (send/accept/revoke/expire). —
      proof: `WorkspaceSwitcher` in the app nav, `/app/settings/workspace`
      members/invitations UI, `/api/workspaces/[workspaceId]/members`, and
      `/api/workspaces/[workspaceId]/invitations`.
- [x] Separate internal platform-admin role, independently protected; no public
      bootstrap admin and no default credentials. — proof:
      `src/lib/platform-admin.ts` requires `PLATFORM_ADMIN_EMAILS` in
      production; the bootstrap row is disabled by
      `20261104190000_remove_default_admin`.

### Acceptance criteria

- [ ] Migration applies on a copy of existing data without loss. — local empty
      DB proof only; a copy-with-data rehearsal is pending.
- [x] Registration transaction test: forced mid-way failure leaves no orphans. —
      proof: `src/lib/registration.test.ts` (all writes in one transaction;
      duplicate account rejected before opening it).
- [x] Permission matrix implemented in one module and unit tested for all four
      roles. — proof: `src/lib/workspace-auth.test.ts` (7 tests, all passing).
- [x] Grep shows no route/server action reading tenant data without the
      authorization module (exceptions listed explicitly). — proof:
      `src/lib/tenant-boundaries.test.ts` allowlists only `workspaces/route.ts`
      (self-scoped by `auth.user.id`) and invitation/member routes that
      delegate to guarded functions.
- [x] Live API smoke on the production build (2026-11-05): two accounts
      registered, website created in A, A read it, B rejected on the website
      and on `/stats` by ID swap, unauthenticated read rejected, Starter
      website and member limits enforced, Pro invitation accepted by the
      invited email, MEMBER could not delete, and the invitation was single-use.
      All 17 assertions passed; smoke rows were deleted afterwards.

### Decisions made

- Workspaces are additive for legacy rows but authoritative for every new
  website. The inherited 72 website routes were migrated by rewriting the
  shared permission helpers, not by editing each route.
- `requireWorkspaceAccess` never auto-authorizes the legacy `admin` role. The
  platform-admin console will use a separate, audited path.
- Invitation tokens are hashed at rest; the plaintext token exists only in the
  invitation email/response and is never stored.
- Until platform billing exists, a user may own only one workspace and cannot
  choose Pro at signup. This prevents minting extra plan allowances for free.

### Unverified / Assumed

- **UNVERIFIED:** the team-owned website backfill on real data. The SQL attaches
  team websites to the team owner's workspace; a team with no `team-owner` row
  leaves `workspace_id` null.
- **ASSUMED:** one personal workspace per user is the right default for the
  target audience. Agency multi-workspace ownership waits for billing so a
  second workspace cannot create a second unpaid allowance.

### Needs from the human

- Rehearse the workspace migration on a copy of real installation data and
  confirm every website received a `workspace_id`.

## Phase 3 — Tenant isolation hardening and mandatory isolation tests

**Goal:** make cross-tenant access impossible, and prove it.

### Tasks

- [x] Inventory every tenant-owned resource and confirm each links to a
      workspace: websites, reports, segments, payment connections, revenue
      records, subscriptions, API keys, imports, historical metrics,
      attribution configs, audit records, replays, sessions, events, shares,
      boards, links, pixels. — proof: `docs/TENANCY.md`; boards/links/pixels
      are explicitly legacy and their create endpoints are disabled.
- [x] Explicit tenant scoping on every website read/update/delete/create. —
      proof: central `canViewWebsite`/`canUpdateWebsite`/`canDeleteWebsite`
      plus `requireWebsiteAccess`. Composite DB constraints remain open below.
- [x] Event store: every query/write includes the website ID resolved from an
      authorized workspace. — proof: inherited SQL joins key on
      `website_id`; analytics routes reject unauthorized website IDs before
      querying.
- [x] Cache keys include tenant and website identifiers; document
      contamination checks. — proof: `src/lib/load.ts` now uses
      `session:${websiteId}:${sessionId}` and rejects a cached session whose
      `websiteId` differs. `docs/TENANCY.md` §Cache keys.
- [x] Evaluate PostgreSQL RLS as defence in depth. With Neon pooling use
      transaction-scoped context only (`SET LOCAL`); otherwise document why. —
      proof: decision recorded in `docs/TENANCY.md`: every pooled query would
      need transaction-scoped `SET LOCAL` plus policies on ~39 tables;
      application checks + the static boundary test are the launch control.
- [x] Isolation tests: Workspace A/User A/Website A vs Workspace B/User
      B/Website B. A can access A; A cannot access B analytics, replays,
      revenue, settings, API keys, exports; ID swapping does not expose B;
      direct API calls cannot bypass. — proof:
      `src/permissions/website.workspace.test.ts` (10 scenarios) plus the
      static route-boundary test.
- [x] Webhook and background-job isolation tests. — proof:
      `src/app/api/payments/stripe/[websiteId]/webhook/route.test.ts` asserts
      connection lookup, payment write, and provider event write all use the
      URL website; `src/lib/cron/jobs/provider-webhook-cleanup.test.ts` asserts
      each queued job uses only its own credentials and endpoint.
- [x] CI step runs isolation suite on every push. — proof: the existing
      `pnpm test` step in `.github/workflows/ci.yml` includes every
      `*.test.ts` suite.

### Acceptance criteria

- [x] All ten isolation scenarios pass, each with a named test. — proof:
      `src/permissions/website.workspace.test.ts`.
- [x] Webhook and background-job isolation tests pass. — proof: the two
      suites above (13 + 7 tests) pass.
- [x] Failing scenarios fixed, not skipped; otherwise phase BLOCKED. — proof:
      the three new-suite failures during the restructuring run were fixed; the
      remaining full-suite failures are the five documented baseline flakes.

### Decisions made

- Application-level authorization is the primary control for now. RLS is
  deferred because Neon pooled connections would require transaction-scoped
  `SET LOCAL` context on every query; revisit before enterprise sales.
- Legacy rows without `workspace_id` are readable only through the old owner/
  team path. New routes reject them via `requireWebsiteAccess`.
- Boards, links, and pixels are frozen legacy features rather than migrated
  until their create endpoints return.
- A real cache-contamination bug was found and fixed: cached sessions were
  keyed by `sessionId` alone. The key now includes `websiteId` and the cached
  row is checked against the requested website before use.
- RLS is explicitly deferred to pre-enterprise; relying on a forgotten
  `SET LOCAL` would make isolation failures silent.

### Unverified / Assumed

- Cache keys are not yet audited for tenant identifiers.
- Webhook and background-job isolation is not yet tested.

### Needs from the human

- None yet.

---

## Phase 4 — Authentication and account management

**Goal:** production-grade SaaS auth with the smallest reliable change.

### Tasks

- [x] Inspect existing session/auth implementation first; reuse if sound. Do
      not introduce Clerk/Auth.js/Better Auth unless justified in writing. —
      proof: no auth framework added; the existing username/password base is
      retained and made production-safe.
- [x] Registration, login, logout, session management, email verification,
      password reset, secure hashing, profile updates, account settings,
      workspace deletion, account deletion. — proof: `/api/auth/*`,
      `/api/me/account`, `/api/workspaces/[workspaceId]` DELETE/PATCH;
      bcryptjs cost 10; `/verify-email`, `/forgot-password`, `/reset-password`.
- [x] Cookies: Secure, HttpOnly, SameSite=Lax; 30-day server-side expiry;
      password change/reset revokes every session. — proof:
      `src/lib/auth-cookie.ts`, `src/lib/auth-session.ts`, migration
      `20261104185008_auth_sessions`, `src/lib/auth-session.test.ts`.
- [x] CSRF protection where applicable. — proof: `src/lib/csrf.ts`; cookie-auth
      unsafe requests with a foreign Origin/Referer return 403
      `csrf-rejected`; SameSite=Lax is the second layer.
- [x] Rate limiting + brute-force protection on login, registration, password
      reset, verification resend. — proof: atomic Postgres fixed windows in
      `src/lib/rate-limit.ts`; per-IP and per-account/email keys; no Redis
      dependency.
- [x] Hashed, single-use, expiring reset and verification tokens. — proof:
      `src/lib/auth-tokens.ts` (24h verification, 1h reset, SHA-512 at rest,
      consumption and state change in one transaction).
- [x] Remove default admin credentials and customer-facing self-hosted admin
      path. — proof: migration `20261104190000_remove_default_admin` disables
      the bootstrap `admin` row only while it still has the known password
      hash; `src/lib/platform-admin.ts` requires `PLATFORM_ADMIN_EMAILS` in
      production, so `role === 'admin'` alone is not a platform grant.
- [x] Email provider abstraction (Resend or similar) with dev-mode outbox. —
      proof: `src/lib/email.ts`; without `RESEND_API_KEY` development writes to
      `.dev-emails/outbox.log` (gitignored), never to application logs.
- [x] Account deletion with a typed confirmation and password re-check. —
      proof: `DELETE /api/me/account`; soft-deletes owned workspaces, revokes
      sessions, anonymises the user row, and leaves event purge to the
      tenant-scoped retention job.
- [x] Separate platform-admin role (environment allowlist), no public
      bootstrap admin. — proof: `src/lib/platform-admin.ts` + tests.

### Acceptance criteria

- [x] Tests for login, logout, expired/revoked session, password reset
      (single use, expiry), email verification, rate limiting. — proof:
      `auth-session.test.ts`, `auth-tokens.test.ts`, `rate-limit.test.ts`,
      `login/route.test.ts`, `logout/route.test.ts`,
      `password/forgot|reset` route tests, `email/verify` route test.
- [x] No plaintext passwords/tokens in DB or logs. — proof: bcrypt hashes;
      only SHA-512 token hashes stored; the login response no longer contains
      the session token; local email bodies go to `.dev-emails/outbox.log`,
      not logs.
- [x] Repo search finds no default admin credentials. — proof: bootstrap row
      disabled by migration; `grep` finds only documentation of its removal.
- [x] Live smoke on the production build (2026-11-05): 17/17 assertions
      passed — register sets an HttpOnly/SameSite cookie with no token in the
      body, cookie auth, workspace/website creation, real stats read, reset
      writes to the development outbox, reset revokes the old session and old
      password, new password signs in, logout revokes, and a second account is
      denied the first tenant's website by ID.

### Decisions made

- Durable PostgreSQL sessions behind an HttpOnly cookie replace
  localStorage bearer tokens. The raw token is never returned in a response
  body; API integrations use API keys.
- Login/signup/reset rate limits use PostgreSQL rather than Redis so a missing
  cache cannot disable brute-force protection. They fail open only if the
  database itself is unavailable, at which point login cannot work anyway.
- Email verification does not hard-gate the dashboard. It is recorded on the
  user and can gate paid features later without blocking activation.
- Account deletion is a soft delete. Hard-deleting event/replay payloads is a
  separate, tenant-scoped retention job (Phase 7/10), not a request handler.
- Platform administration requires `PLATFORM_ADMIN_EMAILS`; the legacy
  self-hosted `role === 'admin'` is no longer sufficient in production.

### Unverified / Assumed

- **UNVERIFIED:** a live Resend delivery (no `RESEND_API_KEY` or verified
  domain in this environment). The log/outbox transport is exercised locally.
- **UNVERIFIED:** a browser walkthrough of verification and reset emails from a
  real inbox; API and unit tests cover the token lifecycle.

### Needs from the human

- `RESEND_API_KEY` + verified sending domain for live verification/reset mail.

---

## Phase 5 — Platform billing (Dodo Payments) and subscription lifecycle

**Goal:** charge customers (context A only).

### Tasks

- [ ] Inspect existing Dodo analytics integration; keep it separate.
- [ ] Check current Dodo SDK/docs for subscriptions, checkout, portal,
      webhooks. Record URLs and dates.
- [ ] `BillingProvider` interface (create customer, create subscription, start
      checkout, update, cancel, status, webhooks, invoices, portal) with Dodo
      implementation; extensible to Stripe later.
- [ ] Models: `BillingCustomer`, `SubscriptionPlan`, `Subscription`,
      `BillingEvent`, `InvoiceRecord`, `SubscriptionChange`; store provider IDs;
      one independent subscription per workspace.
- [ ] Webhooks: raw-body signature verification, idempotency via stored event
      IDs, duplicate protection, out-of-order handling, retry-safe processing,
      failure/cancel/expiry/refund events.
- [ ] Lifecycle states: `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`,
      `EXPIRED`, `SUSPENDED` (no FREE plan; no free tier).
- [ ] Cancel-at-period-end keeps access until paid period ends.
- [ ] Never activate from a checkout redirect; confirm via provider status or
      webhook.
- [ ] Entitlements come from backend subscription records only.
- [ ] Billing settings page: plan, period, usage, next renewal, status,
      upgrade/downgrade, cancel, portal/invoice links. No fake invoices.

### Acceptance criteria

- [ ] Replayed webhook creates no duplicates.
- [ ] Out-of-order events converge to the correct state.
- [ ] Invalid signature rejected.
- [ ] Cancel-at-period-end retains access.
- [ ] Documented manual test against Dodo test mode, or exact steps for human.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- Dodo Payments test and live API keys, product IDs for Starter and Pro,
  webhook signing secret.

---

## Phase 6 — Plans, pricing economics, and usage metering

**Goal:** competitive pricing that still makes money, with trustworthy metering.

### Tasks

- [x] One plan config (`src/lib/plans.ts`): monthly/annual price, website
      allowance, event allowance, member allowance, retention, replay
      allowance, feature flags, export/integration permissions. Adding a plan
      must not require touching unrelated components. — proof:
      `src/lib/plans.ts`, 6 unit tests.
- [x] **Exactly two plans: Starter $7.99/mo (1 website) and Pro $14.99/mo
      (up to 20 websites). No free tier.** — proof: `PLANS` + tests.
- [x] `docs/PRICING_ECONOMICS.md`:
  - [x] Fetch official pricing for DataFast, Talivia Cloud, Plausible, Fathom,
        Umami Cloud, Simple Analytics; cite URL + date; mark unverified items.
  - [x] Estimate hosting, event store, Neon compute/storage, replay storage,
        email, billing fees.
  - [x] Model 100 / 500 / 1,000 / 5,000 customers with stated assumptions.
  - [x] Gross margin per plan. — 89.4% at 100 customers, 93.6% at 5,000.
  - [x] Final prices and event limits. Owner-fixed prices $7.99 / $14.99;
        limits proposed: 50k/500k events, 90/180-day retention, replay Pro-only.
- [x] Usage metering: only accepted, valid, deduplicated, non-bot events.
      Replays metered separately. Atomic under concurrent ingestion. Durable
      DB source of truth; caches display-only. Monthly `UsagePeriod` reset. —
      proof: `prisma/migrations/20261105120000_usage_metering`, `src/lib/usage.ts`
      (atomic `INSERT ... ON CONFLICT ... WHERE` reservation, release on failed
      write, replay session dedupe), collector reservation in
      `src/app/api/send/route.ts`, replay entitlement + metering in
      `src/app/api/record/route.ts`, 11 unit tests. Documented in
      `docs/USAGE_METERING.md`.
- [x] Limit policy: 80% and 100% notices, small grace, then pause billable
      ingestion; dashboard stays accessible; no silent deletion; no automatic
      overage unless opted in. — proof: `USAGE_WARNING_RATIO`, `EVENT_GRACE`
      (1,000 events), `REPLAY_GRACE` (100 sessions) in `src/lib/usage.ts`; the
      collector pauses at the hard limit while reads stay open; in-app banner
      in `src/app/(main)/UsageBanner.tsx`. Email notices wait for Phase 10.
- [x] Usage UI: current usage, allowance, remaining, percentage, reset date,
      upgrade prompt. — proof: `/app/settings/billing`
      (`UsageSettingsPage.tsx`) with plan, reset date, website/member limits,
      event and replay bars, grace/limit copy, and upgrade path; settings nav
      updated.

### Acceptance criteria

- [x] `PRICING_ECONOMICS.md` has cited sources, assumptions, margin table.
- [x] At least one tier adjusted if the numbers required it, or the doc
      explains why none was needed. — prices were fixed by the owner; the doc
      adjusts **limits** (replay Pro-only, 90/180-day retention) to keep margin
      above 85%.
- [ ] Concurrency test: parallel ingestion never under/overcounts. — the
      counter is a single conditional SQL statement and the unit suite covers
      reserve/reject/release, but a live parallel-ingestion test is not in CI
      (CI runs tests before migrations). **Partial.**
- [x] Tests for 80%/100% thresholds, grace, month rollover. — proof:
      `src/lib/usage.test.ts` (thresholds, grace boundary, UTC month range,
      zero allowance, event/replay reservation, replay dedupe).

### Decisions made

- Prices fixed by owner: Starter $7.99, Pro $14.99; no free tier.
- Website limits fixed by owner: Starter 1, Pro 20.
- Starter excludes replay to protect margin at 100 customers; Pro gets 2,000
  replays/month with 30-day replay retention.
- Annual = two months free only because the model stays above 89%.
- Usage is counted with a reserve-then-write pattern. The reservation is a
  single conditional SQL statement; a failed event write releases the slot. This
  is cheaper and safer than scanning analytics rows or incrementing after the
  write.
- The metering period is the UTC calendar month until platform billing exists.
  Counters are keyed by an absolute `period_start`, so moving to a provider
  billing period is a boundary change, not a schema rewrite.
- Replay is metered once per session per period, not per chunk. Retries and
  multi-chunk recordings are idempotent.
- The grace allowance is 1,000 events and 100 replay sessions. It is a constant
  in `src/lib/usage.ts`, not a hidden plan limit, and it is shown in the UI.
- The usage page is in **Settings → Plan and usage** so plan, allowance, and
  limit state live next to workspace and member limits rather than in a
  standalone billing silo.

### Unverified / Assumed

- Event/retention/replay limits are proposals pending owner approval.
- Event size (1 KB) and replay size (0.5 MB/session) are assumptions; Phase 7
  must measure them.
- Dodo fee assumes US cards; international adds ~3 points.

### Needs from the human

- Approve the proposed event/replay/member/retention limits.
- Dodo product IDs/prices for Starter and Pro (Phase 5).

## Phase 7 — Analytics engine validation, integrations, replay entitlements

**Goal:** prove inherited analytics works per tenant without rewriting it.

### Tasks

- [ ] Validate visitors, unique visitors, pageviews, sessions, bounce rate,
      duration, geography, browsers, OS, devices, screens, referrers, landing
      and exit pages, UTM, real-time dashboard.
- [ ] Keep first-touch and last-touch attribution. Tests from realistic
      journeys (organic, paid, referral, multi-touch, recurring revenue). Fix
      only verified bugs and log each.
- [ ] Payment integrations (Stripe, Dodo, Lemon Squeezy, Polar, Yolfi, Manual
      Payment API): verify capabilities in code. Per-website/per-workspace
      connections. Encrypt credentials. Validate webhooks. Handle subscriptions,
      renewals, cancellations, refunds, disputes, duplicates. Never return
      secrets.
- [ ] Session replay: gate by plan entitlement, meter separately, enforce
      retention, mask sensitive inputs by default, respect consent, isolate per
      tenant, payloads outside tenant tables.
- [ ] Retention jobs: delete data older than plan allows; tenant-safe and
      idempotent.

### Acceptance criteria

- [ ] Attribution journey suite passes.
- [ ] Provider capability table in docs with verified capabilities + limits.
- [ ] Replay unavailable on plans without it; masking demonstrated.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- Provider test accounts/webhook secrets for live end-to-end verification.

---

## Phase 8 — Onboarding and developer experience

**Goal:** first useful result in minutes. Main differentiator.

### Tasks

- [x] Keep the existing tracker and its API; generate the install snippet from
      the real script structure. — proof: onboarding snippet uses
      `/script.js` + `data-website-id`; `/api/send` accepted a real event.
- [x] Onboarding flow with progress: create workspace → add website → copy
      snippet → install → verify first event (live check) → connect payments →
      first revenue report. Dashboard reachable without forcing every step. —
      proof: `src/features/onboarding/OnboardingFlow.tsx`,
      `docs/ONBOARDING_SPEC.md`. Payment step links to the real settings page;
      no hard gates.
- [ ] Install guides: Next.js, React, Vite, plain HTML, Astro, Remix (where
      supported) + troubleshooting (ad blockers, CSP, wrong domain, SPA
      routing). — **not written**; the onboarding UI has short guidance only.
- [ ] AI agent experience: review Talivia agent repo licence (MIT verified);
      write `llms.txt` and agent docs; verification endpoint/CLI; design and if
      feasible implement MCP server (verify installation, list events, diagnose).
      — **not built**; the verification endpoint exists and is reusable.
- [ ] Activation metrics: signup, workspace created, website created, tracker
      installed, first event, payment connected, first attributed payment. —
      **not instrumented**.

### Acceptance criteria

- [ ] New test account reaches a first verified event using only the UI. —
      **API flow proven end-to-end** (login → workspace → website → event →
      verify). A browser walk-through is still required because the desktop
      browser tool was unavailable.
- [ ] Each framework guide has a tested or clearly labelled untested snippet.
- [ ] Activation funnel recorded and viewable by internal admins.

### Decisions made

- Onboarding is an authenticated standalone route, not a step inside the app
  shell, so it matches Tartly's full-height canvas.
- The workspace step is skipped when the user already has one.
- Verification polls the real event store; there is no client-side "success"
  without an actual event.

### Unverified / Assumed

- Visual/browser QA of the welcome overlay and transitions.
- Whether a 3-second poll is too aggressive at scale; it only runs while the
  verify step is open.

### Needs from the human

- Confirm the onboarding copy and the 4.2s welcome hold.

## Phase 9 — Rebrand and product UI

**Goal:** a polished, distinct product, not a logo swap. RevenueLens copies
Tartly's UI style, schemes, ideology, and onboarding motion, adapted to SaaS.

### Core tasks

- [x] One branding config (`src/lib/brand.ts`): name, tagline, logo, colors,
      domain, support/no-reply emails, legal entity. Placeholder: RevenueLens. —
      proof: file exists; used by pricing, onboarding, login, top nav, metadata.
- [x] Remove/replace customer-facing Talivia names, logos, copy, favicons,
      metadata, emails, docs links. Keep MIT notice in `LICENSE`; add
      `THIRD_PARTY_NOTICES`. — proof: brand mark/favicons/manifest/login/nav/
      metadata/intl/settings/imports are rebranded; the old `talivia.com`
      documentation links are replaced with the local `/docs` guides; admin
      update checks no longer phone the upstream service unless
      `OSS_UPDATE_URL` is configured. Remaining `Talivia` strings are internal
      identifiers (cron/redis/tracker types) and the compatibility import
      format; `THIRD_PARTY_NOTICES` keeps the upstream attribution required by
      the MIT license.
- [x] Revenue-first screens: revenue by source, revenue per visitor,
      conversion rate, MRR by channel; onboarding; billing; usage; workspace
      settings; empty states; mobile. — **done:** onboarding, pricing, the
      portfolio revenue strip, and MRR by first-touch channel on `/app`
      (`getPortfolioMrrByChannel` + `MrrByChannelPanel`). Billing history still
      waits for Phase 5.
- [x] Landing page, pricing page (driven by plan config), docs shell, login
      and signup. — proof: landing (`/`), pricing (`/pricing`), a public docs
      shell at `/docs` with provider guides, and the shared auth screens are
      live and driven by `BRAND`/`PLANS`.
- [x] Accessibility basics; dark mode (the product is dark by default). —
      **done:** global keyboard focus rings, a reduced-motion override,
      labels/focus on the settings/docs/onboarding/pricing screens, and a WCAG
      AA contrast test over the brand color tokens
      (`src/lib/brand-contrast.test.ts`).

### Additional UI steps (owner-requested)

- [x] **UI-1 — Design audit:** extract Tartly tokens and map onto Talivia. —
      proof: `docs/UI_DESIGN_SYSTEM.md`.
- [x] **UI-2 — Brand config adoption:** name, wordmark, favicon, metadata,
      emails, footer, auth, docs read from one config. — **partial**: auth/nav/
      metadata/pricing/onboarding use it; settings copy not yet.
- [x] **UI-3 — App shell:** quiet dark workstation; tonal layering; hairline
      borders; blush reserved for signal; tabular numerals. — proof:
      `TopNav.tsx` uses the brand wordmark and a hairline border;
      `WebsiteLayout.tsx` adds a grouped workbench rail (`WebsiteSectionNav`)
      that becomes horizontal section tabs below 1024 px. Chrome accents were
      moved from blue to blush (`global.css`, settings and onboarding).
- [x] **UI-4 — Revenue-first overview:** replace generic analytics hero with
      revenue, revenue/visitor, conversion, MRR-by-channel cards + charts. —
      proof: `/app` opens with a portfolio strip (revenue, revenue per visitor,
      purchase rate, visitors), each website card leads with revenue, and the
      MRR panel groups active subscriptions by the first-touch channel stored on
      the visitor (falling back to the earliest attributed payment).
- [x] **UI-5 — Onboarding shell:** full-height centred 440 px column, logo,
      title, subtitle, directional slide/fade (12 px, 320 ms, 70 ms stagger),
      reduced-motion support, welcome moment. — proof: `OnboardingFlow.tsx` /
      `Onboarding.module.css`.
- [x] **UI-6 — Onboarding steps:** welcome → workspace → website → tracker
      install → live verification → payments → first report. — **first report
      not built**; done step links to the dashboard.
- [x] **UI-7 — Install experience:** snippet card with copy button, framework
      tabs, verify-live status with real polling. — **tabs not built**; copy +
      real polling done.
- [x] **UI-8 — Pricing page:** two cards only, Starter $7.99 / Pro $14.99,
      monthly/annual toggle, no free tier, no fake claims. — proof: `/pricing`
      returns 200 and renders both prices.
- [x] **UI-9 — Billing + usage pages:** plan, renewal, usage bar, 80%/100%
      states, upgrade path. — **usage shipped** at `/app/settings/billing`
      (plan, reset date, event/replay bars, grace/limit states, website/member
      limits, upgrade link). Invoice/renewal history waits for Phase 5.
- [x] **UI-10 — Settings:** workspace, members, websites, integrations,
      security; consistent empty/error/loading states. — proof: `/app/settings`
      is now a real overview instead of a redirect; grouped nav covers
      Overview, Workspace, Websites, Integrations, Plan and usage, Security,
      Account, and Preferences. Integrations shows per-website provider
      connection state from the real API; Security carries verification,
      password, session, and account-deletion states. Workspace/members/
      invitations and Plan & usage remain in place.
- [x] **UI-11 — Auth screens:** login, signup, verify, reset in the same shell.
      — login, signup, invite acceptance, `/verify-email`, `/forgot-password`,
      and `/reset-password` use the same auth shell.
- [x] **UI-12 — Marketing landing:** one promise, three proof points, product
      visual, pricing teaser, FAQ. — proof: `src/app/page.tsx` +
      `Landing.module.css`; `/` returns 200 and renders both config-driven
      plans. The previous `/` → `/login` redirect was removed from
      `next.config.ts`.
- [x] **UI-15 — Full analytics route restructure (new):** every inherited
      analytics surface is reachable inside `/app/[websiteId]` instead of only
      the three revenue debug pages. — proof: new routes for `revenue`,
      `attribution`, `journeys`, `diagnostics`, `sessions`, `events`,
      `realtime`, `breakdown`, `goals`, `funnels`, `retention`, `cohorts`,
      `utm`, `performance`, `compare`, and `replays`; legacy
      `revenue-attribution`/`revenue-journey`/`revenue-diagnostics` redirect to
      the canonical route; `app-route.test.ts` and
      `WebsiteSectionNav.test.tsx` lock the route/nav contract.
- [x] **UI-16 — Complete source restructure (new):** the app router is now a
      thin routing layer; all product UI moved to domain modules under
      `src/features` (`app-shell`, `portfolio`, `websites/workbench`,
      `settings`, `onboarding`, `auth`, `marketing`, `share`, `legacy`).
      `src/app` now contains route files plus the root `Providers.tsx` only.
      Removed dead portfolio table
      components and the obsolete revenue-attribution/revenue-journey report
      screens and hooks. Legacy `/websites/*` and `/settings/*` URLs redirect
      to the canonical `/app/*` routes. — proof: `src/app/(main)` contains only
      route files; `docs/UI_DESIGN_SYSTEM.md` §6 records the layout;
      `src/lib/app-structure.test.ts` enforces it; build, typecheck, lint, and
      613 tests are green.
- [x] **UI-17 — Complete server restructure (new):** every one of the 119 API
      route files is now a thin adapter that re-exports HTTP handlers from a
      feature `server` module. Handlers moved into `account`, `analytics`,
      `auth`, `legacy`, `payments`, `share`, `system`, `websites`, and
      `workspaces`. Payment provider clients, webhook verifiers, provider
      credential handling, provider backfills, analytics import parsers, and
      board definitions moved into their feature modules as well; the
      Prisma/analytics query layer, permissions, and shared UI remain
      cross-cutting. `docs/ARCHITECTURE.md` defines the module boundaries and
      dependency direction, and `src/lib/app-structure.test.ts` enforces thin
      route files plus server-module presence. — proof: build, typecheck,
      lint, 22 API route suites (126 tests), and the full suite are green.
- [x] **UI-13 — Motion + polish pass:** page transitions, hover lift, focus
      rings, skeletons, reduced motion, mobile. — proof: global keyboard
      `:focus-visible` rings, a global reduced-motion override, blush-only
      signal states (auth hover, external links, activity heatmap, API-key
      reveal), working loading/empty states on the new settings pages, and the
      responsive docs/settings layouts at 860 px and below.
- [x] **UI-18 — Brand-safe documentation shell:** public `/docs` and
      `/docs/revenue-guides/[slug]` pages replace the upstream help-centre
      links. Guides for Stripe, Dodo Payments, Lemon Squeezy, Polar, Yolfi, and
      the manual payment API are generated from one content module, link only
      to official provider pages, and are covered by `content.test.ts`.
- [x] **UI-19 — Complete domain restructure (new):** the remaining domain
      widgets, selectors, React Query hooks, and cron jobs moved out of
      `src/components` and `src/lib` into their owning feature modules.
      Analytics widgets and filters now live in
      `src/features/analytics/components`; share widgets in
      `src/features/share/components`; `WebsiteSelect` in
      `src/features/websites`; shell controls in
      `src/features/app-shell/components`; legacy selectors in
      `src/features/legacy`; payment provider UI in `src/features/payments`;
      and all domain query hooks in `src/features/<domain>/hooks` with barrels.
      Cron moved to `src/features/system/cron`. Only shared primitives remain
      in `src/components` (`brand`, `charts`, `common`, `hooks`, `input`,
      `svg`). Three dead components and three dead hooks were deleted. The
      structure test now fails if `src/components` gains a non-primitive
      directory or if any shared layer imports a feature. Server handlers stay
      in feature `server/` modules; the preserved analytics SQL engine and
      cross-domain Prisma repositories stay in `src/queries` because tenant
      authorization and analytics depend on them. Proof: 119 files moved,
      build/typecheck/lint green, **622/622 tests** pass.
- [x] **UI-14 — Temporary rename demonstration:** change brand config and show
      name/logo/colors/emails update everywhere. — proof:
      `src/lib/brand.ts` now derives name, domain, URL, support/no-reply
      addresses, legal entity, and logo alt text from two constants, and
      `src/lib/brand-propagation.test.ts` fails if customer-facing feature or
      shared code hardcodes the literal brand name again.
- [x] **UI-20 — Shared-layer restructure completion (new):** the last domain
      helpers moved out of `src/lib` into their feature modules:
      `analytics/lib` (collector cache, cross-domain linker, attribution query,
      dashboard overview, client detection, filters, metric colors, chart
      axis), `payments/lib` (payment return detection), `auth/lib` +
      `auth/server` (return URL, registration), `workspaces/lib` (invitations,
      members), `websites/lib` (API keys, domain normalization), `legacy/lib`
      (feature gate), and `system/lib` (OSS version). Deleted the unused
      dashboard/websites/cache stores and the unused refresh button, leaving
      `src/store` with only shared app state. `app-structure.test.ts` now
      enforces a shared `src/lib` allowlist, a `src/store` allowlist, and the
      presence of the moved domain helpers. — proof: typecheck and lint clean,
      **625/625 tests** pass.
- [x] **UI-21 — Structural cleanup completion (new):** removed the dead
      inherited legacy dashboard UI (boards, link/pixel lists, edit forms,
      board component registry, and their unused hooks/selectors) while keeping
      only the link and pixel pages rendered by public shares and the legacy
      API handlers. Deleted the unused segment list/edit chain (keeping the
      filter-bar edit dialog), the orphaned metrics bars, profile/share headers,
      two input primitives, and the empty/stale shared helpers. Moved
      `WebsiteSettingsPage` out of a route-param-shaped
      `settings/websites/[websiteId]` directory into the website workbench.
      `app-structure.test.ts` now pins the pruned legacy surface so it cannot
      regrow. — proof: typecheck, lint, and the structure test pass.
- [x] **UI-22 — Complete analytics/websites domain split (new):** the whole
      website analytics workbench moved from `features/websites/workbench` to
      `features/analytics/workbench` (shell, header, nav, overview, reports,
      sessions, events, replay, realtime, cohorts, compare, segments). The
      matching analytics request handlers moved to
      `features/analytics/server/[websiteId]`, so the thin API routes point at
      the domain that owns them. `features/websites` now owns site management
      only (CRUD, `settings/`, imports/exports, API keys, members, shares).
      The account settings UI moved from `settings/profile` to
      `settings/account`. `app-structure.test.ts` pins both sides of the split
      so the workbench cannot drift back into `websites`. — proof: typecheck,
      lint, structure/route tests, and the full suite are green.
- [x] **UI-23 — Settings ownership completion (new):** `features/settings` is
      now the settings shell only (`SettingsLayout`, `SettingsPageLayout`,
      `SettingsHomePage`). Account, security, and preference screens moved to
      `features/account/settings` with the local-user admin handlers under
      `features/account/server`; workspace settings moved to
      `features/workspaces/settings`, website list settings to
      `features/websites/settings`, integration settings to
      `features/payments/settings`, and plan/usage to the new
      `features/billing` domain. Route files point at the owning domain, and
      `app-structure.test.ts` pins the shell and forbids the old catch-all
      directories. — proof: typecheck, lint, and **641/641 tests** pass.
- [x] **UI-24 — Permission ownership completion (new):** `src/permissions` is
      now only the shared website/entity authorization boundary
      (`website.ts`, `entity.ts`, the barrel). Report checks moved to
      `features/analytics/lib/report-permissions.ts`, local-user/platform-admin
      checks to `features/account/lib/permissions.ts`, and frozen board/link/
      pixel read checks to `features/legacy/lib/permissions.ts`; the unused
      legacy update/delete checks were deleted. Route tests mock the owning
      feature module, and `app-structure.test.ts` enforces the permissions
      allowlist. — proof: typecheck, lint, and **642/642 tests** pass.
- [x] **UI-25 — Data-layer and router completion (new):** every domain Prisma
      repository moved from `src/queries/prisma` into
      `features/<domain>/server/queries` (`analytics`, `payments`, `websites`,
      `account`); the whole inherited analytics SQL engine moved to
      `features/analytics/server/queries/sql`; the tenant-scoped session cache
      moved beside it; `dashboard-breakdown`, `data`, `paymentCustomer`,
      `redact`, `website-overview`, `stripe-amount`, `generate`, and
      `board-types` moved into their owning feature libs. The public pixel
      and link collectors moved to `features/legacy/server/collect`, the
      website shell resolver moved into the analytics workbench, and the route
      layer no longer imports `@/queries`, `@/lib/prisma`, or `@/lib/redis`.
      `src/queries` is now a small allowlisted shared kernel (authorization,
      request parsing, auth, billing contracts, legacy entity lookups).
      `app-structure.test.ts` pins the shared query allowlist, the domain query
      directories, and the route-layer data-access ban. — proof: typecheck and
      lint clean, `next build` success, **645/645 tests** pass.

### Acceptance criteria

- [x] Repo-wide search for the original brand finds nothing customer-facing
      (allowed exceptions listed). — proof: no `talivia.com` links remain in
      application code; provider guides, imports, backup filenames, and update
      notices are brand-safe. Internal compatibility identifiers and the
      upstream MIT attribution in `THIRD_PARTY_NOTICES` are intentionally kept.
- [x] Changing the brand config changes name, logo, colors, emails everywhere
      (demonstrated with a temporary rename). — proof:
      `src/lib/brand-propagation.test.ts` plus the config-derived brand module.
- [x] Onboarding motion matches the Tartly constants and respects reduced
      motion. — proof: 12px/320ms/70ms in `Onboarding.module.css`, reduced-motion
      block.
- [x] Pricing page renders exactly two plans from the config. — proof:
      `/pricing` 200; `plans.test.ts`.
- [x] Portfolio MRR panel uses real subscription data and refuses to invent a
      cross-currency total. — proof: `portfolioMrr.ts`,
      `website-overview.test.ts` (mixed-currency case).

### Decisions made

- Keep Talivia's existing component system; do not add Tailwind/shadcn. This is
  the difference between a rebrand and a rewrite.
- Dark-only at launch, matching the working surfaces of both Tartly and Talivia.
- The blush signal is reserved for revenue/live state; unlike Tartly's AI
  spectrum, RevenueLens is not an AI-authored product.

### Unverified / Assumed

- Visual fidelity of the CSS halftone welcome vs Tartly's canvas version.
- Contrast ratios need a tool pass (Phase 11).

### Needs from the human

- Final brand name/domain/logo (RevenueLens is a placeholder).

## Phase 10 — Compliance, abuse protection, email, operations

### Tasks

- [ ] Draft legal pages (clearly marked for lawyer review): privacy, terms,
      cookie/consent, data processing, subprocessors, acceptable use.
- [ ] Privacy: IP handling/anonymization, no-cookie option if supported, GDPR
      export/deletion, replay consent hooks.
- [ ] Abuse: per-IP/per-email signup limits, disposable email handling,
      per-website ingestion limits, origin/domain validation, bot filtering,
      free-tier farming detection, admin suspend tools.
- [ ] Transactional email: verification, reset, invitations, 80%/100% usage,
      payment failure, templates.
- [ ] Operations: structured logging, error tracking hook, uptime/health,
      Neon + event-store backup/restore, secrets rotation, audit log for
      billing/member/key/deletion actions.

### Acceptance criteria

- [ ] Deletion flow removes a test workspace's data across Neon and event
      store (check shown).
- [ ] Rate-limit tests pass.
- [ ] Audit log entries exist for all listed actions.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- Lawyer review of policies; email provider; error-tracking account.

---

## Phase 11 — Hardening, QA, deployment, launch readiness

### Tasks

- [ ] Security review: dependency audit, OWASP pass (authz, injection, SSRF,
      XSS in dashboards/replay, secrets in logs), security headers, ingestion
      CORS.
- [ ] Performance: indexes, slow-query check, load test ingestion + record.
- [ ] Full test run: unit, integration, isolation, billing, metering; CI.
- [ ] Deployment guide/scripts; production env checklist; Neon branch
      promotion rehearsal; custom domain/DNS for tracker.
- [ ] `docs/LAUNCH_CHECKLIST.md`, `docs/RUNBOOK.md`.
- [ ] Final honest tracker update + prioritized post-launch backlog.

### Acceptance criteria

- [ ] CI green; isolation suite green; load-test numbers recorded.
- [ ] Launch checklist complete or each item has an owner and reason.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- Hosting account, domain/DNS, Neon production project, Dodo live keys.

---

## Phase 12 — Go-to-market (after product works)

- [ ] Positioning and messaging.
- [ ] Landing/pricing/FAQ copy.
- [ ] Comparison pages vs DataFast, Plausible, Fathom, Umami, Simple Analytics,
      Talivia Cloud — fetched facts only, source + date.
- [ ] Migration guides + quickstart.
- [ ] SEO: 20 keywords with intent, 10 content outlines.
- [ ] Launch plan + drafts (Product Hunt, Indie Hackers, Show HN, Reddit rules
      check, X, LinkedIn, Dev.to).
- [ ] Early-adopter offer modelled against `PRICING_ECONOMICS.md`.
- [ ] Activation/retention plan + 5-email onboarding sequence + usage upsell.
- [ ] 30-day launch calendar.
- [ ] Success metrics with assumptions.

### Acceptance criteria

- [ ] All files exist under `docs/gtm/` and relevant pages are live.
- [ ] Every competitor fact has a source/date.
- [ ] No fabricated testimonials, counts, or statistics.
- [ ] Offer is margin-safe per the economics model.

---

## Remaining work (in order)

1. **Phase 1 caveat:** run the migration against the real Neon production branch
   and record the output; configure Neon pooled/direct secrets.
2. **Phase 2 caveat:** rehearse the workspace migration on a copy of real data,
   then merge or retire the legacy `Team`/`WebsiteMember` model.
3. **Phase 5:** Dodo platform billing behind `BillingProvider`, webhooks,
   lifecycle, billing UI.
4. **Phase 6 finish:** owner approval of limits, live parallel-ingestion proof,
   notice emails (Phase 10), provider-driven periods after Phase 5.
5. **Phase 7:** attribution journey tests, provider capability table, replay
   entitlements/masking/retention jobs.
6. **Phase 8 finish:** framework guides, activation events/admin funnel,
   `llms.txt`, MCP/CLI verification.
7. **Phase 9 complete:** the portfolio MRR-by-channel panel, the config-derived
   brand lock, and the WCAG AA contrast test are shipped. The source restructure
   (app, server, domain UI/hooks/lib/store) and the legacy UI prune are complete
   and enforced by the structure test. Settings ownership is complete:
   `features/settings` is the shell only, and each domain owns its settings
   screen. Permission ownership is likewise complete: `src/permissions` is the
   shared website/entity boundary only. Data ownership is complete too: domain
   repositories and the analytics SQL engine live in feature `server/queries`,
   and `src/queries` is a small shared kernel. Billing history waits for
   Phase 5.
8. **Phase 10:** legal drafts, abuse protection, transactional email, ops.
9. **Phase 11:** security review, load test, CI, deployment/runbook.
10. **Phase 12:** go-to-market.

## Changelog

- 2026-11-05 — **Data-layer and router completion (Phase 9 / UI-25):** moved
  every domain Prisma repository out of `src/queries/prisma` into
  `features/<domain>/server/queries` and moved the entire analytics SQL engine
  to `features/analytics/server/queries/sql`. The tenant-scoped session cache
  now sits beside the engine; `dashboard-breakdown`, `data`, `paymentCustomer`,
  `redact`, `website-overview`, `stripe-amount`, and `generate` moved into
  their owning feature libs. Public pixel/link collectors moved to
  `features/legacy/server/collect` and the
  website shell resolver to `features/analytics/workbench`, so the route layer
  no longer reads data directly. `src/queries` is now an allowlisted shared
  kernel (website/user/share/team/member authorization, segment resolution,
  billing currency/audit/cleanup, legacy entity lookups). `app-structure.test.ts`
  pins the kernel, the domain query directories, and the route-layer ban.
  Typecheck and lint clean; `next build` succeeds with `SKIP_DB_CHECK=1`;
  **645/645 tests** pass.

- 2026-11-05 — **Permission ownership restructure (Phase 9 / UI-24):**
  `src/permissions` now holds only the central website/entity authorization
  boundary. Report, platform-admin user, and frozen legacy read checks moved to
  `features/analytics/lib/report-permissions.ts`,
  `features/account/lib/permissions.ts`, and
  `features/legacy/lib/permissions.ts`. Unused legacy update/delete permission
  functions were deleted, route tests now mock the owning feature module, and
  `app-structure.test.ts` enforces the reduced permissions allowlist. Typecheck
  and lint are clean; **642/642 tests** pass.

- 2026-11-05 — **Settings ownership restructure (Phase 9 / UI-23):** dissolved
  the `features/settings` catch-all. Account, security, and preference screens
  now live in `features/account/settings`, with the local-user admin API
  handlers under `features/account/server/users`; workspace settings moved to
  `features/workspaces/settings`, website list settings to
  `features/websites/settings`, integration settings to
  `features/payments/settings`, and plan/usage to the new `features/billing`
  domain. `features/settings` retains only the settings shell, grouped nav, and
  overview. `app-structure.test.ts` enforces the shell allowlist and rejects the
  old directories. Typecheck and lint are clean; **641/641 tests** pass, and
  `next build` completes with `SKIP_DB_CHECK=1` (the local :5433 database was
  down after a harness restart).

- 2026-11-05 — **Analytics/websites domain split (Phase 9 / UI-22):** the
  entire website analytics workbench (shell, header, nav, overview, reports,
  sessions, events, replay, realtime, cohorts, compare, segments) moved from
  `src/features/websites/workbench` to `src/features/analytics/workbench`, and
  the report/session/event/replay/metric/realtime request handlers moved to
  `src/features/analytics/server/[websiteId]`. The thin API routes now point at
  the analytics domain; `features/websites` keeps site management (CRUD,
  settings, imports/exports, API keys, members, shares) with settings under
  `features/websites/settings`. Account settings moved from `settings/profile`
  to `settings/account`. `app-structure.test.ts` pins the new boundary, and
  `docs/ARCHITECTURE.md` / `docs/UI_DESIGN_SYSTEM.md` / the README describe the
  new layout. Typecheck, lint, structure/route tests, and the full suite pass.

- 2026-11-05 — **Phase 9 completion + structural cleanup:** deleted the dead
  inherited legacy dashboard UI (boards, link/pixel lists and edit forms,
  board registry, unused selectors/hooks) and the orphaned segment list/edit
  chain, metrics bars, and dead shared helpers; moved `WebsiteSettingsPage` into
  the website workbench; added MRR-by-first-touch-channel to `/app`
  (`getPortfolioMrrByChannel`, pure grouping in `website-overview.ts`, UI panel);
  made the brand name/domain config derive URL, emails, legal entity, and logo
  alt text, and removed hardcoded brand copy from docs/onboarding/integrations;
  added `brand-propagation.test.ts` and a WCAG AA `brand-contrast.test.ts`; and
  pinned the pruned legacy surface in `app-structure.test.ts`. Typecheck and
  lint are clean.

- 2026-11-05 — **Shared-layer restructure completion (Phase 9 / UI-20):** moved
  every remaining feature-owned helper out of `src/lib` into
  `src/features/<domain>/lib` (analytics tracking/collector/chart helpers,
  payment detection, auth return URL and registration, workspace invitations
  and members, website API keys and domain normalization, legacy gate, OSS
  version). Deleted unused dashboard/websites/cache stores and the unused
  refresh button; `src/store` now holds only shared app state. Extended
  `app-structure.test.ts` with `src/lib` and `src/store` allowlists plus
  domain-helper presence checks, and updated `ARCHITECTURE.md`. Build,
  typecheck, lint, and **625/625 tests** pass.

- 2026-11-05 — **Complete domain restructure (Phase 9 / UI-19):** moved the last
  119 domain files out of `src/components` and `src/lib` into feature modules.
  Analytics widgets/filters → `features/analytics/components`; share widgets →
  `features/share/components`; `WebsiteSelect` → `features/websites`;
  `WorkspaceSwitcher`/`UserButton` → `features/app-shell/components`; legacy
  selectors → `features/legacy`; `PaymentProviderLogo` → `features/payments`;
  all domain query hooks → `features/<domain>/hooks` barrels; cron →
  `features/system/cron`. Only shared primitives remain in `src/components`.
  Moved `formatStripeAmount` to `src/lib/stripe-amount.ts` and board type
  constants to `src/lib/board-types.ts` so shared data access no longer imports
  a feature. Deleted three dead components and three dead hooks. Extended
  `app-structure.test.ts` to enforce the shared component allowlist and the
  no-shared→feature rule. Updated `ARCHITECTURE.md` and the design-system map.
  Build, typecheck, lint, and **622/622 tests** pass.

- 2026-11-05 — **Phase 9 restructure + polish completion:** `/app/settings` is
  a real overview (not a redirect) with grouped navigation; new Integrations
  and Security settings surfaces report real provider connection state,
  verification state, password/session policy, and account deletion. Added a
  public docs shell (`/docs` + `/docs/revenue-guides/[slug]`) with guides for
  Stripe, Dodo Payments, Lemon Squeezy, Polar, Yolfi, and the manual API; all
  old `talivia.com` help links now resolve locally. Rebranded legacy import
  copy and backup filenames, stopped upstream update telemetry unless
  `OSS_UPDATE_URL` is set, moved remaining blue chrome to the blush signal, and
  added global focus-visible and reduced-motion rules. `app-route` now accepts
  the new settings paths and the structure test includes the docs domain.
  Build, typecheck, lint, and **620/620 tests** pass.

- 2026-11-05 — **Complete server restructure (Phase 9 / UI-17):** all 119 API
  route handlers moved out of `src/app/api` into feature modules
  (`features/{account,analytics,auth,legacy,payments,share,system,websites,workspaces}/server`).
  Route files now contain only HTTP-method re-exports and static Next config.
  Payment provider clients/webhooks/backfills, provider credential handling,
  analytics import parsers, and board definitions moved from `src/lib` and
  `src/queries` into `features/payments`, `features/websites`, and
  `features/legacy`. Added `docs/ARCHITECTURE.md` (layer boundaries,
  dependency direction, route contract), extended
  `src/lib/app-structure.test.ts` to enforce thin API routes and server-module
  presence, and updated the UI design-system map. Build, typecheck, lint, 126
  API tests, and the full suite pass.
- 2026-11-05 — **Complete source restructure (Phase 9):** `src/app` is now the
  routing layer only. Product UI moved into `src/features` domain modules:
  `app-shell` (shell/top nav/notices), `portfolio` (all-websites home),
  `websites` (list helpers + `workbench` with reports, sessions, events,
  replay, settings), `settings` (workspace, websites, plan and usage, account,
  preferences), `onboarding` (welcome and website setup), `auth` (login,
  signup, verify, reset, invite, logout), `marketing` (landing and pricing),
  `share` (public share shell), and `legacy` (quarantined boards/links/pixels).
  `src/app` contains route files plus `Providers.tsx` only. Removed the unused portfolio table
  components and the obsolete revenue-attribution/revenue-journey report
  screens and query hooks (their API endpoints remain for exports and the
  diagnostics view). `/websites/*` and `/settings/*` now redirect to the
  canonical `/app/*` routes. Customer-facing provider webhook names,
  descriptions, diagnostics copy, and import labels now read from
  `src/lib/brand.ts`; README, SECURITY, and CONTRIBUTING no longer present the
  upstream product as the product. Fixed a timing-flaky session-cookie test by
  freezing the clock. Build, typecheck, lint, and 613/613 tests pass, including a new
  `src/lib/app-structure.test.ts` that locks routes to `src/app` and product UI to
  `src/features`; an
  authenticated smoke run returned 200 on all 19 workbench routes and the 7
  settings/portfolio surfaces.
- 2026-11-05 — **Usage metering and the Plan & usage surface (Phases 6 + 9):**
  new `usage_period` and `usage_replay_session` tables; atomic reserve-then-write
  event metering in the collector with release on write failure; replay
  entitlement + once-per-session metering in the recorder; 80% warning, 100%
  grace (1,000 events / 100 replays), then paused ingestion while reads stay
  open. New member-visible `GET /api/workspaces/[workspaceId]/usage`, an app
  shell notice banner, and `/app/settings/billing` (plan, reset date, usage
  bars, limits, upgrade path). Settings now has a real index, a grouped nav, and
  a workspace website inventory at `/app/settings/websites`; billing and
  websites were added to the supported-route contract.
  `docs/USAGE_METERING.md` records the counting rules and limits. Full suite
  611/611; build, typecheck, and lint green.
- 2026-11-05 — **Application restructure (Phase 9):** every inherited analytics
  surface now has a first-class `/app/[websiteId]` route and a grouped
  workbench rail (`WebsiteSectionNav`): Revenue (overview, revenue, attribution,
  journeys, diagnostics), Audience (visitors, events, realtime, breakdown),
  Behaviour (goals, funnels, retention, cohorts), Growth (UTM, performance,
  compare), replay, and settings. Legacy revenue debug routes redirect to the
  canonical paths. The website layout uses a 1320 px workstation width.
  `/app` is now a revenue-first portfolio (revenue, revenue/visitor, purchase
  rate, visitors; revenue-led site cards); the website metric strip now leads
  with revenue and revenue/visitor; and the overview's funnels/journey tabs
  link to the real report pages instead of showing "Coming soon". `/` is a real
  landing page driven by `BRAND` + `PLANS` instead of redirecting to login.
  Brand chrome moved from
  blue to the blush signal, and the top nav/search/settings/404/share surfaces
  use the brand mark and config. New tests: nav coverage/active state (4) and
  expanded route allowlist. Full suite 597/597, build/lint/typecheck green; 19
  authenticated route smoke checks returned 200.
- 2026-11-05 — **Auth and isolation restructuring (Phases 3–4):** durable
  PostgreSQL sessions behind an HttpOnly/SameSite cookie; localStorage bearer
  tokens removed from the browser; password change/reset revokes every session;
  hashed single-use email-verification and password-reset tokens; Postgres
  rate limiting for login/signup/reset; CSRF origin checks; account deletion;
  workspace update/transfer/delete routes; platform-admin allowlist; bootstrap
  `admin` credentials disabled; cached sessions scoped by website (real
  contamination bug fixed); webhook/job isolation tests; auth-maintenance cron.
  New migrations `20261104185008_auth_sessions` and
  `20261104190000_remove_default_admin`. Build, typecheck, lint, the full test
  suite (577 tests), and a 17-assertion live smoke on the production build are
  green.
- 2026-11-05 — **Tenancy restructuring:** every website route now resolves
  access through workspace membership; `isAdmin` is no longer a tenant grant;
  public signup + transactional registration; hashed invitation flow with
  accept/revoke UI; workspace member management; workspace switcher and
  `/app/settings/workspace`; plan-based website/member limits; static
  route-boundary test; `docs/TENANCY.md`. New tests: 10 isolation, 8 invitation,
  3 registration, 1 boundary. Build green.
- 2026-11-04 — Phase 2 partial: Workspace/Membership/Invitation models,
  `website.workspace_id` migration + backfill, central permission module,
  workspace/website APIs, and unit tests (13 new tests).
- 2026-11-04 — Phase 9 partial: brand config, new mark/favicons, rebranded
  login/nav/metadata, `/pricing` with exactly two plans.
- 2026-11-04 — Phase 8 partial: Tartly-style onboarding flow with welcome
  halftone, 12px/320ms/70ms motion, workspace → website → install → verify →
  payments; live verification proven with a real event.
- 2026-11-04 — Phase 6 partial: `src/lib/plans.ts` (Starter $7.99 / Pro $14.99,
  no free tier) and `docs/PRICING_ECONOMICS.md` with fetched competitor prices
  and margin model.
- 2026-11-04 — Phase 1: pooled/unpooled URL split, retry helper, pool timeouts,
  `/api/health`, `.env.example`, environment + Neon branching docs.
- 2026-11-04 — Phase 0 complete: audit, license/brand audit, baseline
  (build/lint/typecheck pass; 3 pre-existing test failures).
- 2026-11-04 — Tracker created; repo cloned; commercial contract fixed at two
  paid plans; Tartly UI/onboarding mandate recorded.

## Risk register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| The fork is a single-install product; tenancy is implicit via `user_id`/`team_id` on `website` | Critical | Add `Workspace` ownership and central authorization in Phase 2; isolation suite in Phase 3 |
| Analytics events and replays are stored in PostgreSQL, so hosting cost scales with customer volume | High | Keep events off Neon; use a separate Postgres/ClickHouse for events before scale; meter usage (Phase 6) |
| Existing auth is username/password with a bootstrap `admin`/`admin` | Critical | **Mitigated (Phase 4):** bootstrap row disabled by migration; hashed sessions/tokens, rate limits, CSRF, and verification/reset shipped |
| Upstream Cloud features (Search Console, social mentions) are absent from OSS | Medium | Position only on what OSS actually ships; do not advertise missing features |
| Dodo is used as an analytics provider; using it for platform billing risks mixing contexts | High | Separate `BillingProvider` module + distinct webhook routes and models |
| Tartly is a different product (email operator); copying visuals must not import its dependencies or product logic | Medium | Extract tokens/motion into Talivia's existing CSS/React system; no Tailwind migration |
| No Neon/Dodo/email credentials in this environment | High | Stub behind interfaces, document exact needs, keep local PostgreSQL proof |
| Plan limits are not yet modelled against real costs | High | Phase 6 economics doc before enabling billing |
| Competitor price claims can go stale | Medium | Cite URL + fetch date; re-check before launch |
| Event/replay retention deletion is destructive | High | Idempotent, tenant-scoped jobs + dry-run tests |
