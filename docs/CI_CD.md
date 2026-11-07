# CI/CD and supply-chain security

The repository has three workflows. Pull requests must pass CI and the security
jobs before merge; `main` deploys only after the same checks pass.

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/ci.yml` | pull request, push to `main`, manual | format, lint, typecheck, coverage, PostgreSQL integration smoke, production build, dependency audit, CodeQL, secret scan, dependency review, container build and image scan |
| `.github/workflows/deploy.yml` | after CI succeeds on `main`, manual dispatch | migration, image build, app restart, readiness check, automatic rollback |
| `.github/workflows/release.yml` | version tag `v*` | validates that the tag matches `package.json`, is on `main`, and still builds |

## Local gate

```bash
pnpm gate
```

`pnpm gate` is the same contract used by CI: Biome format, Biome lint,
`tsc --noEmit`, the full Vitest suite with coverage, and the production build.
Coverage floors live in `vitest.config.ts`:

| Metric | Floor | Baseline on 2026-11-07 |
| --- | --- | --- |
| Statements | 65% | 67.6% |
| Branches | 50% | 55.6% |
| Functions | 60% | 63.4% |
| Lines | 65% | 68.0% |

The floors stop regressions. They are not a claim that every module is fully
covered. Change the floor only with a recorded reason.

Useful single commands:

```bash
pnpm test:coverage
pnpm audit --prod --audit-level high
pnpm exec prisma migrate deploy
pnpm exec vitest run --config vitest.phase7.config.ts \
  src/features/analytics/server/queries/phase7-analytics-smoke.test.ts
```

## CI jobs

`verify` starts PostgreSQL 17 and runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm build-db`
3. format, lint, typecheck
4. `pnpm test:coverage`, with the report uploaded as an artifact
5. `pnpm audit --prod --audit-level high`
6. `prisma migrate deploy` against the CI database
7. the gated PostgreSQL analytics smoke
8. `pnpm build`

`security` runs gitleaks over the full history, dependency review on pull
requests, CodeQL with the extended and quality query packs, and Trivy
filesystem/secret/misconfiguration scanning. SARIF is uploaded to GitHub code
scanning.

`container` builds the production Docker image with the commit SHA as
`BUILD_VERSION`, then scans the image with Trivy and fails on CRITICAL
vulnerabilities with a fix available. The runtime image starts with
`node scripts/start-docker.mjs`, installs only production dependencies, and
removes npm/npx plus the global pnpm tree. That keeps build tooling and their
transitive advisories out of the shipped image. Migrations run
`./node_modules/.bin/prisma` directly. Local verification with Trivy 0.70
reports 0 CRITICAL/HIGH findings.

All third-party actions are pinned to full commit SHAs. Workflow permissions
are read-only except `security-events: write` in the scanning jobs.

## Production deployment

### One-time host layout

```text
/opt/tartly/app                  git clone of this repository
/opt/tartly/runtime/.env         production secrets, chmod 600, never in git
/opt/tartly/runtime/docker-compose.yml   copied by deploy.sh
/opt/tartly/runtime/Caddyfile            copied by deploy.sh
```

The VPS must have Docker Engine with the Compose plugin, `git`, and outbound
network access. The SSH key used by CI must be authorized for a non-root
deploy user that can run `docker` and write to both directories.

`deploy/production/deploy.sh`:

1. fetches `origin/main` and refuses any commit that is not on `origin/main`;
2. resets the checkout to the exact SHA that passed CI;
3. copies the committed compose file and Caddyfile into the runtime directory;
4. builds `tartly-app:<sha>` with `BUILD_VERSION=<sha>`;
5. runs `prisma migrate deploy` through the one-shot `migrate` service using
   `DATABASE_URL_UNPOOLED` (the direct Neon host);
6. restarts only the app container, leaving Caddy and TLS state intact;
7. polls `https://<domain>/api/health/ready` for up to two minutes;
8. on failure, redeploys the previous SHA and verifies it again.

Migrations are never reversed automatically. A bad migration is fixed with a
forward migration or a Neon branch restore.

### Required repository configuration

Create the `production` environment in **Settings → Environments** and add
required reviewers. Then set environment secrets:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | VPS hostname or IP |
| `DEPLOY_USER` | non-root deploy user |
| `DEPLOY_SSH_KEY` | OpenSSH private key authorized on the VPS |
| `DEPLOY_KNOWN_HOSTS` | pinned `known_hosts` line for the VPS host key |

Set repository variables:

| Variable | Value |
| --- | --- |
| `APP_URL` | `https://tartly.in` |
| `DEPLOY_ENABLED` | `true` to enable automatic deploys |

Do not enable `DEPLOY_ENABLED` until all five values exist. The deploy job
validates them and fails with a clear `::error::` message rather than attempting
an unauthenticated connection.

CLI setup:

```bash
gh secret set DEPLOY_HOST --env production
gh secret set DEPLOY_USER --env production
gh secret set DEPLOY_SSH_KEY --env production < ~/.ssh/tartly_ci
gh secret set DEPLOY_KNOWN_HOSTS --env production < known_hosts
gh variable set APP_URL --body "https://tartly.in"
gh variable set DEPLOY_ENABLED --body "true"
```

Pin the host key with `ssh-keyscan <host>` and compare the fingerprint with the
provider console out of band. Never disable host-key checking.

### Manual deploy and rollback

Manual deploy from an allowed ref:

```bash
gh workflow run deploy.yml -f sha=<40-char-main-sha>
```

Rollback: re-run the deploy workflow with the previous known-good SHA. The
script accepts only commits that are already on `origin/main`. Database
rollback follows `docs/BACKUP_AND_RECOVERY.md`.

## Branch protection

`main` must require:

- pull request before merging, with at least one approval;
- `CI / Verify (format, lint, types, tests, build)`;
- `CI / Security (secrets, CodeQL, dependencies)`;
- `CI / Container build and image scan`;
- no force pushes and no deletions;
- conversations resolved before merge.

The `production` environment should require a reviewer so a merge cannot deploy
without an explicit approval.

## Dependency policy

- Production vulnerabilities at HIGH or CRITICAL fail CI through
  `pnpm audit --prod --audit-level high`.
- `pnpm.overrides` pins patched transitive versions. Every override needs a
  successful gate run; remove it when the parent dependency updates.
- Dependabot opens grouped weekly updates for npm, GitHub Actions, and Docker.
- Dev-only advisories are tracked but do not fail the production audit. They
  must be fixed before the affected tool runs on untrusted input.
- Never add a dependency without a written reason and a lockfile update.

## Secrets

The pipeline never prints secrets. `deploy.sh` does not source `.env`; it reads
only the non-secret `TARTLY_DOMAIN` value for the health URL and lets Docker
Compose inject the rest. SSH keys live in the runner temporary directory with
mode 600 and are removed when the runner is destroyed. Rotate a key immediately
if it may have appeared in a log, artifact, or pull request.
