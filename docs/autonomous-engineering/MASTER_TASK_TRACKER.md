# Master task tracker

Status values: `todo`, `in_progress`, `review`, `blocked`, `done`.
Priority: P0 (core), P1 (monetization), P2, P3.
Every `done` row needs an evidence link (log line, test output, review file).

| ID   | Pri | Owner | Task                                                        | Depends on | Acceptance                                                              | Status      | Evidence |
| ---- | --- | ----- | ----------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- | ----------- | -------- |
| W0-1 | P0  | S1    | Existing app audit (architecture, backend, DB, flows, debt) | —          | `docs/product-audit/*` written from real code with file refs            | in_progress |          |
| W0-2 | P0  | S2    | Design language extraction verified against code             | —          | `docs/product-audit/DESIGN_LANGUAGE.md` + token diff vs UI doc          | in_progress |          |
| W0-3 | P0  | S3    | Reference inventory + license classes + quality scores      | —          | `docs/market-intelligence/REFERENCE_INVENTORY.md`, every repo classified | in_progress |          |
| W0-4 | P0  | S4    | Live product/traction/pricing research                       | —          | `docs/market-intelligence/*` with sourced, labelled claims              | in_progress |          |
| W0-5 | P0  | S5    | Privacy/legal research and data-flow map                     | W0-1       | `docs/security/*` with cited sources, legal questions flagged           | todo        |          |
| W1-1 | P0  | H-B   | Backend deep dive (ingestion→storage→aggregation)           | W0-3       | hop-by-hop comparison in `docs/architecture/HARVEST_BACKEND.md`         | todo        |          |
| W1-2 | P0  | H-T   | Tracker/SDK deep dive                                       | W0-3       | `docs/architecture/HARVEST_TRACKER.md`                                  | todo        |          |
| W1-3 | P0  | H-UX  | Onboarding/dashboard/upgrade UX deep dive                   | W0-2, W0-3 | `docs/architecture/HARVEST_UX.md`                                       | todo        |          |
| W1-4 | P0  | H-I   | Platform integration + server-side API deep dive            | W0-3       | `docs/architecture/HARVEST_INTEGRATE.md`                                | todo        |          |
| W1-5 | P0  | M     | MASTER_ARCHITECTURE + PORT_PLAN checkpoint                  | W1-1..4    | approved plan with one best approach per subsystem                      | todo        |          |
| W2-x | P0  | T1..T7| Transplant slices per PORT_PLAN                              | W1-5       | each slice green + reviewed                                              | todo        |          |
| W3-x | P0  | X1..X3| Harden, security audit, docs                                | W2         | `docs/security/*`, cost model, measured benchmarks                      | todo        |          |
| R    | P0  | R     | Independent journeys A–F + release sign-off                 | W2, W3     | `docs/autonomous-engineering/reviews/RELEASE_SIGNOFF.md`                | todo        |          |
