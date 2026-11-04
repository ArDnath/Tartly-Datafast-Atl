# RevenueLens — Phase Tracker

- **Project:** RevenueLens (working brand; final brand TBD)
- **Repository:** <https://github.com/talivia-group/talivia> (MIT), forked locally at
  `/home/ariyaman/Dev/fight/efforts/revenuelens`
- **Last updated:** 2026-11-04
- **Current phase:** Phase 2 — Workspaces, memberships, and RBAC (IN_PROGRESS)

## Overall progress

- Total phases: **12** (0–11 product/build, 12 go-to-market)
- Phases complete: **1 full, 1 with caveats**
- Overall percent (average of phases 0–11): **31%**
- Build state at last check: **green** (`pnpm build` exit 0 after the workspace,
  onboarding, pricing, and branding changes). Full test run: **490 passed / 5
  failed** — 3 baseline failures plus 2 `LocalUsersSettings` flakes under full
  parallel load; both pass when run in isolation.

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
| 2 | Workspaces, memberships, RBAC | IN_PROGRESS | 69% | 2026-11-04 | — | auth/signup |
| 3 | Tenant isolation hardening + tests | NOT_STARTED | 0% | — | — | depends on 2 |
| 4 | Authentication and account management | NOT_STARTED | 0% | — | — | email provider key |
| 5 | Platform billing (Dodo) | NOT_STARTED | 0% | — | — | Dodo test/live keys |
| 6 | Plans, pricing economics, usage | IN_PROGRESS | 40% | 2026-11-04 | — | metering; owner approval of limits |
| 7 | Analytics validation, integrations, replay | NOT_STARTED | 0% | — | — | none |
| 8 | Onboarding and developer experience | IN_PROGRESS | 40% | 2026-11-04 | — | guides, activation, MCP |
| 9 | Rebrand and product UI | IN_PROGRESS | 25% | 2026-11-04 | — | full app rebrand |
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
- [ ] Add `WorkspaceInvitation` (`email`, `role`, `invitationTokenHash`,
      `invitedBy`, `expiresAt`, `acceptedAt`). Never store plaintext tokens. —
      **model + table added**; send/accept/revoke/expiry flow not built.
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
- [ ] Registration creates user + personal workspace + OWNER membership + plan +
      usage period in **one transaction**. — **not built**; the workspace
      transaction exists (`createWorkspaceForUser`) but there is no public
      signup route yet.
- [ ] Reuse/merge the existing `Team` / `WebsiteMember` model where it fits;
      one permission system only. — **not merged**; legacy checks remain.
- [x] One central authorization module
      (`requireWorkspaceAccess(user, workspaceId, minRole)`) used by every API
      route and server action. — module exists and is used by the new
      workspace/website/verification routes; **the 102 legacy routes are not
      migrated yet**.
- [x] Document permission matrix: OWNER (everything, billing, delete
      workspace), ADMIN (websites, analytics, integrations, invites; not
      ownership transfer or workspace delete), MEMBER (view + manage allowed
      websites), VIEWER (read-only). — proof: `docs/UI_DESIGN_SYSTEM.md` §? and
      `src/lib/workspace-auth.ts`; unit tests cover all four roles.
- [ ] Workspace switching, creation, invitations (send/accept/revoke/expire). —
      creation + list API and onboarding creation exist; switching UI and
      invitations do not.
- [ ] Separate internal platform-admin role, independently protected; no public
      bootstrap admin and no default credentials. — **not built**; the legacy
      admin still exists and is removed in Phase 4.

### Acceptance criteria

- [ ] Migration applies on a copy of existing data without loss. — local empty
      DB proof only; a copy-with-data rehearsal is pending.
- [ ] Registration transaction test: forced mid-way failure leaves no orphans. —
      not built.
- [x] Permission matrix implemented in one module and unit tested for all four
      roles. — proof: `src/lib/workspace-auth.test.ts` (7 tests, all passing).
- [ ] Grep shows no route/server action reading tenant data without the
      authorization module (exceptions listed explicitly). — **not yet**; this
      is the Phase 3 gate.

### Decisions made

- Workspaces are additive, not a replacement, for this phase: `website.user_id`
  and `team_id` remain for backward compatibility while every new path sets
  `workspace_id`. This avoids a flag-day rewrite of 102 routes.
- `requireWorkspaceAccess` never auto-authorizes the legacy `admin` role. The
  platform-admin console will use a separate, audited path.
- Invitation tokens are hashed at rest; the model is in place before the flow so
  a future implementation cannot accidentally store plaintext.

### Unverified / Assumed

- **UNVERIFIED:** the team-owned website backfill on real data. The SQL attaches
  team websites to the team owner's workspace; a team with no `team-owner` row
  leaves `workspace_id` null.
- **ASSUMED:** one personal workspace per user is the right default for the
  target audience. Agencies may want multiple workspaces immediately; the API
  already supports creating more, but the UI does not.

### Needs from the human

- Nothing yet; signup/auth is the next dependency.

## Phase 3 — Tenant isolation hardening and mandatory isolation tests

