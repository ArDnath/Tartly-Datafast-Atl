# Production readiness program

- **Status date:** 2026-11-17
- **Production revision:** `2e88ca5ab47f61bca76f0f92e874033b53bf113e`
- **Verdict:** **NOT READY TO CHARGE CUSTOMERS.** The product is deployed and
  the core tracking path is proven end to end; gates R2–R7 below are open.
- **This is the only forward-looking readiness plan.** `docs/PHASES.md` is the
  historical record; `docs/LAUNCH_CHECKLIST.md` is the derived sign-off sheet;
  `docs/production/LEAK_REGISTER.md` holds the isolation controls.

Status vocabulary (used everywhere, no other words):

| Value          | Meaning                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| **VERIFIED**   | A command, stored row, or captured artefact proves it, with a date.          |
| **UNVERIFIED** | Implemented and tested in isolation, but not proven in the real environment. |
| **BLOCKED**    | Cannot proceed without a credential, a human action, or a decision.          |
| **N/A**        | Does not apply at this stage, with a one-line reason and a trigger.          |

## 1. Definition of production ready

Production ready means all seven release gates are **VERIFIED**. A green build
is not a gate; it is a precondition.

| Gate | Name              | Pass condition (evidence, not opinion)                                                                                                                           |
| ---- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1   | Code and pipeline | `pnpm gate` green on `main`; CI green; every open dependency update can pass CI; no red deploy on the current head.                                              |
| R2   | Tenant isolation  | A live A/B probe shows 401/403/404 and zero data for every cross-workspace and cross-website attempt; leak register rows L1–L5 are VERIFIED.                     |
| R3   | Data lifecycle    | Seeded old rows are actually deleted by the analytics retention job; account and website deletion purge every store; a restore from an off-host backup succeeds. |
| R4   | Money             | A real Dodo test-mode checkout, signed webhook, entitlement unlock, portal visit, and cancellation are recorded; a replayed webhook changes nothing.             |
| R5   | Trust             | Verification, reset, invitation, usage, and dunning emails arrive from the verified domain; Google OAuth completes; legal pages are reviewed.                    |
| R6   | Operations        | Alerts fire for downtime, disk, worker lag, cron failure, and failed deploy; an on-call contact and a rollback path exist and were exercised.                    |
| R7   | Scale             | A deployed load test records p50/p95/p99, error rate, DB/queue saturation, and cost per million events; retention still runs under that load.                    |

## 2. Phase plan

Each phase has one exit gate. Work that does not move a gate does not belong in
the phase.

| Phase | Goal                         | Gate   | Owner               | Status                            |
| ----- | ---------------------------- | ------ | ------------------- | --------------------------------- |
| PR-0  | Truth, hygiene, green CI     | R1     | engineering         | COMPLETE — R1 VERIFIED            |
| PR-1  | Isolation and data lifecycle | R2, R3 | engineering + VPS   | IN PROGRESS (VPS access granted)  |
| PR-2  | Money path                   | R4     | human + engineering | BLOCKED (Dodo credentials)        |
| PR-3  | Trust path                   | R5     | human + engineering | BLOCKED (Resend, Google, counsel) |
| PR-4  | Operational floor            | R6     | engineering + human | NOT STARTED                       |
| PR-5  | Scale proof                  | R7     | human (load window) | BLOCKED                           |
| PR-6  | Launch review                | R1–R7  | owner               | NOT STARTED                       |

### PR-0 — Truth, hygiene, green CI (gate R1)

