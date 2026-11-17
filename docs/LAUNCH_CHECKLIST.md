# Launch checklist

This is the **sign-off sheet**, not the plan. It is derived from
`docs/PRODUCTION_READINESS.md`: each line maps to release gate R1–R7. If a line
here and a line there disagree, the program document wins.

A line is ticked only with a dated evidence row in the program's evidence
ledger. A line is unticked with **UNVERIFIED** or **BLOCKED** and the exact
human action.

- **Sign-off date:** _not signed_
- **Signed by:** _owner_
- **Production revision at sign-off:** _unset_

## R1 — Code and pipeline

- [x] `pnpm gate` green on `8068012` (2026-11-16).
- [x] Public surfaces return 200/307 and the health endpoint reports the
  deployed SHA (2026-11-16).
- [x] Formatter is pinned so dependency-update PRs pass CI (2026-11-17;
  `@biomejs/biome` `2.6.6`; #58/#59/#60/#62 green).
- [x] Latest `Deploy production` run for `main` is green (2026-11-17; run
  `43934092294` for `2e88ca5`; readiness returns that SHA).
- [x] Plans and limits are enforced server-side from one config module.

## R2 — Tenant isolation

- [x] Code + unit proof for workspace scoping (`docs/production/LEAK_REGISTER.md`
  L1–L4).
- [x] Live cross-workspace probe on production: read, write, delete, export
  (2026-11-17; 11 attempts, all 401, B data intact).
- [x] Expired share link returns nothing (2026-11-17; active 200, expired 404).

## R3 — Data lifecycle

- [x] Retention jobs and TTLs exist and are unit-tested.
- [x] Tenant-scoped analytics retention ran against seeded old rows
  (2026-11-17; PG+CH old rows deleted, fresh kept).
- [x] Website deletion purges PostgreSQL and ClickHouse (2026-11-17; all
  stores 0).
- [x] Account deletion purges every store (2026-11-17; tombstoned, login 401,
  analytics purged).
- [ ] Restore from an encrypted off-host backup succeeded.

## R4 — Money

- [x] Checkout, webhook, entitlement, portal, and cancellation code is tested.
- [ ] Dodo test-mode checkout for both plans and both intervals.
- [ ] Signed webhook unlocks the workspace; a replay changes nothing.
- [ ] Portal shows the real subscription; cancellation keeps access until the
  period ends.

## R5 — Trust

- [x] Security headers configured; CSP/HSTS in production.
- [ ] Resend delivers every transactional email from the verified domain.
- [ ] Google OAuth completes a real sign-in.
- [ ] Legal pages reviewed; subprocessors confirmed.

## R6 — Operations

- [ ] Uptime, disk, worker-lag, cron, backup-age, and deploy alerts fire.
- [ ] A named on-call contact exists.
- [x] Rollback was exercised on the current host (2026-11-17; rollback run
  `43936817147` served `577c7a0`, forward run `43938446979` restored `2e88ca5`).

## R7 — Scale

- [ ] Sustained load test with p50/p95/p99, error rate, and saturation.
- [ ] Cost per million events recorded.
- [ ] Retention still completes under load.

## Final gate

```bash
pnpm docs:check
pnpm gate
```

Both must pass. Then every line above is either ticked with a ledger row or
explicitly deferred by the owner with a date. Launching with an open gate is a
business decision, and it is recorded as one — not hidden.
