## What changed

<!-- One paragraph. Link the owning module. -->

## Change class

- [ ] Feature or behaviour
- [ ] Bug fix (with a regression test)
- [ ] Schema or migration (split from behaviour changes)
- [ ] Operations, CI, or docs only

## Mandatory gate

Tick every line in `docs/ENGINEERING_STANDARDS.md` §2 in the PR description,
or state `N/A: <reason>`. This box is not a substitute for those lines.

- [ ] Owning feature module; no business logic in route files
- [ ] Zod validation at the boundary; invariants enforced in the service
- [ ] Every tenant read/write scoped by workspace and website
- [ ] Authorization centralized; swapping an ID cannot leak another tenant
- [ ] Shared error shape; no stack, SQL, or secret in a response
- [ ] Rate limits and body limits on abuse-prone paths
- [ ] Migration versioned; new filter/join columns indexed
- [ ] External calls have timeouts; webhooks verified and idempotent
- [ ] Cache keys are tenant-scoped, TTL'd, and invalidated on mutation
- [ ] Unit + route/handler tests cover auth, validation, and isolation
- [ ] `pnpm gate` green (format, lint, typecheck, docs, tests, build)

## Production readiness impact

- Release gate moved: `R1`–`R7` or `none` (see `docs/PRODUCTION_READINESS.md`)
- Isolation control touched: yes/no — if yes, update
  `docs/production/LEAK_REGISTER.md`

## Evidence

```text
<command or artefact> → <result> (date)
```

## Still UNVERIFIED

<!-- Name the missing credential or environment and the human action. If none, write "none". -->

## Rollback

<How to undo this change. For a migration: forward fix or restore path.>