| Task                                                               | Status   | Exit evidence                                                               |
| ------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| One readiness plan, one docs index, one leak register              | VERIFIED | this file, `docs/README.md`, leak register                                  |
| Plan facts generated, not restated                                 | VERIFIED | `pnpm docs:check` + `src/lib/plan-facts.test.ts`                            |
| Stale website limits corrected (Pro = 20)                          | VERIFIED | `pnpm docs:check`; `src/lib/plan-facts.test.ts` rejects any other limit     |
| Pin the formatter so dependency PRs can pass                       | VERIFIED | `@biomejs/biome` = `2.6.6`; Dependabot ignores Biome; #58/#59/#60/#62 green |
| Production build has no external network dependency                | VERIFIED | Inter is bundled in `src/fonts/`; `next/font/local`; build passes           |
| Deploy-lock recovery documented for a cancelled build              | VERIFIED | `docs/RUNBOOK.md` → "another deploy is already running"                     |
| Deploy script survives rollback revisions (no stdin capture)       | VERIFIED | `scripts/deploy-script.test.mjs`; rollback run 43936817147                  |
| Current `main` deploy run is green (not a lock-contention failure) | VERIFIED | run 43934092294 for `2e88ca5`; readiness returns that SHA                   |

### PR-1 — Isolation and data lifecycle (gates R2, R3)

| Task                                                                   | Status     | Exit evidence                                                       |
| ---------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| Live cross-workspace probe on production (read, write, delete, export) | BLOCKED    | 401/403/404 responses and empty bodies recorded in `docs/PHASES.md` |
| Analytics retention job with seeded old rows (ClickHouse)              | BLOCKED    | job log with per-table deleted counts, seeded rows gone             |
| Operational retention job (webhook payloads, audit IPs, billing rows)  | BLOCKED    | job log with counts; a preserved Stripe invoice row still present   |
| Website deletion purges PostgreSQL and ClickHouse                      | UNVERIFIED | deletion request + per-table count of 0                             |
| Account deletion purges every store                                    | UNVERIFIED | export-then-delete flow + login fails afterwards                    |
| Share links expire after 30 days                                       | UNVERIFIED | expired token returns 404; active token returns 200                 |
| Restore from an off-host backup                                        | BLOCKED    | restored dump counts match source; replayed into a clean container  |

### PR-2 — Money path (gate R4)

| Task                                                          | Status  | Exit evidence                                                               |
| ------------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| Dodo test-mode checkout for Starter and Pro (monthly, annual) | BLOCKED | checkout session IDs and paid workspace in the dashboard                    |
| Signed webhook unlocks the workspace and sets the period      | BLOCKED | `platform_subscription` row + `/api/billing/access` `requiresPayment:false` |
| Replayed and out-of-order webhooks are idempotent             | BLOCKED | second delivery returns 200 and changes no row                              |
| Customer portal opens and shows the real subscription         | BLOCKED | portal URL opens for the test customer                                      |
| Cancel at period end keeps access until the period ends       | BLOCKED | access true before the end date, paywall after                              |
| Failed payment produces a dunning email and a paused state    | BLOCKED | provider event → email → entitlement state                                  |

### PR-3 — Trust path (gate R5)

| Task                                                            | Status     | Exit evidence                                                             |
| --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| Resend delivers verification, reset, invitation, usage, dunning | BLOCKED    | inbox captures from the verified domain                                   |
| Google OAuth completes sign-in and creates a session            | BLOCKED    | session cookie + `/api/me` identity                                       |
| Security headers verified live (HSTS, CSP, nosniff, frame)      | UNVERIFIED | `curl -I` output recorded                                                 |
| Licence risk closed: `ua-parser-js` is AGPL-3.0-or-later        | **OPEN**   | replaced with a permissive parser, or a commercial licence, before launch |
| Legal pages reviewed by counsel                                 | BLOCKED    | written sign-off; subprocessor list confirmed                             |

### PR-4 — Operational floor (gate R6)

Nothing in this phase exists today; it is the largest unmitigated risk.

| Task                                                     | Status      | Exit evidence                                   |
| -------------------------------------------------------- | ----------- | ----------------------------------------------- |
| External uptime check on `/api/health/ready` every 60 s  | NOT STARTED | a deliberate failure pages the owner            |
| Disk alert at 75% and 85%                                | NOT STARTED | test notification recorded                      |
| Kafka worker heartbeat / consumer lag alert              | NOT STARTED | forced pause produces an alert                  |
| Cron completion alert (daily jobs silent for 26 h)       | NOT STARTED | skipped run produces an alert                   |
| Failed deploy alert                                      | NOT STARTED | failed workflow notification received           |
| Encrypted off-host backup copy (S3/B2, not the same VPS) | BLOCKED     | object listing + checksum; restore drill passes |
| Documented on-call contact and escalation                | NOT STARTED | `docs/RUNBOOK.md` updated with a named contact  |