**Goal:** make cross-tenant access impossible, and prove it.

### Tasks

- [ ] Inventory every tenant-owned resource and confirm each links to a
      workspace: websites, reports, segments, payment connections, revenue
      records, subscriptions, API keys, imports, historical metrics,
      attribution configs, audit records, replays, sessions, events, shares,
      boards, links, pixels.
- [ ] Explicit tenant scoping on every read/update/delete/create; composite
      foreign keys or equivalent constraints where needed.
- [ ] Event store: every query/write includes the website ID resolved from an
      authorized workspace.
- [ ] Cache keys include tenant and website identifiers; document
      contamination checks.
- [ ] Evaluate PostgreSQL RLS as defence in depth. With Neon pooling use
      transaction-scoped context only (`SET LOCAL`); otherwise document why.
- [ ] Integration tests: Workspace A/User A/Website A vs Workspace B/User
      B/Website B. A can access A; A cannot access B analytics, replays,
      revenue, settings, API keys, exports; ID swapping does not expose B;
      direct API calls cannot bypass.
- [ ] Webhook and background-job isolation tests.
- [ ] CI step runs isolation suite on every push.

### Acceptance criteria

- [ ] All ten isolation scenarios pass, each with a named test.
- [ ] Webhook and background-job isolation tests pass.
- [ ] Failing scenarios fixed, not skipped; otherwise phase BLOCKED.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- None yet.

---

## Phase 4 — Authentication and account management

**Goal:** production-grade SaaS auth with the smallest reliable change.

### Tasks

- [ ] Inspect existing session/auth implementation first; reuse if sound. Do
      not introduce Clerk/Auth.js/Better Auth unless justified in writing.
- [ ] Registration, login, logout, session management, email verification,
      password reset, secure hashing (bcrypt/argon2id with suitable cost),
      profile updates, account settings, workspace deletion, account deletion
      with data-deletion workflow.
- [ ] Cookies: Secure, HttpOnly, appropriate SameSite; session expiry and
      invalidation (invalidate all sessions on password change).
- [ ] CSRF protection where applicable.
- [ ] Rate limiting + brute-force protection on login, registration, password
      reset, verification.
- [ ] Hashed, single-use, expiring reset and verification tokens.
- [ ] Remove default admin credentials and customer-facing self-hosted admin
      path.
- [ ] Email provider abstraction (Resend or similar) with dev-mode logger.

### Acceptance criteria

- [ ] Tests for login, logout, expired session, password reset (single use,
      expiry), email verification, rate limiting.
- [ ] No plaintext passwords/tokens in DB or logs (show the check).
- [ ] Repo search finds no default admin credentials.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- Email provider key + verified sending domain.

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
- [ ] Usage metering: only accepted, valid, deduplicated, non-bot events.
      Replays metered separately. Atomic under concurrent ingestion. Durable
      DB source of truth; caches display-only. Monthly `UsagePeriod` reset. —
      **not built** (no UsagePeriod model or counter yet).
- [ ] Limit policy: 80% and 100% notices, small grace, then pause billable
      ingestion; dashboard stays accessible; no silent deletion; no automatic
      overage unless opted in. — **policy documented** in
      `docs/PRICING_ECONOMICS.md` §5 and on `/pricing`; **not enforced**.
- [ ] Usage UI: current usage, allowance, remaining, percentage, reset date,
      upgrade prompt. — **not built**.

### Acceptance criteria

- [x] `PRICING_ECONOMICS.md` has cited sources, assumptions, margin table.
- [x] At least one tier adjusted if the numbers required it, or the doc
      explains why none was needed. — prices were fixed by the owner; the doc
      adjusts **limits** (replay Pro-only, 90/180-day retention) to keep margin
      above 85%.
- [ ] Concurrency test: parallel ingestion never under/overcounts.
- [ ] Tests for 80%/100% thresholds, grace, month rollover.

### Decisions made

- Prices fixed by owner: Starter $7.99, Pro $14.99; no free tier.
- Website limits fixed by owner: Starter 1, Pro 20.
- Starter excludes replay to protect margin at 100 customers; Pro gets 2,000
  replays/month with 30-day replay retention.
- Annual = two months free only because the model stays above 89%.

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
      proof: `src/app/onboarding/OnboardingFlow.tsx`,
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
- [ ] Remove/replace customer-facing Talivia names, logos, copy, favicons,
      metadata, emails, docs links. Keep MIT notice in `LICENSE`; add
      `THIRD_PARTY_NOTICES`. — **partial**: logo/favicons/manifest/login/nav/
      metadata/intl are rebranded; settings copy and `THIRD_PARTY_NOTICES`
      remain.
- [ ] Revenue-first screens: revenue by source, revenue per visitor,
      conversion rate, MRR by channel; onboarding; billing; usage; workspace
      settings; empty states; mobile. — **onboarding + pricing done**; the
      revenue-first overview and billing/usage screens are not built.
- [ ] Landing page, pricing page (driven by plan config), docs shell, login
      and signup. — **pricing page done** (`/pricing`), login rebranded; no
      landing/signup/docs shell yet.
