# Tartly — Phase Tracker

- **Project:** Tartly (final brand; production domain tartly.in, confirmed 2026-11-06)
- **Primary repository:** <https://github.com/ArDnath/Tartly-Datafast-Atl>
  (`origin`; default branch `main`; public, protected by the active
  `main-protection` ruleset checked in at
  `.github/rulesets/main-protection.json`)
- **Upstream:** <https://github.com/talivia-group/talivia> (MIT, `upstream`),
  forked locally at `/home/ariyaman/Dev/fight/efforts/revenuelens`
- **Last updated:** 2026-11-12
- **Current phase:** Phases 10, 11, and 12 are implemented, and the
  2026-11-12 platform-checkout slice now connects the landing pricing cards,
  the onboarding setup allowance, the `/app` paywall, and Dodo subscription
  management. The free trial was removed: a workspace finishes onboarding
  (one website) and must subscribe before ingestion or paid features unlock.
  A real local ingestion run (10,000 events, 50 concurrent clients, 157 req/s,
  p95 412 ms, 0 errors) is recorded in `docs/LOAD_TEST.md`, and the run exposed
  and fixed a deleted-workspace session leak. The remaining work is external
  verification: live Dodo/Resend/provider credentials, a real browser
  walkthrough, a Neon production restore rehearsal, hosting/DNS, and lawyer
  review. All are labelled **UNVERIFIED** with the exact human action. The
  source restructure remains enforced: `src/app` is routing only, every domain
  owns its UI/hooks/lib/server/queries, and `src/lib`/`src/queries` are
  allowlisted shared kernels.
- **Mandatory engineering gate:** the two repository skills
  (`.opencode/skills/production-backend-readiness/SKILL.md`,
  `.opencode/skills/high-scale-low-cost-deployment/SKILL.md`) are binding.
  `docs/ENGINEERING_STANDARDS.md` defines the per-feature checklist and
  `pnpm gate` enforces format, lint, typecheck, tests, the deploy-script/smoke
  checks, and the production build.
- **Delivery enforcement:** `main` requires the three CI checks through the
  active `main-protection` ruleset. Production deploys only the current `main`
  head automatically after CI (no approval click), verify the running
  `BUILD_VERSION`, run public smoke checks, and roll back on failure. See
  `docs/CI_CD.md` → Deployment invariants.

## Overall progress

- Total phases: **13** (0–12 product/build, 12 go-to-market)
- Phases complete: **8 full, 5 with caveats** (external credentials or measured
  proof still required)
- Overall percent (average of phases 0–12): **94%**
- Build state at last check: **green** — `pnpm gate` (Biome format, Biome
  lint, `tsc --noEmit`, coverage-enforced tests, production build) passes.
  Latest local full run (2026-11-12): **213 test files passed / 1 gated skip**,
  **966 tests passed / 1 skipped**, coverage **66.79% statements / 55.97%
  branches / 64.01% functions / 67.26% lines**, plus the explicit 48-assertion
  PostgreSQL analytics smoke and the recorded load probe.
- GitHub CI: **green on `main`** (run 43066591765 for `619099b`). The three-job
  pipeline starts PostgreSQL 17, runs format, lint, typecheck, coverage tests,
  a clean production dependency audit, `prisma migrate deploy`, the Phase 7
  analytics smoke, and `pnpm build`, then runs gitleaks, CodeQL, dependency
  review, and Trivy filesystem/container scans. On the public repository,
  CodeQL, dependency review, and SARIF upload all run; the `Verify` job also
  publishes coverage in the run summary.
- Production deploy: the first automatic post-merge deploy, run 43068497241 for
  `main` at `619099b`, succeeded in 10m05s. `/api/health/ready` returned
  `version: 619099b94157579f2570a8767097cbd5454a3a36`, `database: "up"`, and
  the post-deploy smoke job passed. The earlier HTTPS-clone failures remain
  resolved by the host's read-only SSH deploy key. The `production` environment
  still restricts deployments to `main`; the `main` ruleset is active.
- Delivery history: six phase branches delivered through pull requests #1–#6;
  the next slices follow the same feature-branch → PR → merge loop.
- Runtime smoke: the public docs routes return 200, and `/app/settings`,
  `/app/settings/integrations`, `/app/settings/security`,
  `/app/settings/websites`, `/app/settings/billing`, `/app/settings/activation`,
  and `/app/settings/admin` are wired. The legacy `/websites/*` and
  `/settings/*` URLs redirect to `/app/*`.
- Database: local PostgreSQL has all migrations applied, including the newest
  `20261112120000_platform_billing_traffic_tier` (purchased traffic tier).

## Final engineering status (2026-11-06)

The codebase is feature-complete for a controlled launch. The full suite, lint,
typecheck, production build, PostgreSQL analytics smoke, local ingestion load
probe, rendered-surface smoke, email-token lifecycle, suspension/audit flows,
one-time setup allowance, tenant-isolation suites, and the single workspace
membership surface are green. Nine additional phase/security PRs (#7–#15) were
delivered through the feature-branch → PR → CI → merge loop.

What remains is **external verification and approval**, not missing product
code:

1. Dodo test/live credentials and product IDs (`docs/PLATFORM_BILLING.md`).
2. Resend API key and verified sending domain.
3. Live webhook accounts for each analytics payment provider.
4. A connected desktop browser for visual/motion/replay QA.
5. A Neon production project with a restore rehearsal.
6. A deployed-environment load test and hosting/DNS/TLS.
7. Lawyer review of the legal drafts and confirmation of subprocessors.
8. A copy-with-data rehearsal before dropping the legacy `Team` / `TeamUser` /
   `website_member` tables. The application no longer writes per-website
   members; those tables are read-only fallbacks for pre-workspace rows.

Do not claim these are done until the evidence is recorded here. No system
shutdown or destructive action should be taken based on this tracker.

## 2026-11-12 — Platform checkout merged; automatic VPS deploy verified

- PR #46 (`feature/platform-checkout-paywall`, commits `2afb2b4` → `da48de5`
  → `3dd27ef`) was squash-merged to `main` as
  `cccbf1cd8d30d0b899da6fec200c7dc27b932786`.
- CI run `43173928272` passed all three required checks on `main`: Verify
  (format, lint, types, tests, build), Security (gitleaks, CodeQL, dependency
  review), and Container build/image scan.
- The deploy workflow started automatically from the CI `workflow_run` event
  (no manual dispatch, no approval step): run `43175779419` deployed
  `cccbf1c` in 10m28s, ran migrations, verified the exact-SHA readiness
  payload, and passed the post-deploy smoke.
- Independently verified from this checkout:
  `GET https://tartly.in/api/health/ready` returned
  `{"ok":true,"service":"tartly","database":"up","version":"cccbf1cd8d30d0b899da6fec200c7dc27b932786"}`;
  `/api/health/live` returned 200; `scripts/deploy-smoke.mjs` passed all eight
  public routes (`/api/health/live`, `/api/health/ready`, `/`, `/pricing`,
  `/docs`, `/login`, `/robots.txt`, `/sitemap.xml`) against the exact version.
- The earlier branch push also exposed that a manual `workflow_dispatch` of CI
  scans full history and fails on the 13 known fake `generic-api-key` test
  fixtures from upstream. Normal push/pull-request scans are range-limited and
  remain green; the fixtures are test-only and documented in
  `docs/SECURITY_REVIEW.md`.
- **UNVERIFIED:** live Dodo checkout, webhook delivery, customer portal, Google
  consent, and a signed-in browser walkthrough of the paywall. Those require
  the provider credentials and human actions listed in
  `docs/PLATFORM_BILLING.md` and `docs/GOOGLE_OAUTH.md`.

## 2026-11-12 — Remove the 7-day free trial (owner request)

- Removed the time-based trial from the single source of truth
  (`src/lib/plans.ts`): no `FREE_TRIAL_*` constants, no `trialDays` on a plan,
  and no trial-state helpers. The two paid plans are unchanged.
- Entitlements and usage snapshots no longer expose trial fields. An unpaid
  workspace keeps only the onboarding setup allowance (one website, one member)
  and has a zero event/replay allowance.
- Ingestion now returns `subscription_required` for every billable event when
  `active` is false. The one-time setup event counter and its reserve/release
  helpers were removed from the collector path.
- `/api/billing/access` returns `requiresPayment: true` as soon as a workspace
  has no confirmed subscription. The trial countdown strip was deleted; `/app`
  renders the paywall immediately after onboarding.
- Checkout handoff sends only paid workspaces to `/app`; every unpaid workspace
  goes to Dodo checkout. No provider-side trial is requested.
- Marketing, legal, docs, `llms.txt`, and the OpenAPI `BillingAccess` schema
  now say "no free tier / no free trial". Pricing CTAs read "Choose a plan".
- Verified: `pnpm gate` exit 0 on 2026-11-12 — 213 test files passed / 1
  skipped, 966 tests passed / 1 skipped, coverage 66.79% statements / 55.97%
  branches / 64.02% functions / 67.23% lines, deploy checks passed, and the
  production build (including `/checkout` and the paywall routes) was green.
  The 13 directly affected suites were also run on their own (83 tests).
- **UNVERIFIED:** live Dodo checkout with real test credentials. The human
  action is unchanged from the entry below: configure `DODO_PAYMENTS_*`, run
  `pnpm billing:setup-dodo --apply`, sign in, finish onboarding, and complete a
  test-card checkout.

## 2026-11-12 — Dodo checkout, trial paywall, and subscription management

- Landing pricing cards now hand off to
  `/checkout?plan=…&interval=…&tier=…`. Signed-out visitors continue through
  Google; a first-run account finishes onboarding and then returns to the
  checkout intent. A workspace still inside its local 7-day trial goes straight
  to `/app`, and no payment is started.
- The free-trial countdown strip now renders **above** the `/app` navbar, spans
  the full width, and centers its pill, countdown, end date, and plan link.
  It updates at the next minute boundary and is absent after the trial or after
  paid access is confirmed.
- An expired trial renders a glass paywall on `/app` with both plans, a
  monthly/yearly switch, and the same traffic-tier slider as `/pricing`. The
  cards are translucent, theme-aware, keyboard accessible, and fall back to a
  solid surface where `color-mix` is unavailable. Only the owner can start
  checkout; invited members see the owner-required explanation.
- `POST /api/billing/checkout` now accepts an exact `tierIndex`, resolves an
  exact provider product, and returns `billing-price-unavailable` for an
  unconfigured non-default tier instead of silently charging the default price.
  Checkout is rate limited per workspace (20 sessions / 10 minutes).
- Migration `20261112120000_platform_billing_traffic_tier` records the purchased
  tier on `platform_subscription`. Entitlements, usage metering, the billing
  panel, and the current-plan display now enforce the purchased events
  allowance rather than the plan default.
- Dodo checkout no longer requests a provider-side trial. The platform's local
  7-day trial is the only free period, so a customer cannot receive a second
  free week by subscribing on day one or after the trial ends.
- Added `GET /api/billing/access` (VIEWER, workspace-scoped) for the shell's
  trial and paywall state. `openapi.yaml` now documents the billing read,
  access, checkout, portal, cancel, and change-plan endpoints.
- Added `pnpm billing:setup-dodo` (dry-run by default; `--apply`,
  `--yes-live` for live mode). It builds all 32 plan/interval/tier products from
  `src/lib/plans.ts`, reuses existing products by metadata, and prints
  `DODO_PRODUCT_IDS_JSON` plus the four default-tier IDs.
- The account menu now links directly to **Subscription**
  (`/app/settings/billing`). Plan and usage shows the tier slider, exact
  monthly/yearly totals, invoices, the Dodo customer portal, cancellation, and
  plan or traffic-tier changes. The `/app?checkout=success` return shows a
  confirmation state and polls the read model until the verified webhook
  unlocks the workspace.
- Verified: `pnpm gate` exit 0 on 2026-11-12 — **215 test files passed / 1
  gated skip**, **980 tests passed / 1 skipped**, coverage **66.82%
  statements / 56.02% branches / 64.01% functions / 67.26% lines**, deploy
  script parsing and six deploy-smoke tests passed, production build green
  (including the dynamic `/checkout` route). `prisma migrate deploy` applied
  `20261112120000_platform_billing_traffic_tier` locally. A real local database
  probe verified an expired workspace (`requiresPayment: true`, event limit 0)
  and a 2-day-old workspace (trial active, 5 days remaining, 2,000 events); the
  temporary rows were deleted afterwards.
- **UNVERIFIED:** live Dodo test/live checkout, webhook delivery, customer
  portal, Google consent, and a connected-browser screenshot of the paywall.
  Exact human setup and test steps are in `docs/PLATFORM_BILLING.md` (Dodo
  dashboard, webhook endpoint, API key, product setup script, test card).

## 2026-11-11 — Automatic CD verified on Ubuntu 26.04; security alert remediation

- CD is live: merging PR #44 started CI 43066591765 and deploy 43068497241. The
  deploy built `tartly-app:619099b…`, ran migrations, restarted only the app,
  verified the exact-SHA readiness payload, and passed the eight-route public
  smoke. Production is healthy at `619099b…`.
- Both SSH directions are verified: GitHub Actions → VPS uses
  `DEPLOY_SSH_KEY` (the `github-actions-tartly` key is present in
  `/home/deploy/.ssh/authorized_keys`), and VPS → GitHub uses the
  `tartly-vps-deploy` read-only deploy key (`ssh -T` reports the repository).
  The host remote is `git@github.com:…`, not HTTPS.
- Host baseline: Ubuntu 26.04.1 LTS, Docker 29.9.2, Compose v5.6.1, UFW only
  22/80/443, password SSH disabled, unattended-upgrades and fail2ban active,
  `/opt/tartly/runtime/.env` mode 600 owned by `deploy`. Two stray manual Caddy
  containers that published 8080/8443 outside the compose stack were stopped;
  8080 is no longer externally reachable. BuildKit cache was pruned from 50.9GB
  to 10.5GB (disk 70% → 32%).
- Security branch `fix/security-alerts`: local `pnpm gate` exit 0 — 203 test
  files passed / 1 skip, 936 tests passed / 1 skip, coverage 66.20/55.07/63.58/
  66.61, production build green. `pnpm audit --prod` reports 0; the full audit
  is down from 8 findings to 1 accepted dev-only `deepmerge` advisory. `tsup` 9
  removes the vulnerable `glob`/`minimatch` chain; overrides pin
  `postcss-selector-parser` 6.1.5/7.1.6 and `diff` 4.0.4. CodeQL fixes cover
  insecure randomness, ReDoS, SQL escaping, locale property injection, the
  file-system race, and redundant assignments. The Dockerfile runs `apk upgrade`
  to pick up zlib 1.4-r0 (CVE-2026-4738). Final GitHub alert close/dismissal is
  verified after the merge scan; the accepted/false-positive reasons are in
  `docs/SECURITY_REVIEW.md`.

## 2026-11-11 — CD enforcement: current-head deploy, exact-SHA readiness, public smoke

- Closed the deploy-ordering gap: an automatic deploy now requires the target
  to equal the current `origin/main` head in both the workflow and
  `deploy/production/deploy.sh`. If a newer merge lands while an older deploy is
  queued, the older run fails instead of rolling production back. A manual
  rollback must opt in with
  `gh workflow run deploy.yml -f sha=<sha> -f allow_previous=true`.
- `/api/health/ready` is no longer trusted on status alone. The host deploy
  requires `ok: true`, `database: "up"`, and `version` equal to the target SHA,
  and does the same check after an automatic rollback. The previous local image
  is reused when present.
- Added `scripts/deploy-smoke.mjs` and six Node tests. After deploy, CI checks
  `/api/health/live`, `/api/health/ready`, `/`, `/pricing`, `/docs`, `/login`,
  `/robots.txt`, and `/sitemap.xml` without following redirects. Any non-200,
  stale version, or down database fails the deploy job.
- `pnpm gate` now parses `deploy.sh`,
  `scripts/apply-branch-protection.sh`, and the smoke script, then runs the
  smoke-harness tests. CI runs the same `pnpm gate:deploy` step.
- Build or migration failure leaves the running app untouched and restores the
  checkout to the SHA that is actually serving traffic. The successful SHA is
  recorded in `$RUNTIME_DIR/last-deploy`; migration failures still require a
  forward fix or a Neon restore.
- Docs: `docs/CI_CD.md` records the seven deployment invariants;
  `docs/RUNBOOK.md` documents the new current-head and rollback behaviour.
- The `production` environment's required reviewer was removed, so a green
  merge to `main` starts the deploy automatically. The environment still
  restricts deployments to `main`. The stale waiting run for the previous head
  was cancelled.
- Verified: `pnpm gate` exit 0 on 2026-11-11 — 203 test files passed /
  1 gated skip, 936 tests passed / 1 skipped, coverage 66.22% statements /
  55.12% branches / 63.58% functions / 66.62% lines, deploy-script parsing and
  the 6 deploy-smoke tests passed, production build green. The live smoke
  harness also passed against the current production version
  (`https://tartly.in`, `version: 87a7167d…`, all eight endpoints 200).
  End-to-end deploy verification continues in the merged run.

## 2026-11-11 — CodeQL error remediation and merge-gate rollout

- Fixed the two CodeQL error alerts: `js/redos` in `DOMAIN_REGEX` (bounded
  labels and a hard dot separator replace the nested quantifiers) and
  `js/log-injection` in the local LemonSqueezy proxy (fixed log message instead
  of the raw error object). Added a ReDoS regression test.
- Applied the checked-in merge gate to the now-public repository: ruleset
  `main-protection` (id 27043347) is active, and `delete_branch_on_merge` is
  enabled. A full-history gitleaks audit found 13 `generic-api-key` entries,
  all fake test fixtures in upstream test files (no real credentials).
- Remaining CodeQL inventory: 20 warnings plus a MEDIUM zlib CVE in the
  container image (fix `1.4-r0` is not yet in the Alpine 3.24 repository);
  tracked as follow-up work, none blocks CI.
- Verified: `pnpm gate` exit 0 on the fix branch — 203 test files passed /
  1 gated skip, 936 tests passed / 1 skipped, coverage 66.17% statements /
  55.05% branches / 63.41% functions / 66.59% lines, build green.

## 2026-11-11 — CI merge gate, deploy access preflight, coverage summary

- Checked in a `main` repository ruleset
  (`.github/rulesets/main-protection.json`) and
  `scripts/apply-branch-protection.sh`: required pull request, linear history,
  resolved conversations, up-to-date branch, and the three CI job contexts;
  force pushes and deletions blocked. The approval count is 0 because the
  project has one maintainer and GitHub does not allow self-approval.
- Made the Trivy filesystem/secret/misconfiguration scan blocking on
  CRITICAL/HIGH (`exit-code: 1`, `limit-severities-for-sarif: true`). Local
  baseline with the CI arguments (Trivy 0.70): 0 vulnerabilities, 0 secrets,
  0 misconfigurations.
- Added `scripts/coverage-summary.mjs` and a job-summary step so coverage is
  visible in the run summary without downloading the artifact.
