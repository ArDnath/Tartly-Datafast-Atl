# Autonomous buildout — project state

- **Started:** 2026-11-14
- **Main project:** `/home/ariyaman/Dev/fight/efforts/revenuelens`
- **Source of truth branch:** `main` (protected); integration branch `autonomous/saas-buildout`
- **Release-blocker branch:** `feature/15-release-blockers`; PR #54
  <https://github.com/ArDnath/Tartly-Datafast-Atl/pull/54>
- **Baseline commit:** `ec11b22` (main), plus preserved slice `cb052f7`
  (`feature/14-activation-security`) merged into the integration branch.
- **Reference folder (read-only):** `/home/ariyaman/Dev/fight/efforts/References`

## Discovery evidence

`revenuelens` is the only directory that carries the full fork: origin
`Ardntah/Tartly-Datafast-Atl`, upstream `talivia-group/talivia`, the newest
history, the analytics engine, tracker, Prisma schema, billing, and the
`docs/PHASES.md` tracker. The sibling directories `revenuelens-runtime`,
`revenuelens-serfix`, and `revenuelens-ts7` are older checkouts of three
dependency-fix branches; they are not the source of truth. `git worktree list`
confirms that the main checkout owns all three sibling worktrees. The working
tree was clean on resume.

## Capability probe (2026-11-14)

| Capability          | Status | Evidence                                                                      |
| ------------------- | ------ | ----------------------------------------------------------------------------- |
| Subagents           | YES    | `subagent` tool with `explore` and `general` agents                           |
| Git worktrees       | YES    | `git worktree list`; no extra worktrees created (RAM)                         |
| Shell / Node / pnpm | YES    | Node v24.13.0, pnpm 10.10.0                                                   |
| Test runner         | YES    | Vitest 4.1.12, coverage gated by `pnpm gate`                                  |
| Lint / format       | YES    | Biome                                                                         |
| Browser automation  | YES    | `browser` tools; no desktop browser was connected                             |
| Web access          | YES    | `webfetch`, `websearch`, Firecrawl                                            |
| Local PostgreSQL    | YES    | `pnpm db:local` / `pnpm smoke:local`                                          |
| Resource watchdog   | YES    | `scripts/agent-resource-guard.sh` → `/tmp/opencode/revenuelens-resources.log` |

## Resource policy (binding on this machine)

The host has **7.1 GB RAM, 12 logical cores, no GPU**. Two orphaned 10-worker
`vitest` runs from the previous session drove load average to ~30 and left
~1.9 GB available; both were stopped. From now on:

1. Tests run with `--maxWorkers=2` and `NODE_OPTIONS=--max-old-space-size=2048`.
2. No parallel `next build`, dev server, or test run.
3. Subagents are docs-only unless their contract says otherwise; max 4 active,
   and no subagent may run install/build/test/dev commands.
4. The watchdog samples memory, swap, load, and top RSS every 15 s. If
   `MemAvailable < 700 MB` or load1 > 10, stop the current heavy step before
   starting another.
5. Playwright/browser work is limited to one page and one screenshot at a time.

## Concurrency decision

Wave 0 servants write to disjoint `docs/` trees in this worktree and use the
lock protocol only for shared files. Separate Git worktrees per servant were
not used: (a) nobody writes code, (b) each worktree would duplicate
`node_modules`, and (c) the machine cannot support parallel builds. Wave 2 code
slices are made by the master in this worktree, one at a time. Recorded in
`docs/architecture/ARCHITECTURE_DECISIONS.md` ADR-003.

## Current state

- **Wave 0:** S2 (design language) and S3 (reference inventory) complete.
  S1 (app audit) and S4 (market research) running.
