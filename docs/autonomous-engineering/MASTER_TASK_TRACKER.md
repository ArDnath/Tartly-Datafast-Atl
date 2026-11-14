# Master task tracker

Status values: `todo`, `in_progress`, `review`, `blocked`, `done`.
Priority: P0 (core), P1 (monetization), P2, P3.
Every `done` row needs an evidence link (log line, test output, review file).
Blocked rows map to `BLOCKED_TASKS.md`.

| ID   | Pri | Owner  | Task                                                        | Depends on | Acceptance                                                       | Status      | Evidence                                  |
| ---- | --- | ------ | ----------------------------------------------------------- | ---------- | ---------------------------------------------------------------- | ----------- | ----------------------------------------- |
| W0-1 | P0  | S1     | Existing app audit (architecture, backend, DB, flows, debt) | —          | `docs/product-audit/*` written from real code with file refs     | done        | S1 handoff; 6 files                       |
| W0-2 | P0  | S2     | Design language extraction verified against code            | —          | `docs/product-audit/DESIGN_LANGUAGE.md`                          | done        | S2 handoff; 908 lines                     |
| W0-3 | P0  | S3     | Reference inventory + license classes + quality scores      | —          | `docs/market-intelligence/REFERENCE_*.md`, every repo classified | done        | S3 handoff; 11 repos                      |
| W0-4 | P0  | S4     | Live product/traction/pricing research                      | —          | `docs/market-intelligence/*` with sourced, labelled claims       | done        | S4 handoff; 24 products                   |
| W0-5 | P0  | S5     | Privacy/legal research and data-flow map                    | W0-1       | `docs/security/*` with cited sources, legal questions flagged    | blocked     | B8: legal review; readiness references    |
| W1-1 | P0  | H-B    | Backend deep dive (ingestion→storage→aggregation)           | W0-3       | `docs/architecture/HARVEST_BACKEND.md`                           | done        | H-BACKEND handoff                         |
| W1-2 | P0  | H-T    | Tracker/SDK deep dive                                       | W0-3       | `docs/architecture/HARVEST_TRACKER.md`                           | done        | H-TRACKER handoff                         |
| W1-3 | P0  | H-UX   | Onboarding/dashboard/upgrade UX deep dive                   | W0-2, W0-3 | `docs/architecture/HARVEST_UX.md`                                | done        | H-UX handoff                              |
| W1-4 | P0  | H-I    | Platform integration + server-side API deep dive            | W0-3       | `docs/architecture/HARVEST_INTEGRATE.md`                         | blocked     | Not run; server API documented directly   |
| W1-5 | P0  | M      | MASTER_ARCHITECTURE + PORT_PLAN checkpoint                  | W1-1..3    | one best approach per subsystem                                  | done        | `MASTER_ARCHITECTURE.md`, `PORT_PLAN.md`  |
| T1-1 | P0  | T1     | Cookieless tracker (no cookies, tab session, server hash)   | W0-3       | tests + built size + legal copy                                  | done        | 28 tracker tests; 4.20 KB gzip            |
| T1-2 | P0  | T1     | Opt-in outbound-link and file-download events               | T1-1       | enabled/default-off/download precedence tests                    | done        | 3 tracker tests                           |
| T1-3 | P0  | T1     | Tracker reference docs + API examples                       | T1-2       | `/docs/install#tracker-reference` builds; docs tests pass        | done        | docs 24 tests                             |
| T1-4 | P0  | T1     | Consent-aware tracker mode (`data-consent`)                 | T1-1       | no event leaves the browser before consent; revoke stops sending | done        | consent + GPC tests                       |
| T1-5 | P0  | T1     | Server-side event API examples and contract                 | T1-1       | working example + collector no-token tests                       | done        | `/docs/install`; 12 collector tests       |
| T2-1 | P0  | T2     | Verify collector identity/privacy invariants after T1-1     | T1-1       | raw IP not logged/stored; cross-tenant tests green               | done        | live cookieless probe; handler tests      |
| T2-2 | P0  | T2     | Bound client event timestamps                               | T1-1       | old/future events rejected before reservation                    | done        | 2 collector tests                         |
| T3-1 | P0  | T3     | ClickHouse retention/deletion                               | T2-1       | tenant-scoped purges; TTL safety net                             | review      | 4 helper tests; live run blocked (B1)     |
| T5-1 | P0  | T5     | Metric definitions in the dashboard                         | T1-1       | every KPI explains itself                                        | done        | 2 tests; overview tooltips                |
| T6-1 | P0  | T6     | Honest pre-payment install state                            | T1-1       | no endless wait; paid path unchanged                             | done        | 2 verify tests                            |
| T6-2 | P0  | T6     | First run lands on the site                                 | T1-1       | `/app/{websiteId}?welcome=1` unless intent                       | done        | onboarding 59 tests                       |
| T7-1 | P1  | T7     | Session replay switch + Pro enforcement                     | T1-1       | enable requires Pro; disable always allowed                      | done        | website 5 tests; docs                     |
| T7-2 | P1  | T7     | Central Pro-feature checks                                  | T7-1       | API/export/client-reporting/journeys gated                       | blocked     | B11                                       |
| T4-1 | P0  | T4     | Event idempotency                                           | T2-1       | duplicate delivery counted once                                  | blocked     | B9                                        |
| W2-x | P0  | T2..T7 | Remaining transplant slices per PORT_PLAN                   | W1-5       | each slice green + reviewed                                      | in_progress | 10 slices landed; B9–B14 remain           |
| W3-x | P0  | X1..X3 | Harden, security audit, docs                                | W2         | `docs/security/*`, cost model, measured benchmarks               | in_progress | security review exists; cost/load blocked |
| R    | P0  | R      | Independent journeys A–F + release sign-off                 | W2, W3     | `docs/autonomous-engineering/reviews/RELEASE_SIGNOFF.md`         | blocked     | No independent reviewer/browser session   |

## Open decisions

- **Two plans only.** `AGENTS.md` fixes Starter $7.99 and Pro $14.99. The
  mission text permits more tiers, but the repository rule wins: do not invent
  a third plan. Pricing research may only tighten the existing two-plan model.
- **Pro website limit.** Aligned to the owner spec: 20, not 50.
- **Visitor rotation.** Monthly by default for attribution stability; day/week
  remain configurable. Unique visitors are unique per rotation window.
