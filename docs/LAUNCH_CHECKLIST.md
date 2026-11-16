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
- [ ] Formatter is pinned so dependency-update PRs pass CI.
- [ ] Latest `Deploy production` run for `main` is green.
- [x] Plans and limits are enforced server-side from one config module.

## R2 — Tenant isolation

- [x] Code + unit proof for workspace scoping (`docs/production/LEAK_REGISTER.md`
  L1–L4).
- [ ] Live cross-workspace probe on production: read, write, delete, export.
- [ ] Expired share link returns nothing.

## R3 — Data lifecycle

- [x] Retention jobs and TTLs exist and are unit-tested.
- [ ] Tenant-scoped analytics retention ran against seeded old rows.
- [ ] Website deletion purges PostgreSQL and ClickHouse.
- [ ] Account deletion purges every store.
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
- [ ] Rollback was exercised on the current host.

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