- `deploy.sh` now sets `GIT_TERMINAL_PROMPT=0` and `BatchMode=yes` and runs a
  `git ls-remote` preflight. The 2026-11-11 deploy failures were caused by an
  HTTPS host remote with no credentials; the failure now prints the exact
  read-only deploy-key fix. Documented in `docs/CI_CD.md` (Host repository
  access) and `docs/RUNBOOK.md`.
- Corrected stale claims: CodeQL, dependency review, and SARIF upload are
  skipped only on a private repository without GitHub Code Security; the
  repository is public, so all three now run. The earlier "live deploy"
  statement predated the current fetch failure.
- Verified: `pnpm gate` exit 0 — 202 test files passed / 1 gated skip, 933
  tests passed / 1 skipped, coverage 66.2% statements / 55.11% branches /
  63.5% functions / 66.61% lines, format/lint/typecheck/build green. Ruleset
  JSON valid; local Trivy baseline clean.
- The repository was made public on 2026-11-11 and
  `bash scripts/apply-branch-protection.sh` applied the `main` ruleset
  (`main-protection`, id 27043347). A full-history gitleaks audit found 13
  `generic-api-key` entries, all fake test fixtures in upstream test files (no
  real credentials).
- **Resolved:** the waiting production deployment was cancelled and the
  required reviewer was removed, so the next green merge deploys automatically.
  A read-only VPS deploy key remains recommended so the host does not depend on
  anonymous public fetches.

## 2026-11-11 — PR queue recovery and launch experience delivery

- Cleared the open PR queue with squash merges after CI: #35
  (`@rollup/plugin-alias` 6.0.1), #31 (Google-only sign-in), #26
  (`serialize-error` 13.1.0), #38 (container scan disk fix), #36
  (`babel-plugin-react-compiler` rc.3), #37 (TypeScript 7), and #33 (runtime
  minor/patch group). Stale dependabot branches were rebased onto `main` so
  their effective diff stayed limited to `package.json` and `pnpm-lock.yaml`.
- Root cause of the failing container job: the hosted runner reported a 72 GB
  root disk with 68 GB already used, and BuildKit's local cache plus Trivy's
  image export into `/tmp` exhausted the remaining space. #38 prunes the local
  build cache after the build and before the scans. That was enough for most
  images; #40 additionally removes the preinstalled toolchains the job never
  uses (dotnet, Android SDK, GHC, hosted tool cache, Swift) because the
  TypeScript 7 image needed more headroom.
- TypeScript 7 required the test `IntersectionObserver` mock to implement the
  full interface, including `scrollMargin` (`src/test/setup.ts`). No other
  source file needed migration. It also exposed a shipping bug: because Next
  declares TypeScript as an optional peer, pnpm linked TypeScript 7's native
  Go compiler into the production tree, and Trivy blocked the image on 15 Go
  standard-library findings. The Dockerfile now removes the build-only
  compiler after copying the production tree; the same local Trivy scan then
  reported 0 CRITICAL/HIGH findings.
- `feature/launch-experience` was rebased onto the new `main` (the Google OAuth
  commits were dropped because #31 already carried them) and delivered as a PR
  with the activation onboarding, quiet app shell, light/dark toggle, landing
  motion, and revenue charts.
- Evidence: `pnpm gate` green on the rebased launch branch and on every
  non-dependabot change; GitHub CI green on each merged PR.
- **UNVERIFIED:** live Google consent, provider credentials, and the VPS
  browser walkthrough remain human actions (see the section below).

## 2026-11-11 — VPS preview deployment of the launch branch

- Deployed `feature/launch-experience` (`87a7167`) to the existing single-VPS
  stack at <https://tartly.in> so the new landing page and launch UI can be
  reviewed publicly.
- Method: shipped the commit as a git bundle (the VPS clone has no GitHub
  credentials and the repository is private), checked out `preview-launch`,
  built `tartly-app:87a7167…`, applied the three additive migrations
  (`google_oauth`, `workspace_logo`, `workspace_onboarding_completed`) to Neon,
  restarted only the `app` service, and waited for `/api/health/ready`.
- Verified: `/api/health/ready` reports `version: 87a7167…` and
  `database: up`; `/`, `/pricing`, `/docs`, `/login`, `/robots.txt`, and
  `/sitemap.xml` return 200; `www` redirects 308 to the apex; HSTS is present.
- Rollback: the previous image `tartly-app:cc068cb…` and commit `cc068cb`
  remain on the host, and `main` in `/opt/tartly/app` still points at
  `cc068cb`.
- **UNVERIFIED / caveat:** sign-in is Google-only on this branch and
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are not set on the VPS. The
  existing OAuth client rejects
  `https://tartly.in/api/auth/google/callback` with
  `redirect_uri_mismatch`. Human action: add that redirect URI in Google Cloud
  Console, add the two secrets to `/opt/tartly/runtime/.env`, and restart the
  app. Until then `/app` cannot be demonstrated.
- **N/A:** full `pnpm gate` for this deployment-only slice — the VPS Docker
  build ran TypeScript and the production `next build` successfully, but the
  test, coverage, and lint gate was not rerun.

## 2026-11-11 — EvilCharts-style ECharts blocks in the preview and the app

- Added `echarts@6.1.0` and one lazy loader (`src/components/charts/echarts`)
  so the canvas runtime is fetched only in the browser; the server render and
  the rest of the bundle stay unchanged.
- Three reusable blocks: `LineTrendChart` (glow, gradient wash, frosted
  tooltip), `ComposedTrendChart` (rounded columns plus a glowing line, optional
  second value axis, per-bar palette), and `SankeyFlowChart` (outside labels,
  source-tinted bands, item tooltip). All colours resolve from the live CSS
  tokens, so light and dark follow the existing theme toggle.
- Landing interactive demo: **Revenue by day** is now a multi-colour bar +
  line mixed chart (six-colour palette, previous period as the line). The
  comparison line block and an acquisition → landing → product → purchase
  sankey sit below it, scaled by range, site, and row filter.
- `/app` portfolio home: the revenue trend is the same mixed chart, followed by
  revenue-versus-visitors per site and a visitors → site → conversion sankey.
- Website workbench: **Revenue and payments** (composed) and **Channel to
  conversion** (sankey) read the existing tenant-scoped stats and
  dashboard-breakdown endpoints. The inherited Chart.js overview chart is
  retained because it owns compare mode, refunds, and the existing analytics
  contract; the new blocks are additive.
- Verified: `pnpm gate` exit 0 on 2026-11-11 — 202 test files passed / 1 gated
  skip, 933 tests passed / 1 skipped, coverage 66.22% statements / 55.12%
  branches / 63.58% functions / 66.62% lines, production build green. New
  coverage: option builders (line, composed, sankey, palette), portfolio
  aggregation/sankey, and revenue-flow sankey. Browser screenshots at 1440 px
  and 390 px in light and dark; `/app` and `/app/[websiteId]` rendered live
  data from a local PostgreSQL run (created through the real onboarding API,
  then fed events and manual payments).
- **N/A:** tenant isolation and persistence — the change adds presentation
  components only and reads existing authorized endpoints; no schema, route,
  cache, queue, or ingestion code changed.

## 2026-11-10 — Premium surface texture pass

- Added one shared paper-grain texture (`public/textures/grain.svg`, fixed
  `body::after` overlay) across every route, plus a 24px dot field and quiet
  radial glows on the product canvas, auth canvas, onboarding, docs, pricing,
  legal, and comparison pages. The landing page keeps its existing hatch and
  hairline grid; the grain sits underneath them.
- Added a single soft top sheen to shared cards (`Panel`,
  `.portfolio-site-card`, settings surfaces, pricing, docs, and comparison
  cards). It is a texture only: no new drop shadow, no coloured glow, and hover
  remains the only lifted state.
- Tokens live in `src/app/global.css`:
  `--rl-grain`, `--rl-grain-opacity`, `--rl-app-dot`, `--rl-app-glow`,
  `--rl-panel-sheen`, and the marketing equivalents. Texture is hidden in
  `forced-colors` and print, and carries no motion, so reduced-motion behaviour
  is unchanged.
- Fixed an adjacent auth-shell defect found during visual QA: the global
  full-width auth button rule was stretching the floating theme toggle to
  1,265px. `.talivia-theme-toggle` now keeps its 34px chrome size.
- Verified: `pnpm gate` exit 0 on 2026-11-10 — 198 test files passed / 1
  skipped, 904 tests passed / 1 skipped, coverage 66.05% statements / 55.2%
  branches / 64.17% functions / 66.5% lines, production build green. Also
  confirmed with targeted tests (35 passed), axe on `/pricing` (only the
  pre-existing redundant-image-alt violation), and browser screenshots of `/`,
  `/pricing`, `/docs`, `/login`, `/onboarding` (light and dark), and `/app`
  (light and dark).

## 2026-11-10 — Quiet DataFast-style app shell and dashboard

- Replaced the signed-in visual chrome with a flat, quiet working surface:
  the dot field, coloured corner glows, and body grain are removed inside
  `.talivia-app-shell`. Content width is 1120 px on both `/app` and the
  website workbench.
- Removed the nineteen-item left rail from the website workbench. A single
  horizontal destination row now carries Overview, Revenue, Visitors, Events,
  Funnels, and Session replay; the remaining reports live in one **More**
  menu. The old rail markup is still exported for compatibility but no longer
  mounted.
- The website header is one toolbar row: website switcher plus a quiet
  icon-only Settings shortcut on the left, Filter, date step, date range, and
  granularity on the right. Subpages use the same toolbar instead of a
  second page header, so the screen has one consistent top edge.
- `/app` (post-login home) is now a short page header with a single summary
  line (websites · revenue · visitors), the period controls, and a three-up
  grid of calm website cards. The four large portfolio KPI cards and the MRR
  panel were removed from this page; revenue remains on every card and on the
  website workbench.
- Empty breakdown panels now render a centred "No data" line instead of an
  empty body.
- Added a fixed bottom-left **Logout** control on every signed-in surface
  (`.app-logout`), labelled for screen readers and collapsed to an icon under
  640 px.
- Mobile: the account menu shows only the avatar glyph, so the wordmark and
  workspace switcher no longer clip at 390 px.
- Verified in the running browser at 1440×900 and 390×844 on `/app`,
  `/app/[websiteId]`, and `/app/settings`; the More menu, empty states, and
  logout control render as intended.
- Evidence: `pnpm gate` exit 0 on 2026-11-10 — 198 test files passed / 1 gated
  skip, 904 tests passed / 1 skipped, coverage 66.05% statements / 55.20%
  branches / 64.17% functions / 66.50% lines, production build green.
- **N/A:** backend-readiness and high-scale skills — this change touches only
  presentation components and CSS; no route, query, auth, or ingestion code
  changed. Tenant scoping, API contracts, migrations, caching, and queues are
  untouched.

## 2026-11-10 — Light/dark toggle for product surfaces

- Added a theme toggle to `/login`, `/onboarding`, and the `/app` shell
  (`TopNav`). Light canvas is `#FEFAEA`; dark canvas is `#1F1F1F`.
- Theme tokens live in `src/app/global.css` (`:root` light, `[data-theme="dark"]`
  dark); app surfaces, panels, charts, and settings panels now read those
  tokens instead of hard-coded dark hex values where they drive CSS.
- Hydration-safe: the root layout renders a fixed default and an inline
  `<head>` script applies `localStorage["tartly-theme"]` before first paint;
  `<html suppressHydrationWarning>` accepts the DOM value. The toggle's markup
  is identical on server and client (glyphs are CSS-selected by
  `data-theme`), so there is no hydration mismatch.
- Verified: `pnpm typecheck`, Biome format/lint on the changed files, and the
  full suite (897 passed, 1 skipped) are green; the new theme-toggle tests add
  3 cases.

## 2026-11-10 — Landing polish, micro-interactions, and impact pass

- Applied the newly installed `better-ui` skill plus Impeccable's `animate` and
  `bolder` references to the existing landing page. Content, plan logic,
  tracker, and the Google sign-in flow are unchanged.
- Polish: every hover effect now sits behind `@media (hover: hover)`; named
  transition properties replace `all`; the feature-card rule animates scale
  instead of width; keyboard focus gets a consistent orange ring; the mobile
  menu traps focus, closes on Escape, and returns focus to its trigger.
- Motion: one-shot hero-dashboard entrance (staggered revenue bars, KPI and
  channel-row settle) instead of an infinite underline pulse; the closing CTA
  carries a single attention ring to the hero form; the pricing segmented
  control slides and the price ticks on a billing or tier change. All movement
  is disabled under `prefers-reduced-motion`.
- Impact: the "Traffic tells you who came" headline now holds one sentence per
  line, the four-step spine was compressed into a true 1–2–3–4 zigzag with a
  scroll-filled rail and a deeper sand band for section rhythm, and the plan
  price is larger at the decision point.
- Verified: landing + app-structure tests 26/26, typecheck, Biome format/lint,
  axe (only the pre-existing brand-contrast items remain), and desktop/mobile
  screenshots at 1440 px and 390 px.

## 2026-11-10 — Landing page visual pass (tracerHQ reference)

- Re-skinned the existing landing page without changing its content, plan
  logic, tracker, or Google sign-in flow. Visual reference:
  `https://www.tracerhq.co/`, fetched 2026-11-10.
- Tokens are scoped to `.landing-root` so docs/legal/dashboard keep their
  cascade: cream `#fffbeb`, ink `#171717`, sand borders `#ddd5cc`, one signal
  orange `#ff4f00`, blush `#f2b4cb` highlights, mono micro-labels, sharp
  corners, hard offset shadows.
- Added the reference page's textures (dot grid, hairline grid, diagonal
  hatch), a fixed floating nav bar, heavy tight-tracked headlines with an
  orange underline accent, a CSS-built hero workspace frame labelled
  "Illustrative preview · sample data", a bordered payment-provider strip, and
  restyled process, pricing, capability rails, CTA, and footer.
- Removed the Domine import; Inter is the single family again.
- Verified: landing tests 10/10, typecheck, and the production build are green.

## 2026-11-09 — Google-only sign-in

- `/login` is now a centered authentication canvas with a larger Tartly
  lockup (72 px mark + wordmark) above one **Continue with Google** action.
  The username/password fields and signup/password links are removed from the
  login surface.
- Added the full Google OAuth redirect flow:
  `GET /api/auth/google` → Google consent → `GET /api/auth/google/callback`.
  The state value is signed and encrypted into an HttpOnly, SameSite=Lax,
  path-scoped cookie and compared in constant time.
- The callback exchanges the code, requires `email_verified: true` from
  Google's OpenID userinfo endpoint, links a matching normalized email to the
  Google subject, or creates the user + personal workspace + OWNER membership
  in one transaction. Deleted and suspended accounts are rejected.
- Migration `20261109120000_google_oauth`: nullable `user.password` and unique
  `user.google_id`. Existing password accounts keep working and can be linked
  on their first Google sign-in.
- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and (optionally)
  `GOOGLE_REDIRECT_URI`; register
  `https://tartly.in/api/auth/google/callback` in Google Cloud Console. Setup
  details are in `docs/GOOGLE_OAUTH.md`.
- Tests cover the consent URL/state round-trip, tamper rejection, token and
  profile failures, unverified email rejection, account linking/creation,
  race handling, callback state rejection, rate limiting, and the Google-only
  login surface. Live Google credentials are **UNVERIFIED** in this checkout;
  the human must create the OAuth client and add the redirect URI above.

## 2026-11-09 — Landing CTA continues through Google

- The landing hero **Start tracking** form now posts to `/api/auth/google`
  with `returnUrl=/onboarding`. The entered website travels inside the signed
  OAuth state and pre-fills the onboarding website field, so the customer no
  longer sees a password signup screen.
- `/signup` is no longer a screen. The route redirects to the same Google flow,
  which keeps the pricing, navbar, footer, docs, and alternatives calls to
  action working without exposing a password form.
- Removed `SignupPage` and `SignupForm`. The password registration API remains
  for existing accounts but has no customer-facing entry point.
- `sanitizeAuthReturnUrl` now allows `/onboarding` in addition to `/app`,
  preserves the query string, and still rejects external, protocol-relative,
  and backslash paths.
- Tests: landing form contract, signup redirect, Google website passthrough,
  return-URL sanitizer, and website normalization.
- The root `<body>` now carries `suppressHydrationWarning` because browser
  extensions such as ColorZilla inject attributes like `cz-shortcut-listen`
  before React hydrates. Real app markup is still checked normally.

## 2026-11-09 — Activation onboarding: website → tracker → revenue

- `/onboarding` no longer asks for a workspace name or photo. The three steps
  are **website URL**, **install the tracker**, and **connect revenue**, then
  the singleton welcome and `/app` overview. This supersedes the two-step
  workspace-first flow below.
- Step 1 calls `POST /api/onboarding/website`. The server finds or creates the
  owner's workspace from the domain label and creates the first website in the
  same request. The workspace remains the tenant boundary; it is simply not a
  customer-facing setup question. Concurrent submits are idempotent through a
  deterministic workspace slug and an existing-domain lookup.
- Step 2 reuses `src/features/docs/install-guides.ts` for Next.js, React, Vite,
  HTML, Astro, and Remix snippets. It polls
  `GET /api/websites/:id/onboarding/verify`, which reads the real event store.
  The step can be skipped and verified later.
- Step 3 reuses the existing per-website payment-provider endpoint for Stripe,
  Dodo, Lemon Squeezy, Polar, and Yolfi. Credentials stay encrypted and
  tenant-scoped in the payments domain. The copy marks this as analytics
  revenue, never platform billing.
- Added `workspace.onboarding_completed_at` (migration
  `20261109140000_workspace_onboarding_completed`) and
  `POST /api/onboarding/complete`. Existing workspaces are backfilled as
  complete so the release does not re-onboard current customers. Auth routing
  and the app shell now use the flag, and an owner with an incomplete workspace
  is sent back to `/onboarding` instead of the dashboard.
- The welcome overlay is now a direct port of
  `../tartly/components/app/onboarding/welcome-overlay/*`: the real canvas
  halftone renderer, particle layout, 2,900-dash data set, worker/main-thread
  fallback, word-by-word title, person chip, hold/teardown effects, and the
  singleton `?welcome=1` gate with URL consumption. The CSS dot field is gone.
- Tests: onboarding step and helper tests, website/complete handler tests
  (auth, validation, conflict, tenant-owner check), workspace service tests
  (creation, resume, double-submit race, plan limit, idempotent completion),
  post-sign-in routing, component tests for all three steps, and the welcome
  hold/teardown. Evidence: `pnpm gate` exit 0 on 2026-11-09 — 193 test files
  passed / 1 gated skip, 889 tests passed / 1 skipped, coverage 67.81%
  statements / 56.20% branches / 63.90% functions / 68.16% lines, production
  build green. Migration applied locally (`prisma migrate deploy`); a live API
  smoke registered a fresh account, created the invisible workspace + website
  (`smoke-example.com`), verified `installed:false`, completed onboarding,
  confirmed `onboardingRequired:false`, and received `409 already-onboarded` on
  a repeat create. Smoke rows were deleted afterwards.
- **UNVERIFIED:** a live browser pass of the halftone worker, tracker copy,
  live verification, and real provider connection still requires a human or a
  connected browser. Provider webhook delivery remains unverified without
  provider accounts.

## 2026-11-09 — Two-step onboarding and singleton welcome

