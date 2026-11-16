# Tartly documentation map

This page is the index of record. It exists because the same question — "is it
ready?" — used to be answered by four different documents that drifted apart.
When two documents disagree, the **canonical** document in this table wins.

## Canonical sources

| Question                                                         | Canonical document                                    | Notes                                                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| What is left before we can charge customers?                     | `docs/PRODUCTION_READINESS.md`                        | The only forward-looking readiness plan. Gate IDs R1–R7, phases PR-0–PR-6.                                 |
| What happened, when, with what proof?                            | `docs/PHASES.md`                                      | Append-only history. Not a plan.                                                                           |
| Is a single feature allowed to merge?                            | `docs/ENGINEERING_STANDARDS.md`                       | Per-feature gate plus the production release gate.                                                         |
| Which isolation and privacy controls exist, and are they proven? | `docs/production/LEAK_REGISTER.md`                    | One row per leak class, with the enforcing file and the test.                                              |
| What do we do when production breaks?                            | `docs/RUNBOOK.md`                                     | Incident steps, rollback, alert thresholds.                                                                |
| How are backups taken and restored?                              | `docs/BACKUP_AND_RECOVERY.md`                         | Includes the restore-drill procedure.                                                                      |
| How is the product deployed?                                     | `docs/CI_CD.md`                                       | Pipeline, invariants, rollback.                                                                            |
| What are the plans, prices, and limits?                          | `src/lib/plans.ts`                                    | Code is the source. `docs/PRICING_ECONOMICS.md` renders a generated block that `pnpm docs:check` verifies. |
| How is billing wired?                                            | `docs/PLATFORM_BILLING.md`                            | Platform billing (context A). Analytics integrations are separate.                                         |
| How is the app structured?                                       | `docs/ARCHITECTURE.md`, `docs/TENANCY.md`             | Routing-only `src/app`, domain modules, tenant scoping.                                                    |
| What is the design language?                                     | `docs/UI_DESIGN_SYSTEM.md`, `docs/ONBOARDING_SPEC.md` | Binding for new screens.                                                                                   |
| What does the tracker contract look like?                        | `docs/INSTALL_FIRST_PARTY.md`, `/docs/install`        | Public tracker reference lives in the app.                                                                 |

## Historical and point-in-time documents

These are kept for provenance. They are **not** current status and must not be
cited as proof of a live claim:

- `docs/autonomous-engineering/` — session reports, reviews, and the retired
  readiness snapshot. The snapshot now redirects here.
- `docs/PRODUCTION_READINESS_AUDIT.md` — the 2026-11-06 20-point audit snapshot.
- `docs/product-audit/` — dated audits (feature inventory, monetization,
  technical debt). Useful findings; stale counts by design.
- `docs/market-intelligence/`, `docs/gtm/` — research and go-to-market material.

## Rules for writing docs

1. A number that exists in code (price, limit, retention window, page count) is
   never restated by hand in a document that must stay true. Put it in a
   generated block (`pnpm docs:check`) or link to the code.
2. A claim of "works", "verified", or "live" needs a command, a stored row, or a
   captured artefact. Otherwise write **UNVERIFIED** and name the missing
   credential or environment.
3. New readiness work goes into `docs/PRODUCTION_READINESS.md` with a gate ID.
   Proof goes into `docs/PHASES.md`. Nothing is "done" because it renders.
