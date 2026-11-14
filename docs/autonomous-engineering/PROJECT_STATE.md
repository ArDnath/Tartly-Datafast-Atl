# Autonomous buildout — project state

- **Started:** 2026-11-14
- **Main project:** `/home/ariyaman/Dev/fight/efforts/revenuelens`
- **Source of truth branch:** `main` (protected); integration branch `autonomous/saas-buildout`
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

| Capability          | Status | Evidence                                                    |
| ------------------- | ------ | ----------------------------------------------------------- |
| Subagents           | YES    | `subagent` tool with `explore` and `general` agents          |
| Git worktrees       | YES    | `git worktree list`; no extra worktrees created (RAM)        |
| Shell / Node / pnpm | YES    | Node v24.13.0, pnpm 10.10.0                                  |
| Test runner         | YES    | Vitest 4.1.12, coverage gated by `pnpm gate`                 |
| Lint / format       | YES    | Biome                                                        |
| Browser automation  | YES    | `browser` tools; no desktop browser was connected            |
| Web access          | YES    | `webfetch`, `websearch`, Firecrawl                           |
| Local PostgreSQL    | YES    | `pnpm db:local` / `pnpm smoke:local`                         |
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
    9,862 bytes raw / 4.0 KB gzip, zero `document.cookie`.
  - **Opt-in outbound/download events:** `outbound-link` and `file-download`,
    with manual-event precedence and cross-domain exclusion. Tests included.
  - **Tracker reference docs** on `/docs/install` and a tracker-reference nav
    entry; legal cookie page corrected (2026-11-14).
  - **License notice:** Umami's MIT copyright restored in
    `THIRD_PARTY_NOTICES.md` (Talivia's LICENSE had replaced it).
- **Wave 1 / 2 / 3:** not started.
- **Release gate:** not evaluated.

## Evidence log

- `pnpm exec vitest run src/tracker/index.test.ts` → 22 passed.
- `pnpm exec vitest run src/features/analytics/server/send/handler.test.ts` →
  9 passed.
- `pnpm exec vitest run src/features/docs` → 24 passed.
- `pnpm typecheck` → exit 0.
- `pnpm build-tracker` → `public/script.js` created; 9,862 B raw, 4.0 KB gzip.
- Resource log: `/tmp/opencode/revenuelens-resources.log`.

## Next step

Finish S1/S4, write `docs/architecture/MASTER_ARCHITECTURE.md` and
`docs/architecture/PORT_PLAN.md`, review the S2/S3 findings, then run the next
P0 code slices (consent-aware tracker mode, first-party install verification,
and any confirmed gap from S1). Run `pnpm gate` with capped workers before the
commit.