- Signup no longer creates a placeholder workspace. `createPersonalAccount`
  creates only the user. The first workspace is created in `/onboarding` from
  the name, photo, and website name the customer chooses.
- `/onboarding` is now the two-step Tartly flow: **Workspace** (photo, name,
  website/app name) → **Website** (domain or URL). It reuses the Tartly shell,
  440px column, 12px/320ms directional step motion, and 70ms stagger.
- A new account with no workspace membership is routed to `/onboarding` after
  Google sign-in and by `/login`; members keep the URL they asked for
  (`resolvePostSignInPath`). The app shell also redirects a workspace-less
  session back to onboarding instead of rendering an empty dashboard.
- Workspace photos are resized in the browser to a 256px WebP/JPEG data URL,
  bounded by `WORKSPACE_LOGO_MAX_LENGTH`, and stored on the new
  `workspace.logo_url` column (migration `20261109130000_workspace_logo`).
  `POST /api/workspaces` and `PATCH /api/workspaces/:id` validate the value.
- Completing onboarding navigates to `/app?welcome=1`. A single
  `AppWelcomeOverlayGate` mounts the halftone **Welcome to Tartly** overlay over
  the real dashboard, consumes the flag with `history.replaceState`, and fades
  out. Reduced motion uses a shorter hold and no halftone animation.
- Workspace creation defaults to the Starter plan so the 7-day trial can create
  the first website; `createWorkspaceForUser` now records `planId` and
  `logoUrl`.
- Tests: registration now asserts no workspace side effect, `post-signin`
  routing, workspace photo validation and PATCH, workspace-logo validation, and
  the Google callback handoff.
- **UNVERIFIED:** a live browser pass of the photo picker, step motion, and
  welcome overlay still requires a human or connected browser.

## 2026-11-09 — Local development without Docker

- Added `scripts/local-db.sh` and `scripts/local-dev.sh` (`pnpm dev:local`,
  `pnpm db:local`) to run a user-owned PostgreSQL cluster from `.local/pgdata`
  on the port in `DATABASE_URL`. No Docker, ClickHouse, Kafka, or Redis is
  required for the local analytics loop.
- Added `scripts/local-smoke.mjs` (`pnpm smoke:local`): register → workspace →
  website → `/api/send` → `/api/websites/:id/stats`. Verified locally:
  `pageviews: 1, visitors: 1, visits: 1`.
- Added `docs/LOCAL_DEVELOPMENT.md` with local and Neon modes, daily commands,
  RAM notes, and troubleshooting. `.local/` is gitignored.
- Current local run: PostgreSQL 18 on `127.0.0.1:5433`, Next.js 16.4.1 on
  `:3000`, `/api/health/ready` returns `database: up`. Neon remains
  **UNVERIFIED** because no Neon connection string is present in this
  checkout; the documented switch is `DATABASE_URL` (pooled) +
  `DATABASE_URL_UNPOOLED` (direct).

## 2026-11-07 — Pricing, trial, and landing update

- `src/lib/plans.ts` is now the single source for the 7-day / 2,000-event
  trial, the eight traffic tiers, and the two paid plans.
- Entitlements, usage metering, and ingestion enforce the trial window:
  2,000 events and 1 website for 7 days, then billable ingestion pauses.
- Dodo checkout requests `subscription_data.trial_period_days` =
  `plan.trialDays` (7). Provider confirmation still controls activation.
- The landing pricing section and `/pricing` share the traffic slider and the
  free-trial card. The slider changes events and price in both paid cards.
- The eight-report tour is a two-row marquee again: four capability cards per row,
  scrolling in opposite directions, pausing on hover and falling back to a static
  grid under `prefers-reduced-motion`. An interactive list variant was tried and
  removed because the original carousel effect read better on the landing page.
- The final CTA is a rectangular blush button with no sparkle icon.
- Hydration hardening: the app store now starts from deterministic server
  defaults (`en-US`, `UTC`, the default date range) and applies stored
  locale/timezone/date-range preferences in a client effect. Tab preferences
  and the date-range setting use `useStoredState`, so localStorage is never
  read during the first render. Date/number output uses an explicit `en-US`
  locale. The landing, pricing, docs, login, and signup pages were reloaded in
  a real browser with stored preferences and produced no hydration warnings.
- Evidence: `src/lib/plans.test.ts`, `src/lib/entitlements.test.ts`,
  `src/lib/usage.test.ts`, `src/features/analytics/server/send/handler.test.ts`,
  and `src/features/marketing/landing/LandingPage.test.tsx`.
- **UNVERIFIED:** Dodo product IDs for each traffic tier do not exist yet.
  Checkout still maps Starter/Pro to the configured monthly/annual products;
  create one product per tier before selling tier-specific prices live.

## 2026-11-07 — CI/CD, coverage enforcement, and supply-chain hardening

- CI is now split into three gated jobs in `.github/workflows/ci.yml`:
  `verify` (format, lint, typecheck, coverage-enforced tests, production audit,
  migrations, PostgreSQL analytics smoke, production build), `security`
  (gitleaks full-history scan, dependency review, CodeQL
  extended/quality queries, Trivy filesystem/secret/misconfiguration scan), and
  `container` (production image build plus CRITICAL image scan). All
  third-party actions are pinned to full commit SHAs.
- `pnpm gate` now runs Vitest with V8 coverage. Floors are statements 65%,
  branches 50%, functions 60%, lines 65%, just below the measured baseline
  (67.6 / 55.6 / 63.4 / 68.0). Reports are uploaded from CI.
- Production dependency audit is clean: `pnpm audit --prod` reports
  "No known vulnerabilities found". `pnpm.overrides` pins patched transitive
  versions (`deepmerge-ts`, `@hono/node-server`, `baseline-browser-mapping`,
  `undici`, `vite`, `ua-parser-js`, `esbuild`, DiceBear, `fflate`, `valibot`).
  `@svgr/cli` moved to devDependencies because it is build-only.
- Remaining moderate/low advisories are in dev tooling (Vitest/Vite test
  runtime, PostCSS/rollup plugins). They do not enter the production image and
  do not fail the production audit; they are tracked for the next tool upgrade.
- `.github/workflows/deploy.yml` deploys the exact SHA that passed CI, after a
  `production` environment approval. `deploy/production/deploy.sh` builds an
  immutable image tag, applies migrations with `DATABASE_URL_UNPOOLED`,
  restarts only the app container, waits for `/api/health/ready`, and
  automatically redeploys the previous SHA when readiness fails.
- `docs/CI_CD.md` records the required environment, secrets, variables,
  branch-protection checks, manual deploy, and rollback commands.
- Evidence: `pnpm gate` green after the dependency changes; `pnpm audit --prod`
  clean; `bash -n deploy/production/deploy.sh` clean. The production container
  path is exercised by the `container` CI job.
- The first container scan found a CRITICAL `tar` advisory from the global
  pnpm installed in the runtime stage. The runtime image now starts through
  `scripts/start-docker.mjs` with no global pnpm, and the migration service
  calls `./node_modules/.bin/prisma` directly. The runtime stage now installs
  production dependencies only and removes npm/npx, so build tooling and its
  advisories never ship. After the fix, a local Trivy 0.70 scan reports 0
  CRITICAL/HIGH findings, and the rebuilt container returns 200 from
  `/api/health/live` and `/api/health/ready` (`database: up`).
- **VERIFIED — production deployed on 2026-11-07.** VPS
  `201.18.197.194` (Ubuntu 26.04, Hostinger KVM 2); non-root `deploy` user in
  the `docker` group; `tartly_ci` key authorized; `/opt/tartly/app` and
  `/opt/tartly/runtime` owned by `deploy`; environment secrets
  `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, and
  variables `APP_URL=https://tartly.in`, `DEPLOY_ENABLED=true` are set.
- Fixes found during the first real deploy: the VPS clone needed an explicit
  `main` refspec; compose consumed the streamed deploy script from stdin;
  `umask 077` produced unreadable runtime scripts; and the runtime `.env`
  overrode the image `BUILD_VERSION`. All four are fixed in
  `deploy/production/deploy.sh`, `Dockerfile`, and the compose service.
- Final pipeline deploy: run 42397381387 succeeded for `04d7023`; the live
  container reports `BUILD_VERSION=04d7023` and is healthy. Branch protection
  and the production environment reviewer are enabled.
- **Merged:** PR #20 (`e20172d`), PR #27 (`54f619b`), and PR #28 (`04d7023`)
  were delivered through the feature-branch → PR → CI → merge loop. Dependabot
  is active for npm, GitHub Actions, and Docker updates.

## Commercial contract (fixed by owner)

Two plans and a **7-day free trial** (owner update, 2026-11-07):

| Plan       | Monthly           | Annual (2 months free) | Events / month | Websites     | Members |
| ---------- | ----------------- | ---------------------- | -------------- | ------------ | ------- |
| Free trial | **$0 for 7 days** | n/a                    | **2,000**      | **1**        | 1       |
| Starter    | **$7.99**         | **$79.90**             | **100,000**    | **1**        | 1       |
| Pro        | **$14.99**        | **$149.90**            | **1,000,000**  | **up to 50** | 10      |

The pricing slider moves through eight traffic tiers from 10k to 2M Starter
events (Pro 100k to 10M) and raises the price with the allowance. The default
tier is the owner-fixed $7.99 / $14.99 point. No third paid plan and no hidden
limits. Event, retention, replay, and feature limits live in
`src/lib/plans.ts`; the trial is time-limited and never renews.

Historical phase notes below that mention the old 50k/500k limits or "no free
tier" are superseded by this section.

## Phase status

| #   | Phase                                      | Status            | % Done | Started    | Finished   | Blockers                                                          |
| --- | ------------------------------------------ | ----------------- | ------ | ---------- | ---------- | ----------------------------------------------------------------- |
| 0   | Audit and baseline                         | DONE              | 100%   | 2026-11-04 | 2026-11-04 | none                                                              |
| 1   | Neon PostgreSQL, Prisma, environment       | DONE_WITH_CAVEATS | 100%   | 2026-11-04 | 2026-11-04 | Neon credentials                                                  |
| 2   | Workspaces, memberships, RBAC              | DONE_WITH_CAVEATS | 95%    | 2026-11-04 | 2026-11-05 | copy-with-data rehearsal; legacy table drop                       |
| 3   | Tenant isolation hardening + tests         | DONE              | 100%   | 2026-11-05 | 2026-11-05 | none (RLS deferred by decision)                                   |
| 4   | Authentication and account management      | DONE_WITH_CAVEATS | 100%   | 2026-11-05 | 2026-11-05 | live Resend send                                                  |
| 5   | Platform billing (Dodo)                    | DONE_WITH_CAVEATS | 90%    | 2026-11-05 | 2026-11-05 | live Dodo test mode                                               |
| 6   | Plans, pricing economics, usage            | IN_PROGRESS       | 90%    | 2026-11-04 | —          | live concurrency proof; owner approval of limits                  |
| 7   | Analytics validation, integrations, replay | DONE_WITH_CAVEATS | 100%   | 2026-11-05 | 2026-11-06 | live provider webhooks; ClickHouse; real browser recorder runtime |
| 8   | Onboarding and developer experience        | DONE_WITH_CAVEATS | 100%   | 2026-11-04 | 2026-11-06 | browser walkthrough                                               |
| 9   | Rebrand and product UI                     | DONE              | 100%   | 2026-11-04 | 2026-11-05 | none                                                              |
| 10  | Compliance, abuse, email, operations       | DONE_WITH_CAVEATS | 100%   | 2026-11-06 | 2026-11-06 | lawyer review; live Resend delivery                               |
| 11  | Hardening, QA, deployment, launch          | DONE_WITH_CAVEATS | 95%    | 2026-11-06 | 2026-11-06 | hosting/DNS; Neon restore; browser walkthrough                    |
| 12  | Go-to-market                               | DONE_WITH_CAVEATS | 100%   | 2026-11-06 | 2026-11-06 | launch execution and day-of price re-verification                 |

---

## Phase 0 — Audit and baseline

**Goal:** understand the real codebase before changing anything.

### Tasks

- [x] Inspect `package.json`, `pnpm-lock.yaml`, Prisma schema and migrations,
  `prisma.config.ts`, auth/session code, user/team/website/collaborator
  models, API routes, ingestion, tracker, replay, attribution, payment
  integrations, webhooks, dashboard queries, jobs, Redis, ClickHouse,
  Docker, environment config, tests, security-sensitive code. — proof:
  `docs/SAAS_CONVERSION_AUDIT.md` §1–§11.
- [x] Record actual installed versions (Next.js, React, Prisma, Node, pnpm). —
  proof: audit §1 (Next 16.2.6, React 19.2.5, Prisma 7.6.0, Node 24.13.0,
  pnpm 10.10.0).
- [x] Map every major data flow (visitor → tracker → ingestion → storage →
  queries → dashboard; payment provider → webhook → normalization →
  customer matching → attribution → revenue reports). — proof: audit §2,
  §7.
- [x] State explicitly where events and replays are stored. — proof: audit §3
  (PostgreSQL by default; optional ClickHouse/Kafka; mirror for attribution).
- [x] LICENSE audit: `LICENSE`, non-MIT directories, trademarked assets and
  fonts, restrictive dependency licenses. — proof:
  `docs/LICENSE_AND_BRAND_AUDIT.md`.
- [x] Check <https://github.com/talivia-group/agent>: exists? license? reusable? —
  proof: audit §4; API returned MIT, not archived, reusable with attribution.
- [x] Run install, build, lint, typecheck, and tests; record baseline including
  pre-existing failures. — proof: audit §12; `pnpm build` exit 0,
  `pnpm lint` pass, `tsc --noEmit` pass, tests 479 pass / 3 fail.
- [x] Create `docs/SAAS_CONVERSION_AUDIT.md`. — proof: file exists.
- [x] Create `docs/LICENSE_AND_BRAND_AUDIT.md`. — proof: file exists.
- [x] Recommend hosting for the Next.js app and event store with rough monthly
  costs and cited sources. — proof: audit §13 (Vercel/Railway, Neon,
  ClickHouse; sources fetched 2026-11-04).

### Acceptance criteria

- [x] Both audit docs exist and reference real repo file paths. — proof:
  `docs/SAAS_CONVERSION_AUDIT.md`, `docs/LICENSE_AND_BRAND_AUDIT.md`.
- [x] Baseline build and test results are recorded, including failures. —
  proof: audit §12.
- [x] Event and replay storage architecture is stated explicitly. — proof:
  audit §3.
- [x] The audit lists every tenant-owned table/entity lacking a workspace link. —
  proof: audit §4 table (39 models).
- [x] No application code has been changed. — verified at the time of the
  audit; later phases then began modifying code.

### Decisions made

- (pending)

### Unverified / Assumed

- (pending)

### Needs from the human

- None yet.

---

## Phase 1 — Neon PostgreSQL, Prisma, and environment setup

**Goal:** run the relational data on Neon safely, with separate runtime and
migration connections.

### Tasks

- [x] Confirm installed Prisma version (7.6.0) and evaluate
  `@prisma/adapter-pg` (already used) versus the Neon serverless adapter.
  Choose one and document why. — proof: `@prisma/adapter-pg` retained; the
  existing `src/lib/prisma.ts` already uses it and it works with Neon's
  pooled host. The Neon adapter is unnecessary until edge/serverless
  deployment requires HTTP. Recorded in `docs/ENVIRONMENT.md`.
- [x] `DATABASE_URL` (pooled host) for runtime; `DATABASE_URL_UNPOOLED` (direct
  host) for migrations; update `prisma.config.ts` for Prisma 7. — proof:
  `prisma.config.ts` (CLI uses unpooled, falls back locally).
- [x] Singleton Prisma client, safe under hot reload (already present in
  `src/lib/prisma.ts`) — verify and harden. — proof: existing
  `globalThis[PRISMA]` cache retained; pool timeouts added.
- [x] Connection timeouts + retry on transient errors/cold starts. — proof:
  `src/lib/prisma.ts` (15s connect / 30s idle, max 10) and
  `src/lib/db-retry.ts` with `P1001/P1002/P1017/P2024` handling; raw reads
  use `withDbRetry`.
- [x] `.env.example` with every variable, a comment each, no real secrets;
  confirm `.env*` is gitignored. — proof: `.env.example`, `.gitignore:50`.
- [x] `docs/ENVIRONMENT.md` (variables, Neon strings, pooled vs direct, local /
  preview / production). — proof: file exists.
- [x] `docs/NEON_BRANCHING.md` (production, development, preview branches;
  migration promotion; local never points at production). — proof: file
  exists.
- [x] Verify migrations apply cleanly to an empty database (local PostgreSQL if
  no Neon credentials; list the Neon run still required). — proof:
  `pnpm exec prisma migrate deploy` applied 4 migrations (including the new
  workspace migration) to a fresh PostgreSQL 17 database on 2026-11-04.
- [x] Health endpoint that checks database connectivity without leaking
  details. — proof: `GET /api/health` returned
  `{ok:true,database:"up"}`; after stopping PostgreSQL it returned
  `{ok:false,database:"down"}` with HTTP 503 and no error detail.

### Acceptance criteria

- [x] `prisma migrate deploy` succeeds on an empty database (proof recorded). —
  **local proof only**; Neon run still needs the human.
- [x] App starts and health check passes. — proof: `pnpm dev` + curl as above.
- [x] No credentials in git history or source. — `.env` is ignored; no real
  credentials were added. `git log` on `.env` is empty.
- [x] Docs let a new developer set up from them alone. — proof:
  `docs/ENVIRONMENT.md` includes prerequisites, variables, local/Neon,
  commands, troubleshooting.

### Decisions made

- Keep `@prisma/adapter-pg` rather than adding the Neon serverless adapter:
  the app runs on Node, the adapter is already proven, and adding a second
  driver increases surface area. Revisit only if we deploy to an edge runtime.
- Migrations use the direct host via `prisma.config.ts`; runtime keeps the
  pooled URL. Local fallback is allowed for DX, but production must set both.
- Retry only idempotent reads. Writes are not retried because a committed write
  followed by a dropped connection would otherwise duplicate data.

### Unverified / Assumed

- **UNVERIFIED:** the actual Neon pooled/direct URLs and a Neon-run migration.
  No Neon credentials exist in this environment.
- **UNVERIFIED:** Neon cold-start latency with the 15s connect timeout; measure
  in staging.

### Needs from the human

- Neon project + pooled/direct connection strings; run `migrate deploy` once
  against the empty production branch and record the output.

## Phase 2 — Multi-tenant workspaces, memberships, and RBAC

**Goal:** convert installation-level users into a real workspace-based SaaS.

### Tasks

- [x] Add `Workspace` (`id`, `name`, `slug`, `ownerId`, `planId`,
  `subscriptionStatus`, timestamps, `deletedAt`). — proof:
  `prisma/schema.prisma` (`model Workspace`).
- [x] Add `WorkspaceMembership` (`workspaceId`, `userId`, `role`, unique pair). —
  proof: schema + `workspace_membership` migration.
- [x] Add `WorkspaceInvitation` (`email`, `role`, `invitationTokenHash`,
  `invitedBy`, `expiresAt`, `acceptedAt`). Never store plaintext tokens. —
  proof: `src/lib/workspace-invitations.ts`, API routes, `/invite/[token]`
  UI, 8 unit tests (hash-only storage, expiry, email match, revoke).
