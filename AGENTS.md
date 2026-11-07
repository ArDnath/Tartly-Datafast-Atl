<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: Tartly (working brand name)

Fork of <https://github.com/talivia-group/talivia> (MIT). We are turning the
self-hosted Talivia analytics product into a hosted, multi-tenant,
revenue-attribution analytics micro-SaaS on Neon PostgreSQL.

## Business goal

Target customers: indie hackers, solo founders, micro-SaaS builders, AI SaaS
founders, small dev teams, and small agencies.

Positioning: **"Affordable revenue analytics for developers and indie SaaS
founders."**

Promise: connect your site, connect your payments, see which channels make
money. Launch quickly, undercut Talivia Cloud and DataFast on price, keep a
healthy gross margin.

## Commercial model (fixed by the owner)

There are exactly **two plans. No free tier. Do not invent a third plan.**

| Plan | Monthly | Websites | Positioning |
| --- | --- | --- | --- |
| **Starter** | **$7.99/mo** | **1** | Solo founder getting their first revenue signal |
| **Pro** | **$14.99/mo** | **up to 20** | Indie SaaS, small team, small agency |

Annual pricing may be offered at two months free only if
`docs/PRICING_ECONOMICS.md` proves the margin works. All plan data lives in one
config module (`src/lib/plans.ts`); no plan limit may be hardcoded in a
component.

## Non-negotiable rules

1. **VERIFY BEFORE ASSUMING.** Read the actual code, lockfile, and schema. Do
   not trust the README.
2. **PRESERVE the analytics engine:** tracker script, ingestion, session
   replay, first/last-touch attribution, payment integrations. Do not rewrite
   working functionality. Change it only for a verified bug, a tenant-isolation
   need, or a measurable commercial reason.
3. **DO NOT upgrade or replace technologies out of preference.** Keep versions
   unless there is a documented reason.
4. **MODULAR MONOLITH.** No microservices. No new infrastructure unless
   justified in writing with cost and complexity trade-offs.
5. **Neon PostgreSQL is the primary relational database** (users, workspaces,
   memberships, websites, billing, usage, audit logs). High-volume events and
   session replay stay in PostgreSQL for now (this fork has no ClickHouse
   deployment) and are isolated by `website_id`; never put raw replay payloads
   in the relational tenant tables.
6. **TENANT ISOLATION is the top security requirement.** Every tenant-owned
   read, write, update, and delete is scoped by workspace and authorized
   centrally. A cross-tenant leak is a critical failure. Frontend hiding is
   never security.
7. **Two separate payment contexts, never mixed:**
   (A) platform billing: we charge our customers (Dodo Payments);
   (B) analytics integrations: customers connect Stripe, Dodo, Lemon Squeezy,
       Polar, Yolfi, etc. so we can measure *their* revenue.
   The existing Dodo code in this fork is an **analytics integration**, not
   platform billing. Do not reuse it for plan charges.
8. **SECRETS:** never hardcode, never commit, never expose to browser code.
   Provider credentials are encrypted at rest. Secrets never appear in API
   responses or logs.
9. **LICENSE and BRAND:** keep the original MIT LICENSE and copyright notice
   intact. Check for non-MIT directories, trademarked assets, and dependency
   licenses. Remove Talivia branding from customer-facing UI. Never imply
   affiliation.
10. **CENTRALIZE branding** (name, logo, colors, domain, emails) in one config
    file (`src/lib/brand.ts`).
11. **CENTRALIZE plans and entitlements** in one config. Never hardcode plan
    limits in components.
12. **NO FABRICATION.** Competitor prices, costs, and statistics must come from
    sources actually fetched, with URL and date. If unverified, label
    `UNVERIFIED`. Do not claim something works unless it was run.
13. **IF BLOCKED** (no credentials, no web access, service unavailable): stub
    the dependency behind an interface, document exactly what is needed from
    the human, and continue with the rest of the phase. Never silently skip
    work.
14. **KEEP THE BUILD GREEN.** `pnpm gate` (format check, lint, typecheck, full
    tests, production build) must pass before every merge. Commit at the end of
    every phase with a clear message.
15. **NO DARK PATTERNS.** No fake invoices, invented statuses, fake
    testimonials, or fabricated customer counts.

## Mandatory skills and per-feature gate (non-negotiable)

Two repository skills are binding on every change, not optional reading:

- `.opencode/skills/production-backend-readiness/SKILL.md`
- `.opencode/skills/high-scale-low-cost-deployment/SKILL.md`

`docs/ENGINEERING_STANDARDS.md` converts them into the exact per-feature
checklist. Before starting a feature, load both skills. While building, tick the
gate in `docs/ENGINEERING_STANDARDS.md` (or the PR description). A feature is
not complete until every applicable box is ticked with evidence, and an
inapplicable box is ticked with `N/A: <reason>`.

Required loop for every feature or phase slice:

1. Read `docs/PHASES.md`, `docs/ENGINEERING_STANDARDS.md`, and the owning module.
2. Branch from `main` as `feature/<phase>-<slug>`.
3. Build code and tests together; keep tenant isolation and validation first.
4. Run `pnpm gate`; fix all failures.
5. Push, open a pull request, wait for CI, merge, delete the branch.
6. Update `docs/PHASES.md` with proof, caveats, and the next step.
7. Continue the loop. Do not stop after one feature.

External credentials or services that are unavailable never stop the loop:
stub behind the existing interface, label the item **UNVERIFIED**, document the
exact human action, and continue with the rest of the phase.

## UI mandate

Tartly inherits its visual language and onboarding motion from the sibling
Tartly repository (`../tartly`, the AI email client that seeded the design):

- near-black canvas, raised tonal cards, hairline borders, one warm blush
  signal accent, flat-by-default surfaces with state-driven lift;
- Inter throughout, small dense labels, tabular numerals for figures;
- a full-height, centered onboarding canvas (440 px content column) with
  logo → title → subtitle → form;
- directional slide + fade between steps (12 px offset, 320 ms ease-in-out,
  70 ms stagger), honouring `prefers-reduced-motion`;
- a short welcome moment before the first step.

The complete extraction and adaptation is in `docs/UI_DESIGN_SYSTEM.md`; the
flow specification is in `docs/ONBOARDING_SPEC.md`. Do not create a generic
Tailwind/shadcn dashboard that ignores the existing Talivia component system.

## Progress tracking (mandatory)

Maintain `docs/PHASES.md` at all times. Update it at the start and end of every
work session. Read it first in every new session to know where the project
stands.

## Working style

- Make small, reviewable commits.
- Write tests alongside features, not afterwards.
- Explain important trade-offs briefly in the relevant doc. Do not write essays.
- Prefer the smallest reliable solution compatible with the existing repo.
- Do not add auth frameworks, ORMs, queues, or caches unless justified.
- Use `pnpm` (the lockfile is `pnpm-lock.yaml`). Do not introduce npm/yarn.