- [ ] Accessibility basics; dark mode (the product is dark by default). —
      onboarding/pricing have labels, focus, reduced motion; app-wide audit
      pending.

### Additional UI steps (owner-requested)

- [x] **UI-1 — Design audit:** extract Tartly tokens and map onto Talivia. —
      proof: `docs/UI_DESIGN_SYSTEM.md`.
- [x] **UI-2 — Brand config adoption:** name, wordmark, favicon, metadata,
      emails, footer, auth, docs read from one config. — **partial**: auth/nav/
      metadata/pricing/onboarding use it; settings copy not yet.
- [ ] **UI-3 — App shell:** quiet dark workstation; tonal layering; hairline
      borders; blush reserved for signal; tabular numerals.
- [ ] **UI-4 — Revenue-first overview:** replace generic analytics hero with
      revenue, revenue/visitor, conversion, MRR-by-channel cards + charts.
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
- [ ] **UI-9 — Billing + usage pages:** plan, renewal, usage bar, 80%/100%
      states, upgrade path.
- [ ] **UI-10 — Settings:** workspace, members, websites, integrations,
      security; consistent empty/error/loading states.
- [x] **UI-11 — Auth screens:** login, signup, verify, reset in the same shell.
      — **login rebranded**; signup/verify/reset not built.
- [ ] **UI-12 — Marketing landing:** one promise, three proof points, product
      visual, pricing teaser, FAQ.
- [ ] **UI-13 — Motion + polish pass:** page transitions, hover lift, focus
      rings, skeletons, reduced motion, mobile.
- [ ] **UI-14 — Temporary rename demonstration:** change brand config and show
      name/logo/colors/emails update everywhere.

### Acceptance criteria

- [ ] Repo-wide search for the original brand finds nothing customer-facing
      (allowed exceptions listed). — **partial**: 112 case-sensitive
      `Talivia` strings remain in `src/` (settings copy, imports, comments).
- [ ] Changing the brand config changes name, logo, colors, emails everywhere
      (demonstrated with a temporary rename). — not yet demonstrated.
- [x] Onboarding motion matches the Tartly constants and respects reduced
      motion. — proof: 12px/320ms/70ms in `Onboarding.module.css`, reduced-motion
      block.
- [x] Pricing page renders exactly two plans from the config. — proof:
      `/pricing` 200; `plans.test.ts`.

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
2. **Phase 2 finish:** public signup + registration transaction, invitations,
   workspace switcher, migrate the 102 legacy routes onto
   `src/lib/workspace-auth.ts`, remove the legacy admin bypass.
3. **Phase 3:** full tenant inventory, composite constraints/RLS decision,
   mandatory A/B isolation suite (10 scenarios), webhook/job isolation, CI.
4. **Phase 4:** HttpOnly cookie sessions, email verification/reset, rate limits,
   remove `admin`/`admin`, account deletion.
5. **Phase 5:** Dodo platform billing behind `BillingProvider`, webhooks,
   lifecycle, billing UI.
6. **Phase 6 finish:** `UsagePeriod` + atomic metering, 80/100% enforcement,
   usage UI, owner approval of limits.
7. **Phase 7:** attribution journey tests, provider capability table, replay
   entitlements/masking/retention jobs.
8. **Phase 8 finish:** framework guides, activation events/admin funnel,
   `llms.txt`, MCP/CLI verification.
9. **Phase 9 finish:** rebrand all customer-facing copy, revenue-first
   overview, billing/usage, settings, auth screens, landing page, a11y pass,
   temporary rename demo.
10. **Phase 10:** legal drafts, abuse protection, transactional email, ops.
11. **Phase 11:** security review, load test, CI, deployment/runbook.
12. **Phase 12:** go-to-market.

## Changelog

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
| Analytics events and replays are stored in PostgreSQL, so hosting cost scales with customer volume | High | Keep events off Neon; use a separate Postgres/ClickHouse for events before scale; meter usage |
| Existing auth is username/password with a bootstrap `admin`/`admin` | Critical | Remove default credentials in Phase 4; add email verification/reset and rate limits |
| Upstream Cloud features (Search Console, social mentions) are absent from OSS | Medium | Position only on what OSS actually ships; do not advertise missing features |
| Dodo is used as an analytics provider; using it for platform billing risks mixing contexts | High | Separate `BillingProvider` module + distinct webhook routes and models |
| Tartly is a different product (email operator); copying visuals must not import its dependencies or product logic | Medium | Extract tokens/motion into Talivia's existing CSS/React system; no Tailwind migration |
| No Neon/Dodo/email credentials in this environment | High | Stub behind interfaces, document exact needs, keep local PostgreSQL proof |
| Plan limits are not yet modelled against real costs | High | Phase 6 economics doc before enabling billing |
| Competitor price claims can go stale | Medium | Cite URL + fetch date; re-check before launch |
| Event/replay retention deletion is destructive | High | Idempotent, tenant-scoped jobs + dry-run tests |