- **Code slices complete on `autonomous/saas-buildout`:**
  - **Cookieless tracker:** no tracker cookies; tab-scoped session token;
    server-derived rotating keyed visitor hash; `SALT_ROTATION=month` default
    (daily resets first-touch attribution every day).
    Tests: tracker 22, collector handler 9, related 7. Tracker build
    10,355 bytes raw / 4.22 KB gzip, zero `document.cookie`.
  - **Opt-in outbound/download events:** `outbound-link` and `file-download`,
    with manual-event precedence and cross-domain exclusion. Tests included.
  - **Tracker reference docs** on `/docs/install` and a tracker-reference nav
    entry; legal cookie page corrected (2026-11-14).
  - **License notice:** Umami's MIT copyright restored in
    `THIRD_PARTY_NOTICES.md` (Talivia's LICENSE had replaced it).
- **Wave 1:** H-TRACKER, H-BACKEND, and H-UX complete. H-INTEGRATE not run.
- **Wave 2 slices:** cookieless tracker, consent, outbound/download, timestamp
  bounds, cross-domain identity, beacon-safe last touch, replay switch, metric
  definitions, revenue-first channel sort, honest pre-payment verification,
  first-site landing, and no fabricated chart line.
- **Release-blocker slice (2026-11-15, branch `feature/15-release-blockers`):**
  - event idempotency via a client event key and a deterministic PostgreSQL
    primary key; duplicate delivery releases its fresh usage reservation;
  - central server-side Pro gating for journeys, API keys, client-reporting
    shares, full backups, and CSV export;
  - metering follows the provider subscription anniversary, with the UTC
    calendar month only as the onboarding/legacy fallback;
  - operational retention job for webhook payloads, audit IPs, and old
    billing/provider/audit rows;
  - public share links now expire after 30 days, enforced by the resolver;
  - `docs/install` documents `eventId` for retry-safe server-side events.
- **Release gate:** re-evaluated on 2026-11-15 after the slice. `pnpm gate`
  exit 0 (234 test files, 1,152 tests, 78 static pages, production build).
  Verdict remains **NOT PRODUCTION READY**: live ClickHouse retention, live
  Dodo test-mode billing, a real browser journey, a deployed load test, and
  legal review are still external blockers. See `PRODUCTION_READINESS.md`.
- **Production tracking recovery (2026-11-15):** the live VPS had zero events
  in ClickHouse even though `POST /api/send` returned 200 and PostgreSQL held
  the mirror. ClickHouse's cgroup-derived memory ceiling was ~717 MB; every
  insert failed with `MEMORY_LIMIT_EXCEEDED`, and the Kafka worker retried the
  same batch forever. The runtime ceiling is now 1.5 GB, the worker restarts
  after the config change, and a diagnostic event reached ClickHouse in under
  8 seconds. The deploy script now restarts ClickHouse when its mounted config
  changes; the worker retries with backoff and dead-letters a batch instead of
  blocking the partition; query reads fall back to PostgreSQL. Repository
  evidence: `deploy/production/clickhouse/low-memory.xml`,
  `scripts/kafka-clickhouse-consumer.mjs`, `src/lib/db.ts`, and
  `src/lib/db.test.ts`.

## Evidence log

- `pnpm exec vitest run src/tracker/index.test.ts` → 22 passed.
- `pnpm exec vitest run src/features/analytics/server/send/handler.test.ts` →
  9 passed.
- `pnpm exec vitest run src/features/docs` → 24 passed.
- `pnpm typecheck` → exit 0.
- `pnpm build-tracker` → `public/script.js` created; 10,355 B raw, 4.22 KB gzip.
- `feature/15-release-blockers` targeted tests: handler 13, tracker 29,
  feature-access 4, usage 13, share 4, data-retention 1, usage-notices 6.
- `pnpm gate` → exit 0; 234 test files passed / 1 skipped; 1,152 tests passed
  / 1 skipped; coverage 68.33% statements / 58.38% branches; production build
  compiled 78 static pages. Log: `/tmp/opencode/gate-feature15-r2.log`.
- Peak build RSS observed by the watchdog: ~3.7 GB; available memory remained
  above 1.6 GB and the host did not OOM. Log:
  `/tmp/opencode/revenuelens-resources.log`.

## 2026-11-16 — Live deployment and tracking verification

- **Deployed production SHA:** `80680129cce9c34b2b135e6a8317e790907f1392`.
  Health readiness returns that exact version; app, worker, PostgreSQL, Redis,
  Kafka, and ClickHouse are healthy.
- **Root causes of the live tracking failure, fixed and deployed:**
  1. ClickHouse's cgroup-derived memory ratio capped it at ~717 MB; inserts
     failed and the Kafka worker retried one offset forever.
  2. The collector rate limiter compared `count >= limit`, rejecting normal
     traffic until 1,200 requests had accumulated.
  3. The retention migration splitter treated a semicolon inside a comment as
     SQL; `session_replay` also needed `toDateTime(created_at)` for TTL.
- **Production browser proof:** Firefox loaded `https://tartly.in/script.js`,
  sent one pageview and one custom event; ClickHouse stored 2 events / 1
  visitor / 1 session; the signed-in stats API returned 1 pageview / 1 visitor /
  1 visit. All test users, rows, and hourly aggregates were deleted afterwards.
- **Gate:** `pnpm gate` exit 0, 235 files / 1,156 tests, coverage 68.42%
  statements, 78 static pages. Evidence: `/tmp/opencode/gate-rate-limit.log`.

## Next step

The tracking outage is closed and deployed. Remaining release work needs
credentials, a live service, or a human: (1) run the live ClickHouse retention
job against seeded old rows, (2) live Dodo test-mode checkout/webhook/portal,
(3) Resend delivery and Google OAuth, (4) a signed-in desktop/mobile browser
pass including replay and consent, (5) a deployed load test, (6) off-host backup
and restore rehearsal, (7) legal review. Do not advertise the 90/365-day
retention promise until the job has run on the VPS. The exact tasks remain in
`PRODUCTION_READINESS.md` and `BLOCKED_TASKS.md`.