- [x] Roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`. — proof:
  `src/lib/workspace-auth.ts`.
- [x] Every `Website` belongs to exactly one workspace; preserve existing IDs
  and tracking IDs. — proof: `website.workspace_id` nullable for legacy,
  backfilled; new websites set it. Exactly-one is enforced in the new path,
  not yet at the DB level (see Phase 3).
- [x] Reversible data migration moving existing data into workspaces. — proof:
  `prisma/migrations/20261104180000_workspaces/migration.sql` creates a
  personal workspace per user, OWNER membership, and attaches user/team
  websites. Reversal is documented as dropping the table/column (data
  assignment is lost on reverse; export first).
- [x] Registration creates user + personal workspace + OWNER membership + plan
  in **one transaction**. — proof: `src/lib/registration.ts`,
  `POST /api/auth/register`, `/signup`, 3 transaction tests. Usage period
  still arrives with metering in Phase 6.
- [x] One member surface: workspace membership now owns every member list,
  invite, role, and removal. Website Settings → Team lists the owning
  workspace's members and links to workspace settings; the duplicate
  per-website member UI, hook, API routes, and handlers were deleted. —
  proof: `src/features/websites/settings/WebsiteTeamSettings.tsx` reads
  `/api/workspaces/[workspaceId]/members`; `WebsiteTeamSettings.test.tsx`
  (3 tests) covers manage/read-only/no-workspace states;
  `src/lib/app-structure.test.ts` fails if the per-website member surface
  returns. This fixes a real bug where a website Team invite appeared to
  grant access but the workspace authorization layer ignored it.
- [ ] Drop the legacy `Team` / `TeamUser` rows and the `WebsiteMember` fallback
  once all pre-workspace websites are migrated. — **UNVERIFIED**: requires
  a data rehearsal on a copy of real installation data. `website_member`
  remains a read-only fallback for legacy websites only; it is no longer
  writable from the application.
- [x] One central authorization module
  (`requireWorkspaceAccess(user, workspaceId, minRole)`) used by every API
  route and server action. — proof: `src/permissions/website.ts` now
  resolves every website through workspace membership; all 72 inherited
  website routes pass through it. `src/lib/tenant-boundaries.test.ts`
  fails if a tenant route loses its guard.
- [x] Document permission matrix: OWNER (everything, billing, delete
  workspace), ADMIN (websites, analytics, integrations, invites; not
  ownership transfer or workspace delete), MEMBER (view + manage allowed
  websites), VIEWER (read-only). — proof: `docs/UI_DESIGN_SYSTEM.md` §? and
  `src/lib/workspace-auth.ts`; unit tests cover all four roles.
- [x] Workspace switching, creation, invitations (send/accept/revoke/expire). —
  proof: `WorkspaceSwitcher` in the app nav, `/app/settings/workspace`
  members/invitations UI, `/api/workspaces/[workspaceId]/members`, and
  `/api/workspaces/[workspaceId]/invitations`.
- [x] Separate internal platform-admin role, independently protected; no public
  bootstrap admin and no default credentials. — proof:
  `src/lib/platform-admin.ts` requires `PLATFORM_ADMIN_EMAILS` in
  production; the bootstrap row is disabled by
  `20261104190000_remove_default_admin`.

### Acceptance criteria

- [ ] Migration applies on a copy of existing data without loss. — local empty
  DB proof only; a copy-with-data rehearsal is pending.
- [x] Registration transaction test: forced mid-way failure leaves no orphans. —
  proof: `src/lib/registration.test.ts` (all writes in one transaction;
  duplicate account rejected before opening it).
- [x] Permission matrix implemented in one module and unit tested for all four
  roles. — proof: `src/lib/workspace-auth.test.ts` (7 tests, all passing).
- [x] Grep shows no route/server action reading tenant data without the
  authorization module (exceptions listed explicitly). — proof:
  `src/lib/tenant-boundaries.test.ts` allowlists only `workspaces/route.ts`
  (self-scoped by `auth.user.id`) and invitation/member routes that
  delegate to guarded functions.
- [x] Live API smoke on the production build (2026-11-05): two accounts
  registered, website created in A, A read it, B rejected on the website
  and on `/stats` by ID swap, unauthenticated read rejected, Starter
  website and member limits enforced, Pro invitation accepted by the
  invited email, MEMBER could not delete, and the invitation was single-use.
  All 17 assertions passed; smoke rows were deleted afterwards.

### Decisions made

- Workspaces are additive for legacy rows but authoritative for every new
  website. The inherited 72 website routes were migrated by rewriting the
  shared permission helpers, not by editing each route.
- `requireWorkspaceAccess` never auto-authorizes the legacy `admin` role. The
  platform-admin console will use a separate, audited path.
- Invitation tokens are hashed at rest; the plaintext token exists only in the
  invitation email/response and is never stored.
- Until platform billing exists, a user may own only one workspace and cannot
  choose Pro at signup. This prevents minting extra plan allowances for free.

### Unverified / Assumed

- **UNVERIFIED:** the team-owned website backfill on real data. The SQL attaches
  team websites to the team owner's workspace; a team with no `team-owner` row
  leaves `workspace_id` null.
- **ASSUMED:** one personal workspace per user is the right default for the
  target audience. Agency multi-workspace ownership waits for billing so a
  second workspace cannot create a second unpaid allowance.

### Needs from the human

- Rehearse the workspace migration on a copy of real installation data and
  confirm every website received a `workspace_id`.

## Phase 3 — Tenant isolation hardening and mandatory isolation tests

**Goal:** make cross-tenant access impossible, and prove it.

### Tasks

- [x] Inventory every tenant-owned resource and confirm each links to a
  workspace: websites, reports, segments, payment connections, revenue
  records, subscriptions, API keys, imports, historical metrics,
  attribution configs, audit records, replays, sessions, events, shares,
  boards, links, pixels. — proof: `docs/TENANCY.md`; boards/links/pixels
  are explicitly legacy and their create endpoints are disabled.
- [x] Explicit tenant scoping on every website read/update/delete/create. —
  proof: central `canViewWebsite`/`canUpdateWebsite`/`canDeleteWebsite`
  plus `requireWebsiteAccess`. Composite DB constraints remain open below.
- [x] Event store: every query/write includes the website ID resolved from an
  authorized workspace. — proof: inherited SQL joins key on
  `website_id`; analytics routes reject unauthorized website IDs before
  querying.
- [x] Cache keys include tenant and website identifiers; document
  contamination checks. — proof: `src/lib/load.ts` now uses
  `session:${websiteId}:${sessionId}` and rejects a cached session whose
  `websiteId` differs. `docs/TENANCY.md` §Cache keys.
- [x] Evaluate PostgreSQL RLS as defence in depth. With Neon pooling use
  transaction-scoped context only (`SET LOCAL`); otherwise document why. —
  proof: decision recorded in `docs/TENANCY.md`: every pooled query would
  need transaction-scoped `SET LOCAL` plus policies on ~39 tables;
  application checks + the static boundary test are the launch control.
- [x] Isolation tests: Workspace A/User A/Website A vs Workspace B/User
  B/Website B. A can access A; A cannot access B analytics, replays,
  revenue, settings, API keys, exports; ID swapping does not expose B;
  direct API calls cannot bypass. — proof:
  `src/permissions/website.workspace.test.ts` (10 scenarios) plus the
  static route-boundary test.
- [x] Webhook and background-job isolation tests. — proof:
  `src/features/payments/server/stripe/[websiteId]/webhook/handler.test.ts`
  asserts connection lookup, payment write, and provider event write all use
  the URL website;
  `src/features/system/cron/jobs/provider-webhook-cleanup.test.ts` asserts
  each queued job uses only its own credentials and endpoint.
- [x] CI step runs isolation suite on every push. — proof: the existing
  `pnpm test` step in `.github/workflows/ci.yml` includes every
  `*.test.ts` suite.

### Acceptance criteria

- [x] All ten isolation scenarios pass, each with a named test. — proof:
  `src/permissions/website.workspace.test.ts`.
- [x] Webhook and background-job isolation tests pass. — proof: the two
  suites above (13 + 7 tests) pass.
- [x] Failing scenarios fixed, not skipped; otherwise phase BLOCKED. — proof:
  the three new-suite failures during the restructuring run were fixed; the
  remaining full-suite failures are the five documented baseline flakes.

### Decisions made

- Application-level authorization is the primary control for now. RLS is
  deferred because Neon pooled connections would require transaction-scoped
  `SET LOCAL` context on every query; revisit before enterprise sales.
- Legacy rows without `workspace_id` are readable only through the old owner/
  team path. New routes reject them via `requireWebsiteAccess`.
- Boards, links, and pixels are frozen legacy features rather than migrated
  until their create endpoints return.
- A real cache-contamination bug was found and fixed: cached sessions were
  keyed by `sessionId` alone. The key now includes `websiteId` and the cached
  row is checked against the requested website before use.
- RLS is explicitly deferred to pre-enterprise; relying on a forgotten
  `SET LOCAL` would make isolation failures silent.

### Unverified / Assumed

- Cache keys are not yet audited for tenant identifiers.
- Webhook and background-job isolation is not yet tested.

### Needs from the human

- None yet.

---

## Phase 4 — Authentication and account management

**Goal:** production-grade SaaS auth with the smallest reliable change.

### Tasks

- [x] Inspect existing session/auth implementation first; reuse if sound. Do
  not introduce Clerk/Auth.js/Better Auth unless justified in writing. —
  proof: no auth framework added; the existing username/password base is
  retained and made production-safe.
- [x] Registration, login, logout, session management, email verification,
  password reset, secure hashing, profile updates, account settings,
  workspace deletion, account deletion. — proof: `/api/auth/*`,
  `/api/me/account`, `/api/workspaces/[workspaceId]` DELETE/PATCH;
  bcryptjs cost 10; `/verify-email`, `/forgot-password`, `/reset-password`.
- [x] Cookies: Secure, HttpOnly, SameSite=Lax; 30-day server-side expiry;
  password change/reset revokes every session. — proof:
  `src/lib/auth-cookie.ts`, `src/lib/auth-session.ts`, migration
  `20261104185008_auth_sessions`, `src/lib/auth-session.test.ts`.
- [x] CSRF protection where applicable. — proof: `src/lib/csrf.ts`; cookie-auth
  unsafe requests with a foreign Origin/Referer return 403
  `csrf-rejected`; SameSite=Lax is the second layer.
- [x] Rate limiting + brute-force protection on login, registration, password
  reset, verification resend. — proof: atomic Postgres fixed windows in
  `src/lib/rate-limit.ts`; per-IP and per-account/email keys; no Redis
  dependency.
- [x] Hashed, single-use, expiring reset and verification tokens. — proof:
  `src/lib/auth-tokens.ts` (24h verification, 1h reset, SHA-512 at rest,
  consumption and state change in one transaction).
- [x] Remove default admin credentials and customer-facing self-hosted admin
  path. — proof: migration `20261104190000_remove_default_admin` disables
  the bootstrap `admin` row only while it still has the known password
  hash; `src/lib/platform-admin.ts` requires `PLATFORM_ADMIN_EMAILS` in
  production, so `role === 'admin'` alone is not a platform grant.
- [x] Email provider abstraction (Resend or similar) with dev-mode outbox. —
  proof: `src/lib/email.ts`; without `RESEND_API_KEY` development writes to
  `.dev-emails/outbox.log` (gitignored), never to application logs.
- [x] Account deletion with a typed confirmation and password re-check. —
  proof: `DELETE /api/me/account`; soft-deletes owned workspaces, revokes
  sessions, anonymises the user row, and leaves event purge to the
  tenant-scoped retention job.
- [x] Separate platform-admin role (environment allowlist), no public
  bootstrap admin. — proof: `src/lib/platform-admin.ts` + tests.

### Acceptance criteria

- [x] Tests for login, logout, expired/revoked session, password reset
  (single use, expiry), email verification, rate limiting. — proof:
  `auth-session.test.ts`, `auth-tokens.test.ts`, `rate-limit.test.ts`,
  `login/route.test.ts`, `logout/route.test.ts`,
  `password/forgot|reset` route tests, `email/verify` route test.
- [x] No plaintext passwords/tokens in DB or logs. — proof: bcrypt hashes;
  only SHA-512 token hashes stored; the login response no longer contains
  the session token; local email bodies go to `.dev-emails/outbox.log`,
  not logs.
- [x] Repo search finds no default admin credentials. — proof: bootstrap row
  disabled by migration; `grep` finds only documentation of its removal.
- [x] Live smoke on the production build (2026-11-05): 17/17 assertions
  passed — register sets an HttpOnly/SameSite cookie with no token in the
  body, cookie auth, workspace/website creation, real stats read, reset
  writes to the development outbox, reset revokes the old session and old
  password, new password signs in, logout revokes, and a second account is
  denied the first tenant's website by ID.

### Decisions made

- Durable PostgreSQL sessions behind an HttpOnly cookie replace
  localStorage bearer tokens. The raw token is never returned in a response
  body; API integrations use API keys.
- Login/signup/reset rate limits use PostgreSQL rather than Redis so a missing
  cache cannot disable brute-force protection. They fail open only if the
  database itself is unavailable, at which point login cannot work anyway.
- Email verification does not hard-gate the dashboard. It is recorded on the
  user and can gate paid features later without blocking activation.
- Account deletion is a soft delete. Hard-deleting event/replay payloads is a
  separate, tenant-scoped retention job (Phase 7/10), not a request handler.
- Platform administration requires `PLATFORM_ADMIN_EMAILS`; the legacy
  self-hosted `role === 'admin'` is no longer sufficient in production.

### Unverified / Assumed

- **UNVERIFIED:** a live Resend delivery (no `RESEND_API_KEY` or verified
  domain in this environment). The log/outbox transport is exercised locally.
- **UNVERIFIED:** a browser walkthrough of verification and reset emails from a
  real inbox; API and unit tests cover the token lifecycle.

### Needs from the human

- `RESEND_API_KEY` + verified sending domain for live verification/reset mail.

---

## Phase 5 — Platform billing (Dodo Payments) and subscription lifecycle

**Goal:** charge customers (context A only).

### Tasks

- [x] Inspect existing Dodo analytics integration; keep it separate. — proof:
  `features/payments` still owns per-website analytics connections;
  `features/billing` has its own provider, credentials, webhook route, and
  tables. `docs/PLATFORM_BILLING.md` records the boundary.
- [x] Check current Dodo SDK/docs for subscriptions, checkout, portal,
  webhooks. Record URLs and dates. — proof: `docs/PLATFORM_BILLING.md`
  lists checkout, patch subscription, change plan, customer portal, and
  webhook docs fetched 2026-11-05. Uses installed `dodopayments@2.42.2`.
- [x] `BillingProvider` interface (create customer, create subscription, start
  checkout, update, cancel, status, webhooks, invoices, portal) with Dodo
  implementation; extensible to Stripe later. — proof:
  `features/billing/server/provider.ts` +
  `features/billing/server/providers/dodo.ts` (checkout, portal,
  cancel-at-period-end, change plan).
- [x] Models: `BillingCustomer`, `SubscriptionPlan`, `Subscription`,
  `BillingEvent`, `InvoiceRecord`, `SubscriptionChange`; store provider IDs;
  one independent subscription per workspace. — proof: migration
  `20261105150000_platform_billing` adds `billing_customer`,
  `platform_subscription` (one per workspace), `billing_event`,
  `billing_invoice`, `billing_subscription_change`. Plan prices stay in
  `src/lib/plans.ts`, so no duplicate `SubscriptionPlan` table was needed.
  `prisma migrate deploy` applied it cleanly and all five tables exist.
- [x] Webhooks: raw-body signature verification, idempotency via stored event
  IDs, duplicate protection, out-of-order handling, retry-safe processing,
  failure/cancel/expiry/refund events. — proof:
  `features/billing/lib/standard-webhook.ts` (HMAC over
  `id.timestamp.body`, timestamp tolerance, constant-time compare);
  `features/billing/server/service.ts` (unique `webhook-id`, failed retries
  re-claimable, timestamp+priority ordering, unmatched/unsupported events
  recorded); `handler.test.ts` and `service.test.ts`.
- [x] Lifecycle states: `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`,
  `EXPIRED`, `SUSPENDED` (no FREE plan; no free tier). — proof:
  `src/lib/billing-lifecycle.ts` + `billing-lifecycle.test.ts`.
- [x] Cancel-at-period-end keeps access until paid period ends. — proof:
  `billingSubscriptionHasAccess` grants access for `CANCELLED` only while
  `currentPeriodEnd` is in the future; cancel handler schedules it with the
  provider; acceptance test in `billing-lifecycle.test.ts`.
- [x] Never activate from a checkout redirect; confirm via provider status or
  webhook. — proof: checkout returns only `{url}`; no code writes a
  subscription outside `processDodoWebhook`.
- [x] Entitlements come from backend subscription records only. — proof:
  `src/lib/entitlements.ts` reads `platform_subscription` first and only
  falls back to the legacy workspace status for pre-billing rows. Paid
  features also require `active`.
- [x] Billing settings page: plan, period, usage, next renewal, status,
  upgrade/downgrade, cancel, portal/invoice links. No fake invoices. —
  proof: `features/billing/components/BillingSubscriptionPanel.tsx` inside
  `/app/settings/billing`; invoice rows come only from
  `billing_invoice`.

### Acceptance criteria

- [x] Replayed webhook creates no duplicates. — proof:
  `service.test.ts` ("ignores a replay…") and
  `webhook/dodo/handler.test.ts` ("acknowledges a replayed event…").
- [x] Out-of-order events converge to the correct state. — proof:
  `service.test.ts` ("does not let an older snapshot overwrite newer
  state") and `billing-lifecycle.test.ts`.
- [x] Invalid signature rejected. — proof:
  `standard-webhook.test.ts` and `webhook/dodo/handler.test.ts`
  (400 `webhook-invalid-signature`, provider mock not called).
- [x] Cancel-at-period-end retains access. — proof:
  `billing-lifecycle.test.ts` (future/past period cases).
- [ ] Documented manual test against Dodo test mode, or exact steps for human.
  — exact steps are in `docs/PLATFORM_BILLING.md`; **not executed** because
  no Dodo keys exist in this environment.

### Decisions made

- Platform billing is a separate domain with separate env credentials. The
  analytics Dodo integration is never reused for charging customers.
- Plans remain code config (`src/lib/plans.ts`). The database stores the
  subscription, not a second copy of plan prices.
- Checkout is created server-side and returns only a URL. A success redirect
  never changes access.
- Entitlements read `platform_subscription`; the workspace plan/status columns
  are mirrored for legacy compatibility only.
- Webhook bodies are stored for audit, but no customer email or provider secret
  is returned by the billing API or written to logs.
- An unknown product ID is recorded as `unsupported` instead of defaulting to
  Starter, so misconfiguration cannot silently grant limits.

### Unverified / Assumed

- **UNVERIFIED:** live Dodo test-mode checkout, webhook delivery, portal, and
  prorated plan change. Unit and route tests use mocks; no provider key exists.
- **ASSUMED:** Dodo re-signs dashboard replays; the 5-minute Standard Webhooks
  timestamp tolerance would reject a replay that reuses an old signature.
- **ASSUMED:** annual product IDs are optional; the UI disables an annual price
  until its product exists.
- **RESOLVED:** registration still stores Starter as the setup plan, but a
  workspace without an active subscription is capped at the one-time 1,000-event
  setup allowance (`SETUP_EVENT_ALLOWANCE`), not the Starter 50,000. Onboarding can
  create a website and verify the tracker, then ingestion returns
  `subscription_required` at the cap. Replay is disabled. This closes the
  "free Starter forever" leak without blocking activation.

### Needs from the human

- Dodo Payments test and live API keys, monthly (and optional annual) product
  IDs for Starter and Pro, and the billing webhook signing secret. Then run the
  manual test in `docs/PLATFORM_BILLING.md`.

---

## Phase 6 — Plans, pricing economics, and usage metering

**Goal:** competitive pricing that still makes money, with trustworthy metering.

### Tasks

- [x] One plan config (`src/lib/plans.ts`): monthly/annual price, website
  allowance, event allowance, member allowance, retention, replay
  allowance, feature flags, export/integration permissions. Adding a plan
  must not require touching unrelated components. — proof:
  `src/lib/plans.ts`, 6 unit tests.
- [x] **Exactly two plans: Starter $7.99/mo (1 website) and Pro $14.99/mo
      (up to 20 websites). No free tier.** — proof: `PLANS` + tests.
- [x] `docs/PRICING_ECONOMICS.md`:
  - [x] Fetch official pricing for DataFast, Talivia Cloud, Plausible, Fathom,
    Umami Cloud, Simple Analytics; cite URL + date; mark unverified items.
  - [x] Estimate hosting, event store, Neon compute/storage, replay storage,
    email, billing fees.
  - [x] Model 100 / 500 / 1,000 / 5,000 customers with stated assumptions.
  - [x] Gross margin per plan. — 89.4% at 100 customers, 93.6% at 5,000.
  - [x] Final prices and event limits. Owner-fixed prices $7.99 / $14.99;
    limits proposed: 50k/500k events, 90/180-day retention, replay Pro-only.
- [x] Usage metering: only accepted, valid, deduplicated, non-bot events.
  Replays metered separately. Atomic under concurrent ingestion. Durable
  DB source of truth; caches display-only. Monthly `UsagePeriod` reset. —
  proof: `prisma/migrations/20261105120000_usage_metering`, `src/lib/usage.ts`
  (atomic `INSERT ... ON CONFLICT ... WHERE` reservation, release on failed
  write, replay session dedupe), collector reservation in
  `src/app/api/send/route.ts`, replay entitlement + metering in
  `src/app/api/record/route.ts`, 11 unit tests. Documented in
  `docs/USAGE_METERING.md`.
- [x] Limit policy: 80% and 100% notices, small grace, then pause billable
  ingestion; dashboard stays accessible; no silent deletion; no automatic
  overage unless opted in. — proof: `USAGE_WARNING_RATIO`, `EVENT_GRACE`
  (1,000 events), `REPLAY_GRACE` (100 sessions) in `src/lib/usage.ts`; the
  collector pauses at the hard limit while reads stay open; in-app banner
  in `src/app/(main)/UsageBanner.tsx`. Email notices wait for Phase 10.
- [x] Usage UI: current usage, allowance, remaining, percentage, reset date,
  upgrade prompt. — proof: `/app/settings/billing`
  (`UsageSettingsPage.tsx`) with plan, reset date, website/member limits,
  event and replay bars, grace/limit copy, and upgrade path; settings nav
  updated.

### Acceptance criteria

- [x] `PRICING_ECONOMICS.md` has cited sources, assumptions, margin table.
- [x] At least one tier adjusted if the numbers required it, or the doc
  explains why none was needed. — prices were fixed by the owner; the doc
  adjusts **limits** (replay Pro-only, 90/180-day retention) to keep margin
  above 85%.
- [x] Concurrency test: parallel ingestion never under/overcounts. — proof:
  `docs/LOAD_TEST.md` recorded 10,000 accepted events at 50 concurrent
  clients, 0 errors, 10,001 stored rows and a matching 10,001 usage count.
  The probe also found and fixed the pre-reservation session leak. This is
  a single-node proof, not a distributed 1M-RPS proof; CI still does not run
  a load test.
- [x] Tests for 80%/100% thresholds, grace, month rollover. — proof:
  `src/lib/usage.test.ts` (thresholds, grace boundary, UTC month range,
  zero allowance, event/replay reservation, replay dedupe).

### Decisions made

- Prices fixed by owner: Starter $7.99, Pro $14.99; no free tier.
- A workspace without an active subscription gets a one-time 1,000-event setup
  allowance, not the Starter plan. It exists only to verify the tracker before
  checkout; at the cap, ingestion returns `subscription_required`. Replay is
  disabled. Verified live on 2026-11-06 (counter set to 999, event 1,000
  accepted, event 1,001 rejected with `limit: 1000, used: 1000`; the counter
  never resets). Stored in `workspace.setup_events_count` via migration
  `20261106130000_setup_allowance`, not in `usage_period`.
- Website limits fixed by owner: Starter 1, Pro 20.
- Starter excludes replay to protect margin at 100 customers; Pro gets 2,000
  replays/month with 30-day replay retention.
- Annual = two months free only because the model stays above 89%.
- Usage is counted with a reserve-then-write pattern. The reservation is a
  single conditional SQL statement; a failed event write releases the slot. This
  is cheaper and safer than scanning analytics rows or incrementing after the
  write.
- The metering period is the UTC calendar month until platform billing exists.
  Counters are keyed by an absolute `period_start`, so moving to a provider
  billing period is a boundary change, not a schema rewrite.
- Replay is metered once per session per period, not per chunk. Retries and
  multi-chunk recordings are idempotent.
- The grace allowance is 1,000 events and 100 replay sessions. It is a constant
  in `src/lib/usage.ts`, not a hidden plan limit, and it is shown in the UI.
- The usage page is in **Settings → Plan and usage** so plan, allowance, and
  limit state live next to workspace and member limits rather than in a
  standalone billing silo.

### Unverified / Assumed

- Event/retention/replay limits are proposals pending owner approval.
- Event size (1 KB) and replay size (0.5 MB/session) are assumptions; Phase 7
  must measure them.
- Dodo fee assumes US cards; international adds ~3 points.

### Needs from the human

- Approve the proposed event/replay/member/retention limits.
- Dodo product IDs/prices for Starter and Pro (Phase 5).

## Phase 7 — Analytics engine validation, integrations, replay entitlements

**Goal:** prove inherited analytics works per tenant without rewriting it.

### Tasks

- [x] Validate visitors, unique visitors, pageviews, sessions, bounce rate,
  duration, geography, browsers, OS, devices, screens, referrers, landing
  and exit pages, UTM, real-time dashboard. — proof:
  `docs/ANALYTICS_VALIDATION.md`; `phase7-smoke.ts` seeded an isolated
  website and passed **48 assertions** against PostgreSQL 17 on 2026-11-06
  (pageviews 7, visitors 3, visits 4, bounces 2, 180 s duration, top/
  landing/exit pages, referrers, UTM source/campaign, browser, OS, device,
  screen, country, language, channels, date range, real-time totals, and
  active visitors). The seeded rows were removed in a `finally` block.
- [x] Keep first-touch and last-touch attribution. Tests from realistic
  journeys (organic, paid, referral, multi-touch, recurring revenue). Fix
  only verified bugs and log each. — proof:
  `src/features/payments/server/queries/attribution-journeys.test.ts`
  (organic → paid retarget, referral last touch, direct purchase, recurring
  subscription history, unattributed payment) and
  `revenueAttribution.test.ts` (first-touch default, last-touch switch).
  One verified bug was fixed: `getChannelMetrics` now treats `NULL`
  referrer/query columns (legacy/import rows) as direct/referral instead of
  only empty strings; a unit test pins the null-safe SQL and the smoke suite
  seeds a `NULL` direct event.
- [x] Payment integrations (Stripe, Dodo, Lemon Squeezy, Polar, Yolfi, Manual
  Payment API): verify capabilities in code. Per-website/per-workspace
  connections. Encrypt credentials. Validate webhooks. Handle subscriptions,
  renewals, cancellations, refunds, disputes, duplicates. Never return
  secrets. — proof: `docs/PAYMENT_PROVIDER_CAPABILITIES.md` records the
  code-verified matrix and explicit gaps (Dodo subscription lifecycle,
  non-Stripe disputes, historical import limits). Connections remain
  per-website; new secrets are `enc:`-encrypted; webhook handlers dedupe by
  provider event and never return credential refs. Live delivery is
  **UNVERIFIED**.
- [x] Session replay: gate by plan entitlement, meter separately, enforce
  retention, mask sensitive inputs by default, respect consent, isolate per
  tenant, payloads outside tenant tables. — proof:
  `src/features/analytics/server/record/handler.test.ts` (9 tests: Starter
  and no-plan rejection before reservation, Pro metering, over-limit
  rejection, failed-write release, website switch, legacy workspace,
  missing/invalid session token). `src/recorder/privacy.js` +
  `privacy.test.ts` prove `maskAllInputs: true` by default, strict text
  masking, and `data-consent="required"` gating via
  `window.__taliviaSetConsent` or `talivia:consent`. Replay bytes stay in
  website-scoped `session_replay`, outside tenant relational tables.
- [x] Retention jobs: delete data older than plan allows; tenant-safe and
  idempotent. — proof:
  `src/features/system/cron/jobs/analytics-retention.ts` runs daily at
  03:30 UTC, resolves each website's plan, deletes replays, event data,
  session data, events, sessions, and analytics revenue past the cutoff,
  and detaches durable payment/subscription links first. Every mutation
  carries `websiteId`; `ANALYTICS_RETENTION_DRY_RUN=true` counts only. Five
  unit tests cover Starter/Pro windows, no-replay purge, dry-run, targeted
  ids/idempotency, and the website boundary. The live smoke proved a
  200-day-old event/session and the replay payload were removed while
  recent data survived.

### Acceptance criteria

- [x] Attribution journey suite passes. — proof:
  `attribution-journeys.test.ts` (5 tests) and the first/last model tests in
  `revenueAttribution.test.ts`; full suite green.
- [x] Provider capability table in docs with verified capabilities + limits. —
  proof: `docs/PAYMENT_PROVIDER_CAPABILITIES.md` (status code-verified
  2026-11-06; live columns marked UNVERIFIED).
- [x] Replay unavailable on plans without it; masking demonstrated. — proof:
  `record/handler.test.ts` rejects Starter/no-plan before reservation;
  `privacy.test.ts` proves default input masking, strict text masking, and
  the consent gate.

### Decisions made

- Retention is per website, not per workspace, because events and replays are
  stored by `websiteId`; the plan is resolved from the owning workspace. This
  keeps every delete statement bound to one tenant key.
- A plan without a replay entitlement has no replay storage, so the retention
  job removes **all** replay payloads for that website. A downgrade purges
  replay rather than keeping data the plan no longer grants.
- Durable payment, subscription, refund, dispute, invoice, usage, audit, and
  billing rows are never deleted by analytics retention. Only their optional
  links to expired events/sessions are detached.
- The retention job deletes in one transaction per website. This is simple and
  safe for the current dataset; batching is a documented pre-scale follow-up.
- Replay consent is opt-in for the host page (`data-consent="required"`); the
  default stays implicit so the inherited analytics product keeps working. A
  host grants consent with `window.__taliviaSetConsent(true)` or a
  `talivia:consent` event. Revoking stops the recorder; it does not restart.
- `NULL` and empty-string referrers are both treated as direct/absent. This is
  a compatibility fix, not a change to channel definitions.

### Unverified / Assumed

- **UNVERIFIED:** live webhook delivery for every provider (no provider
  accounts). See the capability table.
- **UNVERIFIED:** the ClickHouse query branch and Kafka replay path (not
  deployed in this fork).
- **UNVERIFIED:** a real browser recording with rrweb after the masking/consent
  change. Policy is unit-tested; the bundle was not exercised in a browser.
- **UNVERIFIED:** retention and ingestion under load. The smoke seed is small
  and single-instance; no parallel-ingestion or million-row test was run.
- **ASSUMED:** session replay raw bytes in `session_replay` satisfy the
  "payloads outside tenant relational tables" rule because they are compressed,
  website-scoped event-store rows, not membership/billing/tenant tables.

### Needs from the human

- Provider test accounts/webhook secrets for live end-to-end verification.
- A browser walkthrough of recorder masking/consent on a real site.
- Approve whether retention should keep session/visitor identity rows longer
  than event payloads (current job deletes both at the plan cutoff).

---

## Phase 8 — Onboarding and developer experience

**Goal:** first useful result in minutes. Main differentiator.

### Tasks

- [x] Keep the existing tracker and its API; generate the install snippet from
  the real script structure. — proof: onboarding snippet uses
  `/script.js` + `data-website-id`; `/api/send` accepted a real event.
- [x] Onboarding flow with progress: create workspace → add website → copy
  snippet → install → verify first event (live check) → connect payments →
  first revenue report. Dashboard reachable without forcing every step. —
  proof: `src/features/onboarding/OnboardingFlow.tsx`,
  `docs/ONBOARDING_SPEC.md`. Payment step links to the real settings page;
  no hard gates.
- [x] Install guides: Next.js, React, Vite, plain HTML, Astro, Remix (where
  supported) + troubleshooting (ad blockers, CSP, wrong domain, SPA
  routing). — proof: `src/features/docs/install-guides.ts` generates every
  snippet from the real tracker contract (`/script.js`, `data-website-id`,
  `data-domain`); `/docs/install` renders all six guides plus troubleshooting;
  the onboarding install step has framework tabs. Snippets are unit-tested
  and each guide is explicitly labelled **untested at runtime** until a real
  app is exercised.
- [x] AI agent experience: review Talivia agent repo licence (MIT verified);
  write `llms.txt` and agent docs; verification endpoint/CLI; design and if
  feasible implement MCP server (verify installation, list events, diagnose).
  — proof: `docs/AGENT_INTEGRATION.md`, `src/app/llms.txt/route.ts`,
  `src/features/developer/**`, `scripts/revenuelens-cli.mjs`,
  `scripts/revenuelens-mcp.mjs`, and handler/diagnostic tests.
- [x] Activation metrics: signup, workspace created, website created, tracker
  installed, first event, payment connected, first attributed payment. —
  proof: `features/account/server/queries/activation.ts` derives the funnel
  from durable records (no synthetic events); `GET /api/admin/activation` is
  platform-admin only; `/app/settings/activation` renders it. "Tracker
  installed" and "first event" are one honest stage because the first
  `website_event` row is the same signal.

### Acceptance criteria

- [ ] New test account reaches a first verified event using only the UI. —
  **API flow proven end-to-end** (login → workspace → website → event →
  verify) and every public/authenticated route rendered 200
  (`docs/RENDER_SMOKE.md`). A real browser interaction walk-through is still
  required because the desktop browser was not connected.
- [x] Each framework guide has a tested or clearly labelled untested snippet. —
  proof: six guides in `install-guides.test.ts`; all are labelled **untested
      at runtime** with the reason shown on `/docs/install`.
- [x] Activation funnel recorded and viewable by internal admins. — proof:
  `/api/admin/activation` rejects non-platform-admins (handler test) and
  `/app/settings/activation` shows aggregate stage counts and conversion.

### Decisions made

- Onboarding is an authenticated standalone route, not a step inside the app
  shell, so it matches Tartly's full-height canvas.
- The workspace step is skipped when the user already has one.
- Verification polls the real event store; there is no client-side "success"
  without an actual event.

### Unverified / Assumed

- Visual/browser QA of the welcome overlay and transitions.
- Whether a 3-second poll is too aggressive at scale; it only runs while the
  verify step is open.

### Needs from the human

- Confirm the onboarding copy and the 4.2s welcome hold.

## Phase 9 — Rebrand and product UI

**Goal:** a polished, distinct product, not a logo swap. RevenueLens copies
Tartly's UI style, schemes, ideology, and onboarding motion, adapted to SaaS.

### Core tasks

- [x] One branding config (`src/lib/brand.ts`): name, tagline, logo, colors,
  domain, support/no-reply emails, legal entity. Placeholder: RevenueLens. —
  proof: file exists; used by pricing, onboarding, login, top nav, metadata.
- [x] Remove/replace customer-facing Talivia names, logos, copy, favicons,
  metadata, emails, docs links. Keep MIT notice in `LICENSE`; add
  `THIRD_PARTY_NOTICES`. — proof: brand mark/favicons/manifest/login/nav/
  metadata/intl/settings/imports are rebranded; the old `talivia.com`
  documentation links are replaced with the local `/docs` guides; admin
  update checks no longer phone the upstream service unless
  `OSS_UPDATE_URL` is configured. Remaining `Talivia` strings are internal
  identifiers (cron/redis/tracker types) and the compatibility import
  format; `THIRD_PARTY_NOTICES` keeps the upstream attribution required by
  the MIT license.
- [x] Revenue-first screens: revenue by source, revenue per visitor,
  conversion rate, MRR by channel; onboarding; billing; usage; workspace
  settings; empty states; mobile. — **done:** onboarding, pricing, the
  portfolio revenue strip, and MRR by first-touch channel on `/app`
  (`getPortfolioMrrByChannel` + `MrrByChannelPanel`). Billing history still
  waits for Phase 5.
- [x] Landing page, pricing page (driven by plan config), docs shell, login
  and signup. — proof: landing (`/`), pricing (`/pricing`), a public docs
  shell at `/docs` with provider guides, and the shared auth screens are
  live and driven by `BRAND`/`PLANS`.
- [x] Accessibility basics; dark mode (the product is dark by default). —
  **done:** global keyboard focus rings, a reduced-motion override,
  labels/focus on the settings/docs/onboarding/pricing screens, and a WCAG
  AA contrast test over the brand color tokens
  (`src/lib/brand-contrast.test.ts`).

### Additional UI steps (owner-requested)

- [x] **UI-1 — Design audit:** extract Tartly tokens and map onto Talivia. —
  proof: `docs/UI_DESIGN_SYSTEM.md`.
- [x] **UI-2 — Brand config adoption:** name, wordmark, favicon, metadata,
  emails, footer, auth, docs read from one config. — **complete**: auth/nav/
  metadata/pricing/onboarding/docs use it, and settings copy now names the
  product from `BRAND.name` instead of hardcoding it.
- [x] **UI-3 — App shell:** quiet dark workstation; tonal layering; hairline
  borders; blush reserved for signal; tabular numerals. — proof:
  `TopNav.tsx` uses the brand wordmark and a hairline border;
  `WebsiteLayout.tsx` adds a grouped workbench rail (`WebsiteSectionNav`)
  that becomes horizontal section tabs below 1024 px. Chrome accents were
  moved from blue to blush (`global.css`, settings and onboarding).
- [x] **UI-4 — Revenue-first overview:** replace generic analytics hero with
  revenue, revenue/visitor, conversion, MRR-by-channel cards + charts. —
  proof: `/app` opens with a portfolio strip (revenue, revenue per visitor,
  purchase rate, visitors), each website card leads with revenue, and the
  MRR panel groups active subscriptions by the first-touch channel stored on
  the visitor (falling back to the earliest attributed payment).
- [x] **UI-5 — Onboarding shell:** full-height centred 440 px column, logo,
  title, subtitle, directional slide/fade (12 px, 320 ms, 70 ms stagger),
  reduced-motion support, welcome moment. — proof: `OnboardingFlow.tsx` /
  `Onboarding.module.css`.
- [x] **UI-6 — Onboarding steps:** welcome → workspace → website → tracker
  install → live verification → payments → first report → done. — proof:
  `OnboardingFlow.tsx`; the report step links to the real revenue report and
  keeps empty states instead of inventing numbers.
- [x] **UI-7 — Install experience:** snippet card with copy button, framework
  tabs, verify-live status with real polling. — proof: framework tabs in
  `OnboardingFlow.tsx` use the generated guides from
  `features/docs/install-guides.ts`; copy + real polling remain.
- [x] **UI-8 — Pricing page:** two cards only, Starter $7.99 / Pro $14.99,
  monthly/annual toggle, no free tier, no fake claims. — proof: `/pricing`
  returns 200 and renders both prices.
- [x] **UI-9 — Billing + usage pages:** plan, renewal, usage bar, 80%/100%
  states, upgrade path, invoices. — proof: usage at
  `/app/settings/billing` (plan, reset date, event/replay bars, grace/limit
  states, website/member limits, upgrade link); invoice and renewal history
  are provider-issued rows from `billing_invoice` in
  `BillingSubscriptionPanel`.
- [x] **UI-10 — Settings:** workspace, members, websites, integrations,
  security; consistent empty/error/loading states. — proof: `/app/settings`
  is now a real overview instead of a redirect; grouped nav covers
  Overview, Workspace, Websites, Integrations, Plan and usage, Security,
  Account, and Preferences. Integrations shows per-website provider
  connection state from the real API; Security carries verification,
  password, session, and account-deletion states. Workspace/members/
  invitations and Plan & usage remain in place.
- [x] **UI-11 — Auth screens:** login, signup, verify, reset in the same shell.
  — login, signup, invite acceptance, `/verify-email`, `/forgot-password`,
  and `/reset-password` use the same auth shell.
- [x] **UI-12 — Marketing landing:** one promise, three proof points, product
  visual, pricing teaser, FAQ. — proof: `src/app/page.tsx` +
  `Landing.module.css`; `/` returns 200 and renders both config-driven
  plans. The previous `/` → `/login` redirect was removed from
  `next.config.ts`.
- [x] **UI-15 — Full analytics route restructure (new):** every inherited
  analytics surface is reachable inside `/app/[websiteId]` instead of only
  the three revenue debug pages. — proof: new routes for `revenue`,
  `attribution`, `journeys`, `diagnostics`, `sessions`, `events`,
  `realtime`, `breakdown`, `goals`, `funnels`, `retention`, `cohorts`,
  `utm`, `performance`, `compare`, and `replays`; legacy
  `revenue-attribution`/`revenue-journey`/`revenue-diagnostics` redirect to
  the canonical route; `app-route.test.ts` and
  `WebsiteSectionNav.test.tsx` lock the route/nav contract.
- [x] **UI-16 — Complete source restructure (new):** the app router is now a
  thin routing layer; all product UI moved to domain modules under
  `src/features` (`app-shell`, `portfolio`, `websites/workbench`,
  `settings`, `onboarding`, `auth`, `marketing`, `share`, `legacy`).
  `src/app` now contains route files plus the root `Providers.tsx` only.
  Removed dead portfolio table
  components and the obsolete revenue-attribution/revenue-journey report
  screens and hooks. Legacy `/websites/*` and `/settings/*` URLs redirect
  to the canonical `/app/*` routes. — proof: `src/app/(main)` contains only
  route files; `docs/UI_DESIGN_SYSTEM.md` §6 records the layout;
  `src/lib/app-structure.test.ts` enforces it; build, typecheck, lint, and
  613 tests are green.
- [x] **UI-17 — Complete server restructure (new):** every one of the 119 API
  route files is now a thin adapter that re-exports HTTP handlers from a
  feature `server` module. Handlers moved into `account`, `analytics`,
  `auth`, `legacy`, `payments`, `share`, `system`, `websites`, and
  `workspaces`. Payment provider clients, webhook verifiers, provider
  credential handling, provider backfills, analytics import parsers, and
  board definitions moved into their feature modules as well; the
  Prisma/analytics query layer, permissions, and shared UI remain
  cross-cutting. `docs/ARCHITECTURE.md` defines the module boundaries and
  dependency direction, and `src/lib/app-structure.test.ts` enforces thin
  route files plus server-module presence. — proof: build, typecheck,
  lint, 22 API route suites (126 tests), and the full suite are green.
- [x] **UI-13 — Motion + polish pass:** page transitions, hover lift, focus
  rings, skeletons, reduced motion, mobile. — proof: global keyboard
  `:focus-visible` rings, a global reduced-motion override, blush-only
  signal states (auth hover, external links, activity heatmap, API-key
  reveal), working loading/empty states on the new settings pages, and the
  responsive docs/settings layouts at 860 px and below.
- [x] **UI-18 — Brand-safe documentation shell:** public `/docs` and
  `/docs/revenue-guides/[slug]` pages replace the upstream help-centre
  links. Guides for Stripe, Dodo Payments, Lemon Squeezy, Polar, Yolfi, and
  the manual payment API are generated from one content module, link only
  to official provider pages, and are covered by `content.test.ts`.
- [x] **UI-19 — Complete domain restructure (new):** the remaining domain
  widgets, selectors, React Query hooks, and cron jobs moved out of
  `src/components` and `src/lib` into their owning feature modules.
  Analytics widgets and filters now live in
  `src/features/analytics/components`; share widgets in
  `src/features/share/components`; `WebsiteSelect` in
  `src/features/websites`; shell controls in
  `src/features/app-shell/components`; legacy selectors in
  `src/features/legacy`; payment provider UI in `src/features/payments`;
  and all domain query hooks in `src/features/<domain>/hooks` with barrels.
  Cron moved to `src/features/system/cron`. Only shared primitives remain
  in `src/components` (`brand`, `charts`, `common`, `hooks`, `input`,
  `svg`). Three dead components and three dead hooks were deleted. The
  structure test now fails if `src/components` gains a non-primitive
  directory or if any shared layer imports a feature. Server handlers stay
  in feature `server/` modules; the preserved analytics SQL engine and
  cross-domain Prisma repositories stay in `src/queries` because tenant
  authorization and analytics depend on them. Proof: 119 files moved,
  build/typecheck/lint green, **622/622 tests** pass.
- [x] **UI-14 — Temporary rename demonstration:** change brand config and show
  name/logo/colors/emails update everywhere. — proof:
  `src/lib/brand.ts` now derives name, domain, URL, support/no-reply
  addresses, legal entity, and logo alt text from two constants, and
  `src/lib/brand-propagation.test.ts` fails if customer-facing feature or
  shared code hardcodes the literal brand name again.
- [x] **UI-20 — Shared-layer restructure completion (new):** the last domain
  helpers moved out of `src/lib` into their feature modules:
  `analytics/lib` (collector cache, cross-domain linker, attribution query,
  dashboard overview, client detection, filters, metric colors, chart
  axis), `payments/lib` (payment return detection), `auth/lib` +
  `auth/server` (return URL, registration), `workspaces/lib` (invitations,
  members), `websites/lib` (API keys, domain normalization), `legacy/lib`
  (feature gate), and `system/lib` (OSS version). Deleted the unused
  dashboard/websites/cache stores and the unused refresh button, leaving
  `src/store` with only shared app state. `app-structure.test.ts` now
  enforces a shared `src/lib` allowlist, a `src/store` allowlist, and the
  presence of the moved domain helpers. — proof: typecheck and lint clean,
  **625/625 tests** pass.
- [x] **UI-21 — Structural cleanup completion (new):** removed the dead
  inherited legacy dashboard UI (boards, link/pixel lists, edit forms,
  board component registry, and their unused hooks/selectors) while keeping
  only the link and pixel pages rendered by public shares and the legacy
  API handlers. Deleted the unused segment list/edit chain (keeping the
  filter-bar edit dialog), the orphaned metrics bars, profile/share headers,
  two input primitives, and the empty/stale shared helpers. Moved
  `WebsiteSettingsPage` out of a route-param-shaped
  `settings/websites/[websiteId]` directory into the website workbench.
  `app-structure.test.ts` now pins the pruned legacy surface so it cannot
  regrow. — proof: typecheck, lint, and the structure test pass.
- [x] **UI-22 — Complete analytics/websites domain split (new):** the whole
  website analytics workbench moved from `features/websites/workbench` to
  `features/analytics/workbench` (shell, header, nav, overview, reports,
  sessions, events, replay, realtime, cohorts, compare, segments). The
  matching analytics request handlers moved to
  `features/analytics/server/[websiteId]`, so the thin API routes point at
  the domain that owns them. `features/websites` now owns site management
  only (CRUD, `settings/`, imports/exports, API keys, members, shares).
  The account settings UI moved from `settings/profile` to
  `settings/account`. `app-structure.test.ts` pins both sides of the split
  so the workbench cannot drift back into `websites`. — proof: typecheck,
  lint, structure/route tests, and the full suite are green.
- [x] **UI-23 — Settings ownership completion (new):** `features/settings` is
  now the settings shell only (`SettingsLayout`, `SettingsPageLayout`,
  `SettingsHomePage`). Account, security, and preference screens moved to
  `features/account/settings` with the local-user admin handlers under
  `features/account/server`; workspace settings moved to
  `features/workspaces/settings`, website list settings to
  `features/websites/settings`, integration settings to
  `features/payments/settings`, and plan/usage to the new
  `features/billing` domain. Route files point at the owning domain, and
  `app-structure.test.ts` pins the shell and forbids the old catch-all
  directories. — proof: typecheck, lint, and **641/641 tests** pass.
- [x] **UI-24 — Permission ownership completion (new):** `src/permissions` is
  now only the shared website/entity authorization boundary
  (`website.ts`, `entity.ts`, the barrel). Report checks moved to
  `features/analytics/lib/report-permissions.ts`, local-user/platform-admin
  checks to `features/account/lib/permissions.ts`, and frozen board/link/
  pixel read checks to `features/legacy/lib/permissions.ts`; the unused
  legacy update/delete checks were deleted. Route tests mock the owning
  feature module, and `app-structure.test.ts` enforces the permissions
  allowlist. — proof: typecheck, lint, and **642/642 tests** pass.
- [x] **UI-25 — Data-layer and router completion (new):** every domain Prisma
  repository moved from `src/queries/prisma` into
  `features/<domain>/server/queries` (`analytics`, `payments`, `websites`,
  `account`); the whole inherited analytics SQL engine moved to
  `features/analytics/server/queries/sql`; the tenant-scoped session cache
  moved beside it; `dashboard-breakdown`, `data`, `paymentCustomer`,
  `redact`, `website-overview`, `stripe-amount`, and `generate` moved into
  their owning feature libs. The frozen board type constants stay shared
  with the central entity lookup. The public pixel
  and link collectors moved to `features/legacy/server/collect`, the
  website shell resolver moved into the analytics workbench, and the route
  layer no longer imports `@/queries`, `@/lib/prisma`, or `@/lib/redis`.
  `src/queries` is now a small allowlisted shared kernel (authorization,
  request parsing, auth, billing contracts, legacy entity lookups).
  `app-structure.test.ts` pins the shared query allowlist, the domain query
  directories, and the route-layer data-access ban. — proof: typecheck and
  lint clean, `next build` success, **645/645 tests** pass.
- [x] **UI-26 — Route and shared-lib ownership completion (new):** the router is
  now test-free. Every API route contract test moved from
  `src/app/api/**/route.test.ts` to the owning
  `src/features/<domain>/server/**/handler.test.ts`, so `src/app` contains
  route conventions, CSS, and `Providers.tsx` only. Analytics report
  handlers were normalized to mirror `/api/reports/*` under
  `features/analytics/server/reports/**`, and the realtime handler moved to
  `features/analytics/server/realtime/[websiteId]/handler.ts`.
  `REVENUE_PAYMENT_STATUSES` moved to `features/payments/lib` and tracking
  identity derivation (with its test) moved to
  `features/analytics/lib`, leaving both out of the shared `src/lib`
  allowlist. The structure test now rejects any test file in the router,
  checks that each shared allowlist entry exists (so stale entries cannot
  hide), and pins the moved handler layout. — proof: typecheck and lint
  clean; `next build` succeeds; full suite **646/646** passes.

- [x] **UI-27 — Remaining restructure gaps (new):** closed the partial Phase
  8/9 items. Added generated framework install guides (Next.js, React,
  Vite, plain HTML, Astro, Remix) in `features/docs/install-guides.ts`,
  a public `/docs/install` page with troubleshooting, and framework tabs in
  the onboarding install step. Added the first-report onboarding step that
  links to the real revenue report. Adopted `BRAND.name` in settings copy.
  Added the platform-admin activation funnel: aggregate query in
  `features/account/server/queries/activation.ts`, guarded
  `GET /api/admin/activation`, and `/app/settings/activation` (nav item is
  visible only to platform admins). Confirmed invoice/renewal history is
  already provider-backed by Phase 5. — proof: new tests for guide
  generation, funnel math, and handler authorization; the funnel query was
  run against local PostgreSQL and returned 3 accounts → 2 workspaces → 2
  websites → 1 website with events → 0 payment connections → 0 attributed
  payments; `app-structure.test.ts` pins the new files and route tests;
  typecheck and lint are clean; full suite **704 passed / 1 gated skip**.

### Acceptance criteria

- [x] Repo-wide search for the original brand finds nothing customer-facing
  (allowed exceptions listed). — proof: no `talivia.com` links remain in
  application code; provider guides, imports, backup filenames, and update
  notices are brand-safe. Internal compatibility identifiers and the
  upstream MIT attribution in `THIRD_PARTY_NOTICES` are intentionally kept.
- [x] Changing the brand config changes name, logo, colors, emails everywhere
  (demonstrated with a temporary rename). — proof:
  `src/lib/brand-propagation.test.ts` plus the config-derived brand module.
- [x] Onboarding motion matches the Tartly constants and respects reduced
  motion. — proof: 12px/320ms/70ms in `Onboarding.module.css`, reduced-motion
  block.
- [x] Pricing page renders exactly two plans from the config. — proof:
  `/pricing` 200; `plans.test.ts`.
- [x] Portfolio MRR panel uses real subscription data and refuses to invent a
  cross-currency total. — proof: `portfolioMrr.ts`,
  `website-overview.test.ts` (mixed-currency case).

### Decisions made

- Keep Talivia's existing component system; do not add Tailwind/shadcn. This is
  the difference between a rebrand and a rewrite.
- Dark-only at launch, matching the working surfaces of both Tartly and Talivia.
- The blush signal is reserved for revenue/live state; unlike Tartly's AI
  spectrum, RevenueLens is not an AI-authored product.

### Unverified / Assumed

- Visual fidelity of the CSS halftone welcome vs Tartly's canvas version.
- Contrast ratios need a tool pass (Phase 11).

### Needs from the human

- Final brand name/domain: confirmed 2026-11-06 as **Tartly** / `tartly.in` in `src/lib/brand.ts`.

## Phase 10 — Compliance, abuse protection, email, operations

### Tasks

- [x] Draft legal pages (clearly marked for lawyer review): privacy, terms,
  cookie/consent, data processing, subprocessors, acceptable use. — proof:
  `src/features/marketing/legal/legal-content.ts`, `/legal` and
  `/legal/[slug]`, 4 content tests; every page carries the
  `LEGAL_DRAFT_NOTICE`.
- [x] Privacy: IP handling/anonymization, no-cookie option if supported, GDPR
  export/deletion, replay consent hooks. — proof: rotating hashed visitor
  IDs (`src/lib/crypto.ts`), raw IP used only for abuse/geo derivation,
  account export `GET /api/me/export`, deletion `DELETE /api/me/account`,
  retention job, and `src/recorder/privacy.js` consent gate.
- [x] Abuse: per-IP/per-email signup limits, disposable email handling,
  per-website ingestion limits, origin/domain validation, bot filtering,
  free-tier farming detection, admin suspend tools. — proof:
  `src/lib/rate-limit.ts`, `src/features/auth/lib/disposable-email.ts`,
  plan metering + grace, optional `ENFORCE_TRACKER_ORIGIN`
  (`src/features/analytics/lib/tracker-origin.ts`), `isbot` filtering,
  one-workspace-before-billing, and platform-admin suspension for users and
  workspaces (`src/features/account/server/admin/suspension.ts`, UI at
  `/app/settings/admin`, audit events, session revocation).
- [x] Transactional email: verification, reset, invitations, 80%/100% usage,
  payment failure, templates. — proof: `src/lib/email.ts`,
  `src/features/system/cron/jobs/usage-notices.ts` (daily 04:00 UTC,
  once-per-period idempotency), payment-failure hook in
  `features/billing/server/service.ts`; dev outbox fallback. Live local
  proof in `docs/LIVE_SMOKE.md`: verification resend, verify, forgot,
  reset, and login with the new password all passed through the real routes
  and `.dev-emails/outbox.log`.
- [x] Operations: structured logging, error tracking hook, uptime/health,
  Neon + event-store backup/restore, secrets rotation, audit log for
  billing/member/key/deletion actions. — proof: `src/lib/logger.ts`
  (JSON + redaction + `captureException`), `/api/health/live` and
  `/api/health/ready`, `docs/BACKUP_AND_RECOVERY.md`,
  `docs/SECRETS_ROTATION.md` + `pnpm rotate:provider-secrets`,
  `src/queries/prisma/audit.ts` with calls across account, workspace,
  member, invitation, API key, website, import, billing, and suspension
  handlers. The platform-admin audit viewer (`GET /api/admin/audit` +
  `/app/settings/audit`) lists recent events without IP, user agent, or
  metadata.

### Acceptance criteria

- [x] Deletion flow code path removes a workspace's analytics data and detaches
  durable records; proof via the retention job tests and account-deletion
  audit. The retention job now also includes deleted websites/workspaces
  and purges their analytics payload immediately (durable billing/audit
  rows are kept and detached), pinned by a regression test. A live
  cross-store deletion check still needs a staging database.
- [x] Rate-limit tests pass. — proof: `src/lib/rate-limit.test.ts` plus route
  tests for login/register/reset.
- [x] Audit log entries exist for all listed actions. — proof: `grep` finds
  `recordAuditEvent` in billing, member, invite, API key, website,
  import/export, account, suspension, and attribution retry handlers. The
  live smoke read back four real suspension audit rows
  (`user.suspended`, `user.unsuspended`, `workspace.suspended`,
  `workspace.unsuspended`) in `docs/LIVE_SMOKE.md`.
- [ ] Live Resend delivery. **UNVERIFIED**: needs `RESEND_API_KEY` and a verified
  sending domain.
- [ ] Lawyer review of the drafts. **UNVERIFIED**: needs qualified counsel.

### Decisions made

- Legal pages are honest drafts with a visible review notice, not fake
  "compliant" claims.
- Account deletion is a soft delete plus a tenant-scoped retention purge, so a
  request cannot accidentally hard-delete billing/audit evidence.
- Suspension is reversible, audited, and revokes sessions. It never deletes data.
- Usage notices are idempotent via timestamps on `usage_period`; a provider
  failure retries the next day instead of spamming.
- `APP_SECRET` rotation uses a previous-key window and a re-encryption script so
  provider credentials survive a key change.

### Needs from the human

- `RESEND_API_KEY` + verified domain.
- Lawyer review of the legal drafts.
- Confirm the production subprocessor list.

---

## Phase 11 — Hardening, QA, deployment, launch readiness

### Tasks

- [x] Security review: dependency audit, OWASP pass, security headers,
  ingestion CORS. — proof: `docs/SECURITY_REVIEW.md`, security headers in
  `next.config.ts`, collector CORS narrowed to the four ingestion routes,
  `zod` upgraded, safe transitive overrides, CI critical audit.
- [x] Performance: indexes, slow-query check, load test tooling. — proof:
  schema indexes for tenant/event/session/usage/billing paths, bounded
  payloads, index guidance in the gate, `scripts/load-ingest.mjs`.
- [x] Full test run: unit, integration, isolation, billing, metering; CI. —
  proof: full suite green; CI runs PostgreSQL, migrations, analytics smoke,
  lint, typecheck, tests, audit, build.
- [x] Deployment guide/scripts; production env checklist; Neon branch
  promotion rehearsal; custom domain/DNS for tracker. — proof:
  `docs/ENVIRONMENT.md`, `docs/NEON_BRANCHING.md`, `Dockerfile` (non-root,
  health check), `docker-compose.yml`, `docs/RUNBOOK.md`. The Neon
  rehearsal and DNS cutover remain **UNVERIFIED** without the production
  project/domain.
- [x] `docs/LAUNCH_CHECKLIST.md`, `docs/RUNBOOK.md`,
  `docs/BACKUP_AND_RECOVERY.md`, `docs/PRODUCTION_READINESS_AUDIT.md`.
- [x] Published an OpenAPI 3.1 contract for the health, auth, account, developer,
  operator, and billing surfaces (`openapi.yaml` + `src/lib/openapi.test.ts`).
- [x] Added comparison pages, `sitemap.xml`, `robots.txt`, and
  `.well-known/security.txt`; comparison prices are source-dated.
- [x] Added a graceful-shutdown wrapper for the standalone Docker server
  (`scripts/start-server.mjs`) and raised new password hashes to bcrypt
  cost 12 with rehash-on-login.
- [x] Rendered-surface smoke over 17 public routes and 12 authenticated routes
  (`docs/RENDER_SMOKE.md`). Fixed `/app/settings/admin` returning 404 by
  adding it to the proxy allowlist; normal users still get 403 from the
  operator API.
- [x] Final honest tracker update + prioritized post-launch backlog.

### Acceptance criteria

- [x] CI green locally reproducible; isolation suite green; load-test numbers
  recorded locally. — `docs/LOAD_TEST.md`: 10,000 events, 50 concurrency,
  157 req/s, p95 412 ms, p99 480 ms, 0 errors, exact usage count.
- [ ] Deployed-environment load test. **UNVERIFIED**: run the same probe against
  staging and record network/Neon latency.
- [ ] Launch checklist complete or each item has an owner and reason. — every
  open item is marked **UNVERIFIED** with the human action; see
  `docs/LAUNCH_CHECKLIST.md`.

### Needs from the human

- Hosting account, domain/DNS, TLS.
- Neon production project + point-in-time restore rehearsal.
- Dodo live keys + product IDs; Resend key + domain.
- Browser walkthrough and a deployed load-test window.

---

## Phase 12 — Go-to-market

- [x] Positioning and messaging. — `docs/gtm/POSITIONING.md`.
- [x] Landing/pricing/FAQ copy. — code pages plus the messaging hierarchy;
  copy can be refined at launch.
- [x] Comparison pages vs DataFast, Plausible, Fathom, Umami, Simple Analytics,
  Talivia Cloud — fetched facts only, source + date. —
  `docs/gtm/COMPETITORS.md`; DataFast and Talivia's non-promotional price
  are explicitly **UNVERIFIED**.
- [x] Migration guides + quickstart. — `docs/gtm/MIGRATION_GUIDES.md`.
- [x] SEO: 20 keywords with intent, 10 content outlines. —
  `docs/gtm/SEO_PLAN.md`.
- [x] Launch plan + drafts (Product Hunt, Indie Hackers, Show HN, Reddit rules
  check, X, LinkedIn, Dev.to). — `docs/gtm/LAUNCH_PLAN.md`.
- [x] Early-adopter offer modelled against `PRICING_ECONOMICS.md`. — no
  lifetime deal; annual two-months-free only if margin stays above target.
- [x] Activation/retention plan + 5-email onboarding sequence + usage upsell. —
  `docs/gtm/EMAIL_SEQUENCE.md`.
- [x] 30-day launch calendar. — `docs/gtm/LAUNCH_PLAN.md`.
- [x] Success metrics with assumptions. — `docs/gtm/METRICS.md`.

### Acceptance criteria

- [x] All files exist under `docs/gtm/`.
- [x] Every competitor fact has a source/date; unverified items are labelled.
- [x] No fabricated testimonials, counts, or statistics.
- [x] Offer is margin-safe per the economics model (no invented discount).

---

## Remaining work (in order)

The source restructure and every in-repo coding slice are complete. What remains
is external verification plus one data-migration follow-up; no application
feature is waiting on code.

1. **External verification (highest priority):** run the Dodo test-mode
   checklist (`docs/PLATFORM_BILLING.md`), send one real Resend email, and
   deliver one webhook per analytics provider. Record results here.
2. **Neon production:** create the project/branches, run `migrate deploy`
   against the direct URL, and rehearse a point-in-time restore
   (`docs/BACKUP_AND_RECOVERY.md`).
3. **Browser walkthrough:** onboarding, install verification, replay masking,
   and the settings/admin screens at mobile and desktop widths.
4. **Recorded load test:** run `pnpm load:ingest` against a deployed environment
   and store p50/p95/p99, error rate, and DB saturation.
5. **Launch operations:** hosting/DNS/TLS, production env, status page, error
   tracker, and legal review (`docs/LAUNCH_CHECKLIST.md`).
6. **Phase 6 finish:** owner approval of limits and a live parallel-ingestion
   proof. The code is complete; these are approvals/measurements.
7. **Legacy table drop:** rehearse the migration on a copy of real data, confirm
   every website has a workspace and effective access, then drop `team`,
   `team_user`, and `website_member`. Until then they are read-only fallbacks.
   The rehearsal tool is now in-repo: `pnpm legacy:precheck` reports orphan
   websites, uncovered legacy membership rows, FKs referencing the three
   tables, and remaining `team_id` references; `pnpm legacy:precheck --apply`
   (locked behind the pass verdict) empties the child tables and detaches the
   references on a rehearsal copy. It was proven against a local PostgreSQL 17
   copy with seeded legacy rows: the fail path (orphan website + uncovered
   member → no apply), the pass path, the apply path, and an idempotent second
   apply all behaved as specced (2026-11-06). Remaining: run it against a copy
   of REAL installation data, then add the DDL migration (drop constraints +
   tables) in the same deploy as removing the Prisma models and the
   `getWebsiteMemberForUser` fallback branch.
8. **Post-launch backlog:** general queue workers, RLS evaluation for enterprise,
   metrics/tracing collector, and build-tool minimatch/brace-expansion upgrades
   when a compatible version exists. OpenAPI publication is already done.
9. **Go-to-market execution:** re-verify competitor prices on launch day, run
   the 30-day calendar (`docs/gtm/LAUNCH_PLAN.md`), and replace every assumed
   metric with a measured one.

## Changelog

- 2026-11-10 — **Icon system replaced with Iconoir:** removed `lucide-react`
  and the generated `src/components/svg` set (`src/assets` + `@svgr/cli` /
  `build-icons`). All 102 icon names across 67 files now map to Iconoir
  equivalents through the single barrel `src/components/icons.ts`. Custom
  logo marks stay as brand assets in `public/brand`; payment-provider and
  browser/OS logos stay as images. Inline sun/moon, back, copy, and check
  glyphs were also replaced. Proof: `biome format`/`lint`, `tsc --noEmit`,
  full test suite, and `pnpm build` green.
- 2026-11-06 — **Landing page alternation (Talivia + DataFast references):**
  rebuilt `/` as alternating dark Talivia-style and light DataFast-style
  bands without copying claims, prices, or social proof. The dark opening
  uses a centred hero, a website-capture form, and a working interactive
  demo (7/30/90-day ranges, Overview/Traffic/Journeys tabs, channel,
  referrer, campaign, and keyword dimensions, selectable source detail, and
  an expandable "View full demo" panel). Light bands carry the three-step
  install story, the four-feature grid, the agent/CLI panel, the tool
  compatibility tiles, and the FAQ; dark bands carry the shared
  traffic/revenue timeline, first/last-touch referrer comparison, and the
  session-activity timeline. Every figure is labelled illustrative or sample
  data, plan limits still come from `src/lib/plans.ts`, and the blush signal
  accent plus `BRAND` values remain centralised. Proof: `LandingPage.test.tsx`
  (6 interaction tests), full suite **797 passed / 1 skipped**, `biome
  format`/`lint`, `tsc --noEmit`, and `pnpm build` all green; desktop
  (1440px) and mobile (390px) headless screenshots reviewed.
- 2026-11-06 — **Marketing landing restyle (DataFast reference):** rebuilt
  `src/features/marketing/LandingPage.tsx` and `Landing.module.css` on the
  visual system of <https://datafa.st> (fetched 2026-11-06): DM Sans, a
  `#1f1f1f` canvas, `#262626` cards with `1.3rem` radii and 1px white/8% rings,
  a single `#e16540` orange accent, a centred hero with a website-capture form,
  a browser-framed revenue dashboard preview, integration marquee, three-step
  how-it-works, 2×2 feature grid, pricing toggle, FAQ accordion, gradient CTA,
  and multi-column footer. Content is Tartly's own and stays honest: the
  preview is labelled **Sample data**, the review/testimonial wall and customer
  counts are omitted rather than fabricated, and plan limits still come from
  `src/lib/plans.ts`. The style layer is scoped to `/` only; the app, pricing,
  docs, and auth surfaces keep the existing Tartly token system. Proof: local
  dev render at `http://localhost:3000` (desktop + 390px mobile screenshots),
  anchor navigation, monthly/yearly toggle, FAQ open/close, `biome check`,
  `tsc --noEmit`, and the brand/plan/contrast tests (19/19) pass.

- 2026-11-06 — **Dependency hygiene (Phase 11 follow-up):** upstream released
  the combined minimatch/brace-expansion fixes as same-major patches, so the
  blocked follow-up in `docs/SECURITY_REVIEW.md` was closed with exact-version
  overrides (`minimatch` 3.1.4/5.1.8/9.0.7/>=10.2.1, `@isaacs/brace-expansion`
  > =5.0.1, `brace-expansion` >=1.1.17/>=2.1.3, `mysql2` >=3.23.1) and the
  unused `del` dev dependency was removed. `pnpm audit`: 97 → 67 (high
  38 → 14); `pnpm audit --prod --audit-level critical` still exits 0. A full
  `pnpm gate` is green. Remaining advisories are dev/build tooling without a
  same-major fix (documented in the security review).

- 2026-11-06 — **Legacy table drop rehearsal tool (Phase 2 follow-up):** added
  `pnpm legacy:precheck` (`scripts/legacy-table-drop.ts`) for the mandatory
  copy-with-data rehearsal before `team`/`team_user`/`website_member` can be
  dropped. It reports row counts, websites without `workspace_id`, legacy
  membership rows not covered by a workspace membership, FKs referencing the
  three tables, and rows still carrying `team_id`; `--apply` refuses to run
  unless every precondition passes, then empties the child tables and detaches
  `team_id` references in one transaction. Proven against a throwaway local
  PostgreSQL 17 cluster with seeded legacy rows: orphan/uncovered failure
  blocks apply, the pass verdict allows it, the apply detaches and empties,
  and a second apply is idempotent. What remains is running it against a copy
  of real installation data and then adding the DDL migration together with
  the Prisma model and fallback-read removal in one deploy.

- 2026-11-06 — **One membership surface:** retired the duplicate per-website
  member system. Website Settings → Team now lists the owning workspace's
  members and links to workspace settings; the per-website member API routes,
  handlers, and React Query hook were deleted, and `websiteMember.ts` is now a
  read-only fallback for pre-workspace websites only. This fixes a real bug
  where an invite in the website Team tab appeared to grant access but the
  workspace authorization layer ignored it. Added 3 component tests and a
  structure assertion that fails if the duplicate surface returns. Full suite
  **790 passed / 1 gated skip**; typecheck, lint, and production build green.

- 2026-11-06 — **Closed-tenant retention:** the analytics retention job
  previously filtered `website.deletedAt: null`, so deleting an account or
  workspace left its analytics payloads in the database forever. The job now
  includes deleted websites/workspaces, detects a closed tenant, and purges all
  event/session/replay/revenue payloads immediately while keeping durable
  billing and audit rows and detaching their optional links. Added a regression
  test and updated the privacy draft. Full suite **786 passed / 1 gated skip**.

- 2026-11-06 — **Stopped error-detail leaks:** `serverError` now strips any
  `errorObject` from the HTTP response, logs only a short operator message, and
  rejects non-object input. The collector and replay handlers no longer
  `console.log` serialized errors; they emit a structured event with the
  message only. This closes a path where a Prisma stack or query could be
  returned to an unauthenticated caller. Added a response regression test.

- 2026-11-06 — **Operator audit viewer:** added `GET /api/admin/audit` and
  `/app/settings/audit` for platform admins. The list is newest-first, supports
  a limit and event-type filter, and deliberately omits IP, user agent, and
  metadata. Normal users receive 403 from the API and the restricted page copy.
  Added handler tests, route allowlist coverage, and the OpenAPI path.

- 2026-11-06 — **Closed suspended/deleted public read paths:** API keys now fail
  closed when the owning user or website workspace is deleted or suspended;
  share-link issuance and every existing share token now verify that the
  website and workspace are live; share tokens expire after 7 days; replay
  recording rejects a deleted website. Added tests for each path. This prevents
  a suspended tenant from continuing to read or write through machine
  credentials and public links. Full suite **786 passed / 1 gated skip**;
  production build green.

- 2026-11-06 — **One-time setup allowance:** replaced the monthly setup cap with
  a `workspace.setup_events_count` counter (migration
  `20261106130000_setup_allowance`), so an unsubscribed workspace cannot farm
  1,000 free events every month. `reserveSetupEventUsage` increments atomically
  and fails closed; `releaseSetupEventUsage` refunds a failed write. The usage
  page now says the allowance is one-time and does not reset. Live proof:
  counter set to 999, event 1,000 accepted, event 1,001 returned
  `subscription_required` with `limit 1000 / used 1000`. Full suite **774
  passed / 1 gated skip**; production build green.

- 2026-11-06 — **Live operational smoke:** exercised verification, password
  reset, platform-admin search, user suspension, session revocation, workspace
  suspension, audit rows, and the setup allowance on the production build
  (`docs/LIVE_SMOKE.md`). Suspension caught a real bug: the entitlement lookup
  filtered `deletedAt` but not `suspendedAt`, so a suspended workspace could
  still ingest. Fixed in `src/lib/entitlements.ts` and pinned by a new test;
  the same request now returns 403 `workspace-unavailable` before any write.
  Verification/reset links were captured from the local outbox; live Resend and
  Dodo/provider webhooks remain **UNVERIFIED**.

- 2026-11-06 — **Closed the free-usage leak and fixed the operator route:** a
  workspace with no active paid subscription now receives a **one-time 1,000-event setup
  allowance**, not the full Starter 50,000. At the cap the collector returns
  `subscription_required`, writes no event, and disables replay; the usage page
  labels the setup meter and links to checkout. Verified live: 1,000 events
  accepted, the 1,001st rejected with `limit: 1000, used: 1000`. Also fixed
  `/app/settings/admin` returning 404 by adding it to the proxy allowlist; the
  operator API still returns 403 for normal users. Full suite **767 passed / 1
  gated skip**; production build green.

- 2026-11-06 — **Rendered-surface smoke:** 17 public routes and 12
  authenticated routes returned 200 on the production build; pricing rendered
  exactly $7.99/$14.99, legal rendered the drafts notice, and every comparison
  page rendered its source-dated title. The smoke found `/app/settings/admin`
  returning 404 because the proxy allowlist omitted it; fixed in
  `src/lib/app-route.ts` with a route test. Normal users still receive 403 from
  the operator API. A desktop browser was not connected, so visual/motion/
  click-through checks remain **UNVERIFIED**. Full suite 765 passed / 1 gated
  skip; build green.

- 2026-11-06 — **Load proof, contract, and launch pages:** recorded a 10,000
  event / 50-concurrency ingestion run on the production build against local
  PostgreSQL 17: 157 req/s, p50 302 ms, p95 412 ms, p99 480 ms, 0 errors, and
  an exact 10,001 stored rows / usage count (`docs/LOAD_TEST.md`). The probe
  found a real bug — a deleted workspace created sessions before the usage
  rejection — now fixed by resolving entitlements and reserving usage before
  any session write, with a regression test. Added OpenAPI 3.1 (`openapi.yaml`),
  graceful shutdown (`scripts/start-server.mjs`), bcrypt cost 12 with
  rehash-on-login, comparison pages, `sitemap.xml`, `robots.txt`, and
  `security.txt`. Local full suite: **786 passed / 1 gated skip**; production
  build green.

- 2026-11-06 — **Phase 10/11 production readiness and Phase 12 GTM:** added the
  binding engineering skills and `docs/ENGINEERING_STANDARDS.md`, `pnpm gate`,
  user/workspace suspension with a platform-admin console, disposable-email
  rejection, optional tracker-origin enforcement, `/api/health/live` and
  `/api/health/ready`, structured logging + error-tracking hook, usage notices,
  payment-failure email, account export, legal drafts, backup/recovery,
  secrets rotation with a dual-key provider-secret re-encryption script,
  security review, launch checklist, runbook, production-readiness matrix, and
  the `docs/gtm/` set. Upgraded `zod` and applied safe transitive overrides;
  CI now fails on critical production advisories. Full local typecheck, lint,
  and test suite are green; new suites add 19 tests. External provider, Neon,
  browser, load-test, DNS, and legal verification remain **UNVERIFIED**.

- 2026-11-06 — **Remaining restructure gaps (Phase 9 / UI-27 + Phase 8):**
  added `features/docs/install-guides.ts` with generated, unit-tested snippets
  for Next.js, React, Vite, plain HTML, Astro, and Remix; each guide is labelled
  **untested at runtime** and the public `/docs/install` page includes
  troubleshooting. The onboarding install step now has framework tabs, and a
  first-report step links to the real revenue report. Settings copy reads
  `BRAND.name`. Added the platform-admin activation funnel
  (`features/account/server/queries/activation.ts` +
  `GET /api/admin/activation` + `/app/settings/activation`) with aggregate
  stage counts, conversion percentages, and no synthetic events. The funnel
  query was run against local PostgreSQL. Invoice and renewal history were
  confirmed provider-backed by Phase 5. New tests cover guide generation, funnel
  math, and non-admin rejection; `app-structure.test.ts` pins the new modules.
  Typecheck, lint, `next build`, and the full suite (**704 passed / 1 gated
  skip**) are green.

- 2026-11-06 — **Phase 7 (analytics validation, attribution, replay,
  retention):** added a gated PostgreSQL smoke
  (`phase7-smoke.ts` / `vitest.phase7.config.ts`) that seeds an isolated website
  and passes 48 assertions across pageviews, visitors, visits, bounce input,
  duration, top/landing/exit pages, referrers, UTM, browser, OS, device, screen,
  country, language, channels, date range, real-time totals, active visitors,
  and retention. Added the five-journey attribution suite (organic, paid
  retargeting, referral, direct, recurring, unattributed), first/last-touch
  report-model tests, and a verified fix for `NULL` referrer/query rows in the
  PostgreSQL channel query. Added 9 replay-gating tests, default input masking
  and a consent gate in the recorder, and a daily tenant-scoped analytics
  retention job with dry-run support, 5 tests, and cron wiring. Documented the
  proof in `docs/ANALYTICS_VALIDATION.md` and the code-verified provider matrix
  in `docs/PAYMENT_PROVIDER_CAPABILITIES.md`. Typecheck and lint are clean; full
  suite **693 passed / 0 failed / 1 gated skip**; the live smoke adds 48
  assertions on PostgreSQL. Live provider webhooks, ClickHouse, browser
  recorder runtime, and load/concurrency remain unverified.

- 2026-11-05 — **GitHub delivery and CI:** moved `origin` to
  <https://github.com/ArDnath/Tartly-Datafast-Atl>, kept Talivia as `upstream`,
  pushed `main`, and delivered the completed work as six phase branches merged
  through pull requests #1–#6. Restricted the push trigger to `main` so each
  pull request runs one verification job. CI passed on every PR and on the
  final `main` (PostgreSQL 17, lint, 668 tests, migrations, production build).

- 2026-11-05 — **Platform billing (Phase 5):** added a separate `features/billing`
  domain (context A) with a `BillingProvider` contract and Dodo implementation,
  Dodo checkout, customer portal, cancel-at-period-end, and prorated plan
  changes. New tables `billing_customer`, `platform_subscription`,
  `billing_event`, `billing_invoice`, and `billing_subscription_change` keep
  provider state, idempotency, and invoices. `POST /api/billing/webhook/dodo`
  verifies Standard Webhooks signatures over the raw body, records each unique
  `webhook-id`, rejects older snapshots, and resolves the tenant from provider
  IDs before metadata. Entitlements now read `platform_subscription`; the
  billing settings screen shows real status, period, cancellation, plan
  changes, portal access, and provider invoices. The analytics Dodo integration
  is unchanged and unreachable from billing routes. Added 22 tests
  (`billing-lifecycle`, webhook verification/consume, checkout, service
  idempotency/ordering) and `docs/PLATFORM_BILLING.md`. Typecheck and lint
  clean; `next build` succeeds with `SKIP_DB_CHECK=1`; full suite **668/668**;
  `prisma migrate deploy` applied the billing migration to local PostgreSQL.
  Live Dodo test mode remains unverified.

- 2026-11-05 — **Route and shared-lib ownership completion (Phase 9 / UI-26):**
  moved all 22 API route contract tests out of `src/app/api/**/route.test.ts`
  and into `src/features/<domain>/server/**/handler.test.ts`, so the router is
  now routes, CSS, and `Providers.tsx` only. Normalized analytics report
  handlers under `features/analytics/server/reports/**` (including
  `[reportId]`) and moved the realtime handler to
  `features/analytics/server/realtime/[websiteId]`. Moved
  `REVENUE_PAYMENT_STATUSES` to `features/payments/lib` and tracking identity
  (plus its test) to `features/analytics/lib`, removing both from the shared
  `src/lib` allowlist. The structure test now rejects tests in the router and
  fails on stale allowlist entries. Typecheck and lint are clean; `next build`
  succeeds with `SKIP_DB_CHECK=1`; the full suite passes **646/646**.

- 2026-11-05 — **Data-layer and router completion (Phase 9 / UI-25):** moved
  every domain Prisma repository out of `src/queries/prisma` into
  `features/<domain>/server/queries` and moved the entire analytics SQL engine
  to `features/analytics/server/queries/sql`. The tenant-scoped session cache
  now sits beside the engine; `dashboard-breakdown`, `data`, `paymentCustomer`,
  `redact`, `website-overview`, `stripe-amount`, and `generate` moved into
  their owning feature libs. Public pixel/link collectors moved to
  `features/legacy/server/collect` and the
  website shell resolver to `features/analytics/workbench`, so the route layer
  no longer reads data directly. `src/queries` is now an allowlisted shared
  kernel (website/user/share/team/member authorization, segment resolution,
  billing currency/audit/cleanup, legacy entity lookups). `app-structure.test.ts`
  pins the kernel, the domain query directories, and the route-layer ban.
  Typecheck and lint clean; `next build` succeeds with `SKIP_DB_CHECK=1`;
  **645/645 tests** pass.

- 2026-11-05 — **Permission ownership restructure (Phase 9 / UI-24):**
  `src/permissions` now holds only the central website/entity authorization
  boundary. Report, platform-admin user, and frozen legacy read checks moved to
  `features/analytics/lib/report-permissions.ts`,
  `features/account/lib/permissions.ts`, and
  `features/legacy/lib/permissions.ts`. Unused legacy update/delete permission
  functions were deleted, route tests now mock the owning feature module, and
  `app-structure.test.ts` enforces the reduced permissions allowlist. Typecheck
  and lint are clean; **642/642 tests** pass.

- 2026-11-05 — **Settings ownership restructure (Phase 9 / UI-23):** dissolved
  the `features/settings` catch-all. Account, security, and preference screens
  now live in `features/account/settings`, with the local-user admin API
  handlers under `features/account/server/users`; workspace settings moved to
  `features/workspaces/settings`, website list settings to
  `features/websites/settings`, integration settings to
  `features/payments/settings`, and plan/usage to the new `features/billing`
  domain. `features/settings` retains only the settings shell, grouped nav, and
  overview. `app-structure.test.ts` enforces the shell allowlist and rejects the
  old directories. Typecheck and lint are clean; **641/641 tests** pass, and
  `next build` completes with `SKIP_DB_CHECK=1` (the local :5433 database was
  down after a harness restart).

- 2026-11-05 — **Analytics/websites domain split (Phase 9 / UI-22):** the
  entire website analytics workbench (shell, header, nav, overview, reports,
  sessions, events, replay, realtime, cohorts, compare, segments) moved from
  `src/features/websites/workbench` to `src/features/analytics/workbench`, and
  the report/session/event/replay/metric/realtime request handlers moved to
  `src/features/analytics/server/[websiteId]`. The thin API routes now point at
  the analytics domain; `features/websites` keeps site management (CRUD,
  settings, imports/exports, API keys, members, shares) with settings under
  `features/websites/settings`. Account settings moved from `settings/profile`
  to `settings/account`. `app-structure.test.ts` pins the new boundary, and
  `docs/ARCHITECTURE.md` / `docs/UI_DESIGN_SYSTEM.md` / the README describe the
  new layout. Typecheck, lint, structure/route tests, and the full suite pass.

- 2026-11-05 — **Phase 9 completion + structural cleanup:** deleted the dead
  inherited legacy dashboard UI (boards, link/pixel lists and edit forms,
  board registry, unused selectors/hooks) and the orphaned segment list/edit
  chain, metrics bars, and dead shared helpers; moved `WebsiteSettingsPage` into
  the website workbench; added MRR-by-first-touch-channel to `/app`
  (`getPortfolioMrrByChannel`, pure grouping in `website-overview.ts`, UI panel);
  made the brand name/domain config derive URL, emails, legal entity, and logo
  alt text, and removed hardcoded brand copy from docs/onboarding/integrations;
  added `brand-propagation.test.ts` and a WCAG AA `brand-contrast.test.ts`; and
  pinned the pruned legacy surface in `app-structure.test.ts`. Typecheck and
  lint are clean.

- 2026-11-05 — **Shared-layer restructure completion (Phase 9 / UI-20):** moved
  every remaining feature-owned helper out of `src/lib` into
  `src/features/<domain>/lib` (analytics tracking/collector/chart helpers,
  payment detection, auth return URL and registration, workspace invitations
  and members, website API keys and domain normalization, legacy gate, OSS
  version). Deleted unused dashboard/websites/cache stores and the unused
  refresh button; `src/store` now holds only shared app state. Extended
  `app-structure.test.ts` with `src/lib` and `src/store` allowlists plus
  domain-helper presence checks, and updated `ARCHITECTURE.md`. Build,
  typecheck, lint, and **625/625 tests** pass.

- 2026-11-05 — **Complete domain restructure (Phase 9 / UI-19):** moved the last
  119 domain files out of `src/components` and `src/lib` into feature modules.
  Analytics widgets/filters → `features/analytics/components`; share widgets →
  `features/share/components`; `WebsiteSelect` → `features/websites`;
  `WorkspaceSwitcher`/`UserButton` → `features/app-shell/components`; legacy
  selectors → `features/legacy`; `PaymentProviderLogo` → `features/payments`;
  all domain query hooks → `features/<domain>/hooks` barrels; cron →
  `features/system/cron`. Only shared primitives remain in `src/components`.
  Moved `formatStripeAmount` to `src/lib/stripe-amount.ts` and board type
  constants to `src/lib/board-types.ts` so shared data access no longer imports
  a feature. Deleted three dead components and three dead hooks. Extended
  `app-structure.test.ts` to enforce the shared component allowlist and the
  no-shared→feature rule. Updated `ARCHITECTURE.md` and the design-system map.
  Build, typecheck, lint, and **622/622 tests** pass.

- 2026-11-05 — **Phase 9 restructure + polish completion:** `/app/settings` is
  a real overview (not a redirect) with grouped navigation; new Integrations
  and Security settings surfaces report real provider connection state,
  verification state, password/session policy, and account deletion. Added a
  public docs shell (`/docs` + `/docs/revenue-guides/[slug]`) with guides for
  Stripe, Dodo Payments, Lemon Squeezy, Polar, Yolfi, and the manual API; all
  old `talivia.com` help links now resolve locally. Rebranded legacy import
  copy and backup filenames, stopped upstream update telemetry unless
  `OSS_UPDATE_URL` is set, moved remaining blue chrome to the blush signal, and
  added global focus-visible and reduced-motion rules. `app-route` now accepts
  the new settings paths and the structure test includes the docs domain.
  Build, typecheck, lint, and **620/620 tests** pass.

- 2026-11-05 — **Complete server restructure (Phase 9 / UI-17):** all 119 API
  route handlers moved out of `src/app/api` into feature modules
  (`features/{account,analytics,auth,legacy,payments,share,system,websites,workspaces}/server`).
  Route files now contain only HTTP-method re-exports and static Next config.
  Payment provider clients/webhooks/backfills, provider credential handling,
  analytics import parsers, and board definitions moved from `src/lib` and
  `src/queries` into `features/payments`, `features/websites`, and
  `features/legacy`. Added `docs/ARCHITECTURE.md` (layer boundaries,
  dependency direction, route contract), extended
  `src/lib/app-structure.test.ts` to enforce thin API routes and server-module
  presence, and updated the UI design-system map. Build, typecheck, lint, 126
  API tests, and the full suite pass.
- 2026-11-05 — **Complete source restructure (Phase 9):** `src/app` is now the
  routing layer only. Product UI moved into `src/features` domain modules:
  `app-shell` (shell/top nav/notices), `portfolio` (all-websites home),
  `websites` (list helpers + `workbench` with reports, sessions, events,
  replay, settings), `settings` (workspace, websites, plan and usage, account,
  preferences), `onboarding` (welcome and website setup), `auth` (login,
  signup, verify, reset, invite, logout), `marketing` (landing and pricing),
  `share` (public share shell), and `legacy` (quarantined boards/links/pixels).
  `src/app` contains route files plus `Providers.tsx` only. Removed the unused portfolio table
  components and the obsolete revenue-attribution/revenue-journey report
  screens and query hooks (their API endpoints remain for exports and the
  diagnostics view). `/websites/*` and `/settings/*` now redirect to the
  canonical `/app/*` routes. Customer-facing provider webhook names,
  descriptions, diagnostics copy, and import labels now read from
  `src/lib/brand.ts`; README, SECURITY, and CONTRIBUTING no longer present the
  upstream product as the product. Fixed a timing-flaky session-cookie test by
  freezing the clock. Build, typecheck, lint, and 613/613 tests pass, including a new
  `src/lib/app-structure.test.ts` that locks routes to `src/app` and product UI to
  `src/features`; an
  authenticated smoke run returned 200 on all 19 workbench routes and the 7
  settings/portfolio surfaces.
- 2026-11-05 — **Usage metering and the Plan & usage surface (Phases 6 + 9):**
  new `usage_period` and `usage_replay_session` tables; atomic reserve-then-write
  event metering in the collector with release on write failure; replay
  entitlement + once-per-session metering in the recorder; 80% warning, 100%
  grace (1,000 events / 100 replays), then paused ingestion while reads stay
  open. New member-visible `GET /api/workspaces/[workspaceId]/usage`, an app
  shell notice banner, and `/app/settings/billing` (plan, reset date, usage
  bars, limits, upgrade path). Settings now has a real index, a grouped nav, and
  a workspace website inventory at `/app/settings/websites`; billing and
  websites were added to the supported-route contract.
  `docs/USAGE_METERING.md` records the counting rules and limits. Full suite
  611/611; build, typecheck, and lint green.
- 2026-11-05 — **Application restructure (Phase 9):** every inherited analytics
  surface now has a first-class `/app/[websiteId]` route and a grouped
  workbench rail (`WebsiteSectionNav`): Revenue (overview, revenue, attribution,
  journeys, diagnostics), Audience (visitors, events, realtime, breakdown),
  Behaviour (goals, funnels, retention, cohorts), Growth (UTM, performance,
  compare), replay, and settings. Legacy revenue debug routes redirect to the
  canonical paths. The website layout uses a 1320 px workstation width.
  `/app` is now a revenue-first portfolio (revenue, revenue/visitor, purchase
  rate, visitors; revenue-led site cards); the website metric strip now leads
  with revenue and revenue/visitor; and the overview's funnels/journey tabs
  link to the real report pages instead of showing "Coming soon". `/` is a real
  landing page driven by `BRAND` + `PLANS` instead of redirecting to login.
  Brand chrome moved from
  blue to the blush signal, and the top nav/search/settings/404/share surfaces
  use the brand mark and config. New tests: nav coverage/active state (4) and
  expanded route allowlist. Full suite 597/597, build/lint/typecheck green; 19
  authenticated route smoke checks returned 200.
- 2026-11-05 — **Auth and isolation restructuring (Phases 3–4):** durable
  PostgreSQL sessions behind an HttpOnly/SameSite cookie; localStorage bearer
  tokens removed from the browser; password change/reset revokes every session;
  hashed single-use email-verification and password-reset tokens; Postgres
  rate limiting for login/signup/reset; CSRF origin checks; account deletion;
  workspace update/transfer/delete routes; platform-admin allowlist; bootstrap
  `admin` credentials disabled; cached sessions scoped by website (real
  contamination bug fixed); webhook/job isolation tests; auth-maintenance cron.
  New migrations `20261104185008_auth_sessions` and
  `20261104190000_remove_default_admin`. Build, typecheck, lint, the full test
  suite (577 tests), and a 17-assertion live smoke on the production build are
  green.
- 2026-11-05 — **Tenancy restructuring:** every website route now resolves
  access through workspace membership; `isAdmin` is no longer a tenant grant;
  public signup + transactional registration; hashed invitation flow with
  accept/revoke UI; workspace member management; workspace switcher and
  `/app/settings/workspace`; plan-based website/member limits; static
  route-boundary test; `docs/TENANCY.md`. New tests: 10 isolation, 8 invitation,
  3 registration, 1 boundary. Build green.
- 2026-11-04 — Phase 2 partial: Workspace/Membership/Invitation models,
  `website.workspace_id` migration + backfill, central permission module,
  workspace/website APIs, and unit tests (13 new tests).
- 2026-11-04 — Phase 9 partial: brand config, new mark/favicons, rebranded
  login/nav/metadata, `/pricing` with exactly two plans.
- 2026-11-04 — Phase 8 partial: Tartly-style onboarding flow with welcome
  halftone, 12px/320ms/70ms motion, workspace → website → install → verify →
  payments; live verification proven with a real event.
- 2026-11-04 — Phase 6 partial: `src/lib/plans.ts` (Starter $7.99 / Pro $14.99,
  no free tier) and `docs/PRICING_ECONOMICS.md` with fetched competitor prices
  and margin model.
- 2026-11-04 — Phase 1: pooled/unpooled URL split, retry helper, pool timeouts,
  `/api/health`, `.env.example`, environment + Neon branching docs.
- 2026-11-04 — Phase 0 complete: audit, license/brand audit, baseline
  (build/lint/typecheck pass; 3 pre-existing test failures).
- 2026-11-04 — Tracker created; repo cloned; commercial contract fixed at two
  paid plans; Tartly UI/onboarding mandate recorded.

## Risk register

| Risk                                                                                                              | Severity | Mitigation                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| The fork is a single-install product; tenancy is implicit via `user_id`/`team_id` on `website`                    | Critical | Add `Workspace` ownership and central authorization in Phase 2; isolation suite in Phase 3                                              |
| Analytics events and replays are stored in PostgreSQL, so hosting cost scales with customer volume                | High     | Keep events off Neon; use a separate Postgres/ClickHouse for events before scale; meter usage (Phase 6)                                 |
| Existing auth is username/password with a bootstrap `admin`/`admin`                                               | Critical | **Mitigated (Phase 4):** bootstrap row disabled by migration; hashed sessions/tokens, rate limits, CSRF, and verification/reset shipped |
| Upstream Cloud features (Search Console, social mentions) are absent from OSS                                     | Medium   | Position only on what OSS actually ships; do not advertise missing features                                                             |
| Dodo is used as an analytics provider; using it for platform billing risks mixing contexts                        | High     | Separate `BillingProvider` module + distinct webhook routes and models                                                                  |
| Tartly is a different product (email operator); copying visuals must not import its dependencies or product logic | Medium   | Extract tokens/motion into Talivia's existing CSS/React system; no Tailwind migration                                                   |
| No Neon/Dodo/email credentials in this environment                                                                | High     | Stub behind interfaces, document exact needs, keep local PostgreSQL proof                                                               |
| Plan limits are not yet modelled against real costs                                                               | High     | Phase 6 economics doc before enabling billing                                                                                           |
| Competitor price claims can go stale                                                                              | Medium   | Cite URL + fetch date; re-check before launch                                                                                           |
| Event/replay retention deletion is destructive                                                                    | High     | Idempotent, tenant-scoped jobs + dry-run tests                                                                                          |
