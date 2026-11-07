# Engineering standards and mandatory delivery gate

This document is binding. It turns the two skills below into a repeatable,
auditable rule set for every change in this repository.

| Skill | Binding file | Use for |
| --- | --- | --- |
| Production backend readiness | `.opencode/skills/production-backend-readiness/SKILL.md` | every API, service, migration, webhook, job, auth/permission change, release |
| High-scale, low-cost deployment | `.opencode/skills/high-scale-low-cost-deployment/SKILL.md` | architecture, ingestion/query hot paths, caching, deployment, cost, load testing |

`AGENTS.md` declares these skills mandatory. A pull request is not ready to
merge until every applicable box in the gate below is ticked in the PR
description. A box that does not apply is ticked with a one-line reason
(`N/A: static marketing copy`). An unticked box is a blocker, not a comment.

## 1. The loop

For every feature, bug fix, or phase slice:

1. **Read** `docs/PHASES.md`, this file, and the owning feature module.
2. **Verify before assuming** — inspect the real code, schema, lockfile, and tests.
3. **Design** the smallest change that respects the existing architecture.
4. **Branch** from `main` as `feature/<phase>-<slug>`.
5. **Build** code and tests together.
6. **Tick the gate** in the PR description while working, not afterwards.
7. **Run** `pnpm gate` locally. Fix everything; never merge red.
8. **Push**, open a PR, wait for CI, squash/merge, delete the branch.
9. **Update** `docs/PHASES.md` (status, proof, caveats, next step).
10. **Repeat** the loop until the phase is complete and the next phase begins.

No feature is "done" because it renders. It is done when persistence,
authorization, validation, failure modes, tests, and docs are done.

## 2. Mandatory per-feature gate

Copy this block into every PR description and tick each line.

### Architecture and API

- [ ] Change is in the owning feature module; no business logic in route files.
- [ ] Route file is a thin adapter under `src/app`; handler lives in `features/<domain>/server`.
- [ ] Service/domain logic is independent of HTTP request/response objects.
- [ ] Persistence is in the owning `server/queries` repository, not in a handler.
- [ ] REST nouns, HTTP verbs, and status codes follow the shared API conventions.
- [ ] List endpoints paginate and return an empty array, never a 404.
- [ ] OpenAPI/machine-readable contract updated when a public API changes.

### Validation and data

- [ ] Request body, path, and query are validated with Zod before domain logic.
- [ ] Domain invariants are enforced again in the service/transaction layer.
- [ ] Inputs are normalized (trim, lowercase email, UTC dates).
- [ ] SQL is parameterized; no string-built queries.
- [ ] Migration is versioned SQL; no production schema auto-sync.
- [ ] Foreign keys, unique constraints, and check constraints exist where required.
- [ ] New filter/join/order columns are indexed; no full scan on a large table.
- [ ] N+1 queries are eliminated with joins/eager loading/batching.
- [ ] Transaction boundaries cover multi-row invariants; idempotency is explicit.

### Security and tenancy

- [ ] Every tenant read/write is scoped by workspace and website.
- [ ] BOLA/IDOR cannot be triggered by swapping an ID; unauthorized access returns 404/403.
- [ ] Authorization is centralized; no route relies on hidden UI.
- [ ] Suspended/deleted users and workspaces are rejected.
- [ ] CSRF protection applies to cookie-authenticated mutations.
- [ ] Rate limits apply to auth, ingestion, and abuse-prone endpoints.
- [ ] Secrets never appear in responses, logs, errors, or client bundles.
- [ ] Provider credentials remain encrypted at rest; webhook signatures are verified.
- [ ] Session/token comparisons use constant-time primitives where applicable.

### Reliability and operations

- [ ] Errors use the shared response shape; production leaks no stack or SQL detail.
- [ ] External calls have timeouts; retries are bounded and idempotent.
- [ ] Background jobs are idempotent, bounded, and safe to re-run.
- [ ] Heavy work is not on the synchronous hot path.
- [ ] Cache keys include tenant scope, have a TTL, and are invalidated on mutation.
- [ ] Structured log event added for new failure modes; no secret is logged.
- [ ] Health/readiness still reflects new critical dependencies.
- [ ] Graceful shutdown and in-flight work are considered for new workers.

### Scale and cost

- [ ] Hot path stays O(log N) or O(1); payloads stay small.
- [ ] Ingestion and replay remain bounded by plan entitlements and grace.
- [ ] New storage has a retention/deletion path.
- [ ] Query plan checked for new high-volume queries (`EXPLAIN ANALYZE` where relevant).
- [ ] Load-sensitive change has a load-test note or script update.
- [ ] The 1M-RPS checklist items that do not apply are recorded as staged, with a trigger.

### Tests and proof

- [ ] Unit tests cover domain rules and failure paths.
- [ ] Route/handler tests cover auth, validation, and tenant isolation.
- [ ] Integration test covers the real database path when SQL/constraints change.
- [ ] Regression test exists for the bug being fixed.
- [ ] New behavior is exercised, not only mocked.
- [ ] `pnpm gate` is green (format, lint, typecheck, tests, production build).
- [ ] Docs/PHASES proof updated with the exact command or evidence.
- [ ] External blockers are labelled **UNVERIFIED** with what the human must provide.

## 3. Review rules

- Two classes of change are always split: schema/migration changes and behavior changes.
- A PR over ~400 changed source lines must state why it cannot be split.
- Never delete or rewrite inherited analytics behavior without a verified bug, a
  tenant-isolation need, or a documented commercial reason.
- Never add a dependency, service, or infrastructure component without a written
  cost/complexity note in the PR and in the relevant doc.
- Never claim a live provider, browser, or load result that was not run. Mark it
  **UNVERIFIED** and name the missing credential or environment.
- Keep the MIT license and upstream attribution intact.

## 4. Scale staging (1M-RPS skill, applied honestly)

Tartly is a small multi-tenant SaaS, not a 1M-RPS edge fleet. The high-scale
skill is applied in stages so we do not buy complexity we cannot operate:

| Stage | Trigger | Required now |
| --- | --- | --- |
| Launch | current | indexes, bounded payloads, plan limits, retention, connection pooling, structured logs, health checks, idempotent webhooks |
| Growth | > 1k events/s sustained or p95 API > 500 ms | read replica routing, cache stampede guard, ingestion batching, PgBouncer, load-test baseline |
| Scale | > 50k events/s or multi-region | queue/buffer tier, partitioned event tables, edge rate limiting, horizontal workers |
| Extreme | > 250k events/s | sharded cache, compiled hot path, dedicated ingestion cluster |

Every stage entry must record the measured trigger. "We might need it" is not a
trigger.

## 5. Evidence format

`docs/PHASES.md` entries use this shape:

```text
- [x] Task — proof: <file> + <command> + <result/date>.
- [ ] Blocked task — **UNVERIFIED**: missing <credential/environment>; exact steps in <doc>.
```

No fabricated numbers. No "should work". No green check without a stored row,
passing test, or captured command output.
