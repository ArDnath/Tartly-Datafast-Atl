# CI/CD and supply-chain security

The repository has three workflows. The checked-in ruleset
(`.github/rulesets/main-protection.json`) requires a pull request and the three
CI jobs before a merge to `main`; apply it as described in
[Merge gate](#merge-gate-branch-protection). A merge to `main` deploys
automatically after the same checks pass; there is no approval click.

| Workflow                        | Trigger                                      | Purpose                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | pull request, push to `main`, manual         | format, lint, typecheck, coverage, PostgreSQL integration smoke, production build, dependency audit, CodeQL, secret scan, dependency review, container build and image scan |
| `.github/workflows/deploy.yml`  | after CI succeeds on `main`, manual dispatch | current-main check, migration, image build, app restart, version-checked readiness, public smoke, automatic rollback                                                        |
| `.github/workflows/release.yml` | version tag `v*`                             | validates that the tag matches `package.json`, is on `main`, and still builds                                                                                               |

## Local gate

```bash
pnpm gate
```

`pnpm gate` is the same contract used by CI: Biome format, Biome lint,
`tsc --noEmit`, the full Vitest suite with coverage, deploy-script parsing plus
the post-deploy smoke-harness tests, and the production build. Coverage floors
live in `vitest.config.ts`:

| Metric     | Floor | Baseline on 2026-11-07 |
| ---------- | ----- | ---------------------- |
| Statements | 65%   | 67.6%                  |
| Branches   | 50%   | 55.6%                  |
| Functions  | 60%   | 63.4%                  |
| Lines      | 65%   | 68.0%                  |

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
4. `pnpm gate:deploy` — parses the deploy scripts and runs the post-deploy
   smoke-harness tests
5. `pnpm test:coverage`, with the report uploaded as an artifact
6. `pnpm audit --prod --audit-level high`
7. `prisma migrate deploy` against the CI database
8. the gated PostgreSQL analytics smoke
9. `pnpm build`

`security` runs gitleaks, dependency review on pull requests, CodeQL with the
extended and quality query packs, and a blocking Trivy
filesystem/secret/misconfiguration scan. SARIF is uploaded to GitHub code
scanning.

These steps run at no cost on the public repository and execute on every
change. If it becomes private again, GitHub Code Security (formerly GitHub
Advanced Security) must be purchased and the repository variable
`GHAS_ENABLED=true` set; otherwise CodeQL, dependency review, and SARIF upload
are skipped. The workflow keeps that condition so no code edit is needed. The
filesystem scan blocks CRITICAL/HIGH findings with a fix available; the
2026-11-11 baseline (Trivy 0.70, same arguments) reported 0 findings locally and
passed on CI, and the container image scan remains the release gate.

`container` builds the production Docker image with the commit SHA as
`BUILD_VERSION`, then scans the image with Trivy and fails on CRITICAL/HIGH
vulnerabilities with a fix available. A second non-blocking scan uploads the
full severity inventory for visibility. The runtime image starts with
`node scripts/start-docker.mjs`, installs only production dependencies, and
removes npm/npx plus the global pnpm tree. That keeps build tooling and their
transitive advisories out of the shipped image. Migrations run
`./node_modules/.bin/prisma` directly. Local verification with Trivy 0.70
reports 0 CRITICAL/HIGH findings.

All third-party actions are pinned to full commit SHAs. Workflow permissions
are read-only except `security-events: write` in the scanning jobs.

## Production deployment

### Deployment invariants

The deploy workflow enforces all of these on every release:

1. **CI passed on `main`.** The `workflow_run` job only starts after a
   successful `CI` run whose event is a push to `main`.
2. **The target is still current.** Automatic deploys must equal the current
   `origin/main` head. If a newer merge lands while an older deploy is queued,
   the older run fails instead of rolling production backwards. A deliberate
   rollback opts in with `workflow_dispatch -f allow_previous=true`.
3. **The host target is on `main`.** `deploy.sh` independently requires the
   target to be an ancestor of `origin/main`; rollback mode still cannot deploy
   an unmerged commit.
4. **The exact build is running.** Readiness additionally requires
   `/api/health/ready` to report `version` equal to the deployed commit SHA and
   `database: "up"`. A 200 from an old container is not a successful deploy.
5. **The public surface answers.** `scripts/deploy-smoke.mjs` checks
   `/api/health/live`, `/api/health/ready`, `/`, `/pricing`, `/docs`, `/login`,
   `/robots.txt`, and `/sitemap.xml`, without following redirects.
6. **The previous build is the rollback source.** The script reads the running
   version before changing the checkout, reuses the previous local image, and
   records the successful SHA in `$RUNTIME_DIR/last-deploy`. A failed build or
   migration leaves the old container running and restores the checkout.
7. **One deploy at a time.** The `deploy-production` concurrency group never
   cancels an in-flight deploy, and `deploy.sh` holds a host-side `flock` so an
   operator cannot race the same compose project and migration.

The control is enforced in `.github/workflows/deploy.yml` and
`deploy/production/deploy.sh`; `pnpm gate` also parses the scripts and runs the
smoke-harness tests.

### Production data services

| Service    | Image                                  | Volume            | Memory cap | Purpose                                                       |
| ---------- | -------------------------------------- | ----------------- | ---------- | ------------------------------------------------------------- |
| PostgreSQL | `postgres:17-alpine`                   | `postgres_data`   | 1 GB       | tenant data, billing, usage, audit, attribution mirror        |
| Redis      | `redis:7.4-alpine`                     | `redis_data`      | 320 MB     | cache and collector helpers (sessions stay in PostgreSQL)     |
| ClickHouse | `clickhouse/clickhouse-server:25.3`    | `clickhouse_data` | 2 GB       | events, event/session data, replay, analytics queries         |
| Kafka      | `apache/kafka:3.9.1` (KRaft, 1 broker) | `kafka_data`      | 1 GB       | event transport from the app to the ClickHouse writer         |
| Worker     | `tartly-app:<sha>`                     | none              | 512 MB     | Kafka -> ClickHouse bridge, only with the `streaming` profile |
| App        | `tartly-app:<sha>`                     | none              | 1 GB       | Next.js standalone server                                     |
| Caddy      | `caddy:2-alpine`                       | `caddy_*`         | 256 MB     | the only public listener                                      |

None of the data services publish a host port. The app connects over the
Compose network using `postgres:5432`, `redis:6379`, `clickhouse:8123`, and
`kafka:9092`. The worker is started by `deploy.sh` only when `KAFKA_URL`,
`KAFKA_BROKER`, and `CLICKHOUSE_URL` are set. If Kafka is unavailable, the
application falls back to a direct ClickHouse insert so events are not lost.

### One-time host layout

```text
/opt/tartly/app                          git clone of this repository
/opt/tartly/runtime/.env                 production secrets, chmod 600, never in git
/opt/tartly/runtime/docker-compose.yml   copied by deploy.sh
/opt/tartly/runtime/Caddyfile            copied by deploy.sh
/opt/tartly/runtime/clickhouse/low-memory.xml  copied by deploy.sh
/opt/tartly/runtime/backup.sh            copied by deploy.sh
/opt/tartly/backups                      pg_dump + ClickHouse backups, mode 700
```

The production stack is self-hosted on the VPS. PostgreSQL, Redis,
ClickHouse, and Kafka run as containers with persistent Docker volumes and
memory limits. There is no Neon connection in production. The only public
listener is Caddy on 80/443; database and broker ports are not published.

The VPS must have Docker Engine with the Compose plugin, `git`, and outbound
network access. The SSH key used by CI must be authorized for a non-root
deploy user that can run `docker` and write to both directories.

Current host baseline (verified 2026-11-11): Ubuntu 26.04.1 LTS, Docker Engine
29.9.2, Compose v5.6.1, git 2.53.0, UFW active with only 22/80/443 open, SSH
password authentication disabled, and `PermitRootLogin prohibit-password`.

There are **two separate keys**. Do not reuse one for both jobs:

1. **GitHub Actions → VPS**: the private key in the `DEPLOY_SSH_KEY`
   environment secret. Its public key is in
   `/home/deploy/.ssh/authorized_keys` on the VPS.
2. **VPS → GitHub**: `/home/deploy/.ssh/id_ed25519_github`, registered as a
   **read-only** repository deploy key. This key lets `deploy.sh` fetch
   `origin/main`; it is never used by the GitHub runner.

The GitHub Actions checkout uses the workflow `GITHUB_TOKEN`, so no third key is
needed.

### One-time Ubuntu host bootstrap

Run as root on a fresh host, replacing `<owner>/<repo>` and the domain:

```bash
adduser --disabled-password --gecos '' deploy
usermod -aG sudo,docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh

# 1. CI -> host. Append the public half of DEPLOY_SSH_KEY.
install -m 600 -o deploy -g deploy /dev/null /home/deploy/.ssh/authorized_keys
# ... append the public key, then:
chown deploy:deploy /home/deploy/.ssh/authorized_keys

# 2. Host -> GitHub. Register the .pub as a read-only deploy key.
sudo -u deploy ssh-keygen -t ed25519 -N '' -C tartly-vps-deploy \
  -f /home/deploy/.ssh/id_ed25519_github
sudo -u deploy sh -c 'cat > ~/.ssh/config' <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
EOF
chmod 600 /home/deploy/.ssh/config

# 3. Host clone and runtime secrets.
sudo -u deploy git clone git@github.com:<owner>/<repo>.git /opt/tartly/app
install -d -o deploy -g deploy /opt/tartly/runtime
sudo -u deploy install -m 600 /dev/null /opt/tartly/runtime/.env
```

Install Docker Engine with the Compose plugin from Docker's official apt
repository. Do not use a snap or a rootless-only install for this stack; the
`deploy` user needs access to the Docker socket. Fill
`/opt/tartly/runtime/.env` from `deploy/production/.env.example`; never commit
it, print it, or place it inside the repository. Both database URLs point at
the internal `postgres` service. Generate the infrastructure passwords with
`openssl rand -hex 32` and use the same value in the `*_PASSWORD` key and the
matching URL. The deploy user must be able to create `/opt/tartly/backups`.

Verify the two directions before enabling `DEPLOY_ENABLED`:

```bash
# Host -> GitHub (must print the repository name, not a credential prompt)
sudo -u deploy -H bash -lc \
  'cd /opt/tartly/app && GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code --heads origin main'

# CI -> host key is authorized
sudo -u deploy ssh-keygen -lf /home/deploy/.ssh/authorized_keys

# Runtime secrets are private
stat -c '%a %U:%G' /opt/tartly/runtime/.env   # 600 deploy:deploy

# Docker is usable without sudo
sudo -u deploy docker ps
```

Keep the host's BuildKit cache bounded. A busy host can accumulate tens of
gigabytes of build cache and fail the next deploy on disk space:

```bash
docker system df
docker builder prune -af --keep-storage 10GB
docker image prune -f
```

### Host repository access

The host clone at `/opt/tartly/app` fetches over SSH with a **read-only deploy
key**. It must not use an HTTPS remote with an embedded token: that fails with
`fatal: could not read Username for 'https://github.com'` and previously broke
every deploy.

| Item              | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Key               | `~deploy/.ssh/id_ed25519_github` (ed25519, no passphrase)                                     |
| SSH config        | `Host github.com` → `User git`, `IdentityFile ~/.ssh/id_ed25519_github`, `IdentitiesOnly yes` |
| Remote            | `git@github.com:ArDnath/Tartly-Datafast-Atl.git`                                              |
| GitHub permission | repository deploy key, write access **off**                                                   |

Register the public key under **Settings → Deploy keys** with write access off.
`deploy.sh` runs `git ls-remote` with `GIT_TERMINAL_PROMPT=0` before fetching, so
a missing key fails in seconds with the exact fix instead of hanging on a
credential prompt.

Rotation: generate a new key as the deploy user, add it as a second read-only
deploy key, point `~/.ssh/config` at it, confirm `git ls-remote origin main`,
then delete the old key from GitHub.

`deploy/production/deploy.sh`:

1. fetches `origin/main` and refuses any commit that is not on `origin/main`;
2. requires the target to equal the current `origin/main` head unless
   `ALLOW_NON_HEAD=1` is set for an explicit rollback;
3. resets the checkout to the exact SHA that passed CI;
4. copies the committed compose file, Caddyfile, ClickHouse config, and backup
   script into the runtime directory;
5. builds `tartly-app:<sha>` with `BUILD_VERSION=<sha>`;
6. starts PostgreSQL, Redis, ClickHouse, and Kafka and waits for their health
   checks;
7. takes a pre-deploy PostgreSQL dump with `backup.sh --postgres-only`;
8. runs `prisma migrate deploy` through the one-shot `migrate` service using
   `DATABASE_URL_UNPOOLED` (the internal PostgreSQL service);
9. runs `scripts/clickhouse-migrate.mjs` through the one-shot
   `clickhouse-migrate` service;
10. restarts the app and, when Kafka and ClickHouse are configured, the
    Kafka-to-ClickHouse worker; Caddy and TLS state stay intact;
11. polls `https://<domain>/api/health/ready` for up to two minutes and requires
    `ok: true`, `database: "up"`, and `version: "<sha>"`;
12. on failure, redeploys the previous SHA and verifies it again;
13. records the healthy SHA in `$RUNTIME_DIR/last-deploy`.

If the image build, data-service start, backup, or migration fails, the running
app is not restarted and the checkout is restored to the running SHA.
Migrations are never reversed automatically. A bad migration is fixed with a
forward migration or a restore from `/opt/tartly/backups` (see
`docs/BACKUP_AND_RECOVERY.md`).

The backup timer is installed once by the operator; `deploy.sh` only takes the
pre-deploy dump. See the daily backup cron in `docs/BACKUP_AND_RECOVERY.md`.

### Required repository configuration

Create the `production` environment in **Settings → Environments** with
`main` as the only allowed deployment branch. Do **not** add required
reviewers: the deploy starts automatically after CI succeeds on `main`. If a
manual approval gate is added later, every merge will wait for a reviewer.
Then set environment secrets:

| Secret               | Value                                          |
| -------------------- | ---------------------------------------------- |
| `DEPLOY_HOST`        | VPS hostname or IP                             |
| `DEPLOY_USER`        | non-root deploy user                           |
| `DEPLOY_SSH_KEY`     | OpenSSH private key authorized on the VPS      |
| `DEPLOY_KNOWN_HOSTS` | pinned `known_hosts` line for the VPS host key |

Set repository variables:

| Variable         | Value                              |
| ---------------- | ---------------------------------- |
| `APP_URL`        | `https://tartly.in`                |
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

Manual deploy of the current `main` head:

```bash
gh workflow run deploy.yml
```

Manual deploy of a specific commit on `main`:

```bash
gh workflow run deploy.yml -f sha=<40-char-main-sha>
```

Rollback to a previous known-good commit on `main`:

```bash
gh workflow run deploy.yml -f sha=<previous-40-char-main-sha> -f allow_previous=true
```

Without `allow_previous=true`, a SHA that is not the current `main` head is
rejected before the host is contacted. The script accepts only commits that are
already on `origin/main`. Database rollback follows
`docs/BACKUP_AND_RECOVERY.md`.

## Merge gate (branch protection)

`main` protection is defined by the repository ruleset
`.github/rulesets/main-protection.json`. Apply or update it with:

```bash
bash scripts/apply-branch-protection.sh
```

The ruleset is active on the public repository (`main-protection`, id
27043347).

The ruleset requires a pull request, linear history, resolved conversations, an
up-to-date branch, and these three check-run contexts:

- `Verify (format, lint, types, tests, build)`
- `Security (secrets, CodeQL, dependencies)`
- `Container build and image scan`

Force pushes and branch deletion are blocked.

The approval count is intentionally **0**: the project has one maintainer and
GitHub does not allow self-approval. The required checks and resolved
conversations are the gate; raise the count when a second maintainer exists.

Rulesets are included with public repositories. A private repository on GitHub
Free returns HTTP 403 ("Upgrade to GitHub Pro or make this repository public")
for both branch protection and rulesets; the repository is public, so this is
not a constraint today.

Status-check contexts are the job names, not `CI / <job>`: a ruleset matches the
check run exactly, and a wrong string silently blocks every merge.

The `production` environment has no required reviewer, so a merge that passes
CI deploys without a manual approval click. It still restricts deployments to
protected branches (`main`) and keeps a deployment history. If a review gate is
wanted later, add a required reviewer; the deploy job then waits for that
approval before running. The deploy job also runs only after a successful
`main` CI.

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
only non-secret values (`TARTLY_DOMAIN`, `POSTGRES_USER`, `POSTGRES_DB`, and the
presence of `CLICKHOUSE_URL`/`KAFKA_*`) and lets Docker Compose inject the rest.
`backup.sh` never writes a secret to stdout, but the backup directory contains
database dumps and a copy of `.env`; it must stay mode 700 and be copied
off-host with encryption. SSH keys live in the runner temporary directory with
mode 600 and are removed when the runner is destroyed. Rotate a key immediately
if it may have appeared in a log, artifact, or pull request.