### PR-5 — Scale proof (gate R7)

| Task                                                             | Status  | Exit evidence                                            |
| ---------------------------------------------------------------- | ------- | -------------------------------------------------------- |
| Load window agreed with the owner (avoid real-customer impact)   | BLOCKED | written window and rollback plan                         |
| Sustained ingest test with p50/p95/p99 and error rate            | BLOCKED | `docs/LOAD_TEST.md` entry with the raw output            |
| Saturation observed: CPU, memory, disk IOPS, DB connections, lag | BLOCKED | captured metrics for the same window                     |
| Cost per million events derived from the measured run            | BLOCKED | updated `docs/PRICING_ECONOMICS.md` with the real number |
| Retention job still completes under that load                    | BLOCKED | job log for the same period                              |

### PR-6 — Launch review (all gates)

| Task                                                   | Status      | Exit evidence                                   |
| ------------------------------------------------------ | ----------- | ----------------------------------------------- |
| Every gate R1–R7 has a dated VERIFIED row below        | NOT STARTED | this file                                       |
| `docs/LAUNCH_CHECKLIST.md` signed off by the owner     | NOT STARTED | checklist committed                             |
| Pricing and competitor claims re-fetched on launch day | NOT STARTED | sources with URL + date                         |
| Support inbox and status page live                     | NOT STARTED | addresses published on `/support` and `/status` |
| Rollback rehearsal on the current host                 | NOT STARTED | previous SHA served, then forward-restored      |

## 3. Evidence ledger

Append only. One row per proof. Never overwrite a VERIFIED row; add a new one.

`core` rows record that the product works; they support R1 but do not close a
release gate on their own.

