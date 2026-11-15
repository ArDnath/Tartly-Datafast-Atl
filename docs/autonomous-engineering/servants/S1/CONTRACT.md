# S1 — Existing app audit (read-only)

## Objective

Produce an evidence-backed audit of the existing Tartly/revenuelens application at
`/home/ariyaman/Dev/fight/efforts/revenuelens` so the master can decide what to
harvest and what to build.

## Non-goals

- No code changes. No migrations. No running the app, tests, builds, or dev servers.
- Do not modify `.env*`. Do not read secret values (skip the right-hand side).
- Do not trust README or docs claims: verify against source.

## Owned write scope (only these files)

- `docs/product-audit/EXISTING_ARCHITECTURE.md`
- `docs/product-audit/CURRENT_FEATURE_INVENTORY.md`
- `docs/product-audit/DATABASE_AUDIT.md`
- `docs/product-audit/MONETIZATION_AUDIT.md`
- `docs/product-audit/TECHNICAL_DEBT.md`

## Read-only inputs

- `src/`, `prisma/`, `db/`, `package.json`, `docs/`, `openapi.yaml`, `.github/`
- `docs/PHASES.md`, `docs/ENGINEERING_STANDARDS.md` (context, not proof)

## Tasks

1. Trace the real runtime path: signup/login → workspace → website → snippet →
   collector (`/api/send` or equivalent) → queue/DB → aggregation → dashboard →
   billing entitlement. Cite file paths and line numbers.
2. Inventory every feature as `working` / `partial` / `UI-only` / `missing`.
   Include tracker capabilities, dashboard reports, attribution, payments
   integrations, onboarding, billing, admin, exports, API.
3. Database: list Prisma models, the tenant key on each tenant-owned table,
   indexes relevant to ingestion/query, migrations count, legacy tables.
4. Monetization: plans source of truth, entitlements, metering, checkout and
   webhook flow, and where a plan is enforced server-side.
5. Technical debt: top risks with file refs (not opinions). Include the
   tracker cookie/identity issue and any doc-vs-code mismatch you find.

## Acceptance criteria

- Every claim has a `path:line` or a command output reference.
- A "critical gaps" section ranked by revenue/security impact.
- Explicitly flag anything you could not verify as UNVERIFIED.

## Exit criteria

All five files exist, contain the required sections, and the tracker identity /
cookie behaviour is described exactly as implemented.

## Budget

One pass. If a repo area is too large, summarise with file refs instead of
guessing.
