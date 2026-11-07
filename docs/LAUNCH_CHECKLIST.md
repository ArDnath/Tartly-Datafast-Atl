# Launch checklist

Every line is either ticked with evidence or marked **UNVERIFIED** with the exact
human action. No launch claim is allowed without a stored result.

## Product and plans

- [x] Two paid plans plus a 7-day free trial: Free trial 2,000 events/1
      website, Starter $7.99/100k events/1 website, Pro $14.99/1M events/50
      websites (`src/lib/plans.ts`, tests).
- [x] Plan limits enforced server-side; no hardcoded limits in components.
- [x] Landing, pricing, docs, legal, login, signup reachable.
- [x] Onboarding: welcome → workspace → website → install → verify → payments →
      first report.
- [x] Analytics surfaces: revenue, attribution, journeys, sessions, events,
      realtime, breakdown, goals, funnels, retention, cohorts, UTM,
      performance, compare, replays.
- [x] Rendered-surface smoke: 17 public + 12 authenticated routes return 200
      (`docs/RENDER_SMOKE.md`).
- [ ] Real browser walkthrough of onboarding, motion, and replay masking.
      **UNVERIFIED**: the desktop browser was not connected; run it against a
      deployed preview.

## Tenant isolation and auth

- [x] Central authorization and static route-boundary test.
- [x] A/B workspace isolation suite (10 scenarios).
- [x] Webhook and background-job isolation tests.
- [x] Password reset, verification, session revocation, suspension.
- [x] CSRF origin check on cookie-authenticated mutations.
- [x] Rate limits on login, registration, reset, and abuse-prone paths.
- [x] No default admin credentials; platform-admin allowlist.

## Billing (context A)

- [x] Plan config, checkout, portal, cancel-at-period-end, plan changes.
- [x] Signed webhook verification, idempotency, out-of-order convergence.
- [x] Entitlements read provider-backed subscription state.
- [x] Invoice/renewal history from provider rows only.
- [ ] Live Dodo test-mode checkout, webhook, portal, proration.
      **UNVERIFIED**: needs `DODO_PAYMENTS_API_KEY`, webhook secret, and four
      product IDs. Steps: `docs/PLATFORM_BILLING.md`.

## Analytics integrations (context B)

- [x] Per-website connections for Stripe, Dodo, Lemon Squeezy, Polar, Yolfi,
      manual API; encrypted credentials; deduplicated webhooks.
- [x] First/last-touch attribution journeys and recurring/direct/unattributed
      cases.
- [x] 48-assertion PostgreSQL analytics smoke.
- [ ] Live webhook delivery for each provider.
      **UNVERIFIED**: needs provider test accounts and signing secrets.

## Privacy and compliance

- [x] Account export (`GET /api/me/export`) and account deletion.
- [x] Replay input masking by default and consent gate.
- [x] Plan-based analytics/replay retention job; dry-run mode.
- [x] Legal drafts (privacy, terms, cookies, DPA, subprocessors, acceptable
      use) with a lawyer-review notice.
- [ ] Lawyer review of every legal page.
      **UNVERIFIED**: requires qualified counsel.
- [ ] Confirm subprocessor list (Neon, host, Resend, Dodo, error tracker,
      optional Redis/ClickHouse) against the actual production deployment.
      **UNVERIFIED**: depends on the final hosts.

## Abuse and operations

- [x] Registration rate limits, disposable-domain rejection, bot filtering,
      blocked-IP support, optional tracker-origin enforcement.
- [x] Platform-admin suspension for users and workspaces with audit events.
- [x] Structured JSON logs with secret redaction and optional error tracking.
- [x] `/api/health/live`, `/api/health/ready`, `/api/health`.
- [x] Transactional email: verification, reset, invitation, usage warning/limit,
      payment failure; dev outbox fallback.
- [ ] Live Resend delivery from a verified domain.
      **UNVERIFIED**: needs `RESEND_API_KEY` and DNS records.
- [x] Backup/restore and secret-rotation procedures documented.
- [ ] Neon production branch migration and point-in-time restore rehearsal.
      **UNVERIFIED**: needs the production Neon project.
- [x] Audit log writes verified for suspension/unsuspension; other actions are code-reviewed and grep-verified (`docs/LIVE_SMOKE.md`).
- [x] Verification/reset token lifecycle exercised through the real routes and the local outbox.
- [ ] Live Resend delivery and inbox links remain **UNVERIFIED**.

## Security

- [x] Security headers (CSP, HSTS in prod, nosniff, frame/referrer/permissions).
- [x] Collector CORS narrowed; body/validation limits in place.
- [x] Dependency audit: 0 critical; remaining highs are build/dev tooling.
- [x] Secrets absent from git and responses; provider credentials encrypted.
- [x] `docs/SECURITY_REVIEW.md` OWASP mapping.
- [ ] External penetration test or independent review.
      **UNVERIFIED**: optional pre-scale; schedule after first revenue.

## Performance and scale

- [x] Indexed tenant/event/session/usage/billing paths; bounded payloads.
- [x] Plan metering, grace, pause; retention; connection pool settings.
- [x] `scripts/load-ingest.mjs` load generator.
- [ ] Sustained load test with recorded p50/p95/p99, error rate, and DB
      saturation.
      **UNVERIFIED**: needs a deployed environment and a load window.
- [ ] Cache-stampede and parallel-ingestion concurrency proof.
      **UNVERIFIED**: needs multi-instance staging.

## Deployment and CI

- [x] CI: install, Prisma, lint, typecheck, coverage-enforced tests,
      PostgreSQL analytics smoke, high-severity production audit, production
      build (`docs/CI_CD.md`).
- [x] Security CI: gitleaks history scan, CodeQL extended/quality queries,
      dependency review, Trivy filesystem and container scans, SARIF upload.
- [x] Deployment pipeline with immutable SHA tag, direct-URL migrations,
      readiness gate, and automatic rollback (`deploy/production/deploy.sh`).
- [x] Multi-stage Docker image, non-root user, health check, compose stack.
- [x] Environment reference and Neon branching guide.
- [x] Runbook, backup/recovery, secrets rotation.
- [x] Hosting account, domain/DNS, TLS, custom tracker domain.
      Evidence: `https://tartly.in` serves HTTP/2 with a valid certificate;
      `/`, `/pricing`, and `/docs` return 200.
- [x] Production environment variables and first deploy.
      Evidence: VPS `201.18.197.194`, non-root `deploy` user, `production`
      environment secrets/variables, and deploy run 42397381387 for
      `04d7023`. `/api/health/live` and `/api/health/ready` return 200 with the
      deployed version; `/api/health/ready` reports `database: up`.
- [x] Production environment requires a reviewer; `main` requires the Verify,
      Security, and Container checks, resolved conversations, and rejects
      force-pushes and branch deletion (`docs/CI_CD.md`).

## Go-to-market

- [x] Positioning, pricing narrative, comparison framework, SEO plan, launch
      plan, email sequence, metrics (see `docs/gtm/`).
- [ ] Every competitor price re-verified on launch day with URL and date.
- [ ] Product Hunt/Indie Hackers/Show HN drafts reviewed against community rules.
- [ ] Support inbox and status page live.

## Final gate

```bash
pnpm gate
```

Must pass. Then complete this checklist's **UNVERIFIED** lines or explicitly
defer them with an owner and date. A launch with unresolved blockers is a
business decision, not an engineering one.