| Date       | Gate | Evidence                                                                                           | Result                                             |
| ---------- | ---- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 2026-11-16 | R1   | `pnpm gate` on `8068012` (235 files, 1,156 tests, 78 pages)                                        | PASS — `/tmp/opencode/gate-rate-limit.log`         |
| 2026-11-16 | R1   | `/api/health/ready` returned `8068012`, `database:"up"`                                            | VERIFIED                                           |
| 2026-11-16 | R1   | 9 public routes returned 200/307 (health, `/`, pricing, docs, login, signup, app, robots, sitemap) | VERIFIED                                           |
| 2026-11-16 | R1   | `/pricing` rendered "1 website" / "20 websites"                                                    | VERIFIED — matches `src/lib/plans.ts`              |
| 2026-11-16 | core | Firefox → production tracker → ClickHouse; stats API 1/1/1; test rows deleted                      | VERIFIED — see `docs/PHASES.md` 2026-11-16         |
| 2026-11-16 | R3   | Six ClickHouse global TTLs applied and present in `system.tables`                                  | PARTIAL — tenant-scoped job not run                |
| 2026-11-16 | R6   | No alerting configuration exists (no uptime check, no error tracker, no disk alert)                | FAIL — open                                        |
| 2026-11-17 | R1   | `pnpm gate` on `91abed0` (236 files, 1,160 tests, 78 pages)                                        | PASS — `/tmp/opencode/gate-deploy-script-file.log` |
| 2026-11-17 | R1   | CI green on `main` `2e88ca5` (run 43932610094)                                                     | VERIFIED                                           |
| 2026-11-17 | R1   | Deploy run 43934092294 for `2e88ca5`; `/api/health/ready` returns that SHA; 8/8 smoke routes 200   | VERIFIED                                           |
| 2026-11-17 | R1   | Rollback run 43936817147 served `577c7a0`; forward run 43938446979 restored `2e88ca5`              | VERIFIED                                           |
| 2026-11-17 | R1   | Deploy-script stdin capture found (runs 43913859561, 43927454606) and fixed (#68, #69)             | VERIFIED — regression test in gate                 |
| 2026-11-17 | core | `docker builder prune` reclaimed 31.11 GB; host disk 76% → 46%                                     | VERIFIED                                           |
| 2026-11-17 | R1   | Dependabot excludes `@biomejs/biome`; #61 closed (its only failure was the 2.6.7 Markdown format)  | VERIFIED — policy in `.github/dependabot.yml`      |
| 2026-11-17 | R1   | Deploy run for `f85ab11` green; `/api/health/ready` returns `f85ab11`                              | VERIFIED — R1 closed                               |

## 4. Ownership and human actions

Everything below needs a human. Engineering work continues around it; none of
these may be silently skipped.

| Gate | What we need                                                        | Where the steps live                          |
| ---- | ------------------------------------------------------------------- | --------------------------------------------- |
| R2   | SSH access to the VPS (`/opt/tartly`) or a run by the operator      | `docs/RUNBOOK.md`                             |
| R3   | Off-host object storage (S3/B2) + credentials                       | `docs/BACKUP_AND_RECOVERY.md`                 |
| R4   | `DODO_PAYMENTS_API_KEY`, webhook secret, product IDs, test customer | `docs/PLATFORM_BILLING.md`                    |
| R5   | `RESEND_API_KEY` + verified domain; Google OAuth client; counsel    | `docs/ENVIRONMENT.md`, `docs/GOOGLE_OAUTH.md` |
| R6   | A notification channel (email/webhook) and a named on-call contact  | this file                                     |
| R7   | An agreed load window and permission to generate traffic on the VPS | this file                                     |

## 5. Operational floor (gate R6 targets)

These are **initial targets**, not measurements. PR-5 replaces them with
observed numbers; until then they are the alert thresholds we build against.

| Signal                       | Target / threshold                        | Alert after         |
| ---------------------------- | ----------------------------------------- | ------------------- |
| App + collector availability | 99.5% monthly                             | 2 failed checks     |
| Collector `POST /api/send`   | p95 < 300 ms; 5xx < 1%                    | 5 min               |
| Dashboard stats API          | p95 < 800 ms                              | 10 min              |
| Event freshness              | event visible in dashboard < 60 s p95     | consumer lag > 60 s |
| Worker / cron health         | heartbeat fresh; each daily job completes | 5 min / 26 h        |
| Host disk                    | < 75% normal, < 85% warning               | immediate           |
| Backup freshness             | newest backup < 7 h old                   | 8 h                 |
| Deploy                       | every `main` deploy succeeds              | immediate           |

A signal without an alert is not monitored. A target without a recorded
measurement is a guess; label it as one.

## 6. Release ritual (every deploy)

1. `pnpm gate` green locally; CI green on the branch.
2. Migrations reviewed separately from behaviour changes.
3. A pre-deploy PostgreSQL dump exists and its timestamp is recorded.
4. The rollback SHA is recorded in `docs/PHASES.md` before the deploy starts.
5. Deploy; verify `/api/health/ready` returns the exact target SHA.
6. Run the public smoke (`scripts/deploy-smoke.mjs`).
7. Update the evidence ledger above if a gate changed state.
8. Record the outcome in `docs/PHASES.md` (deployed SHA, run ID, caveats).

## 7. Change control

- **Feature work:** `docs/ENGINEERING_STANDARDS.md` per-feature gate.
- **Readiness work:** add or move exactly one gate row here; proof goes in the
  ledger and in `docs/PHASES.md`.
- **Plan or price changes:** change `src/lib/plans.ts`, then run
  `pnpm docs:check --write` and commit the regenerated block.
- **New isolation control:** add a row to the leak register with the enforcing
  file and the test that fails if the control is removed.
- **Never** mark a gate VERIFIED from a unit test alone when the gate is about
  the real environment.

## 8. Status history

| Date       | Change                                                            |
| ---------- | ----------------------------------------------------------------- |
| 2026-11-16 | Program created; supersedes four overlapping readiness documents. |
| 2026-11-17 | R1 pipeline evidence recorded; deploy stdin bug found and fixed.  |
