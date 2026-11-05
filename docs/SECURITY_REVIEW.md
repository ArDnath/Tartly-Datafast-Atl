# Security review (launch gate)

Date: 2026-11-06. Scope: the whole repository at commit on `main` plus the
current working tree. This is an engineering review, not a penetration test and
not legal advice. External live-provider tests remain **UNVERIFIED** where no
credentials exist.

## OWASP Top 10 mapping

| Risk | Control | Evidence |
| --- | --- | --- |
| A01 Broken access control | Central website/workspace authorization; tenant-scoped queries; static boundary tests; platform-admin allowlist | `src/permissions/website.ts`, `src/lib/workspace-auth.ts`, `src/lib/tenant-boundaries.test.ts`, `src/permissions/website.workspace.test.ts`, `src/features/account/server/admin/**` |
| A02 Cryptographic failures | bcrypt password hashes; SHA-512 token-at-rest; AES-256-GCM provider credentials; HttpOnly/Secure/SameSite cookies; constant-time webhook compare | `src/lib/password.ts`, `src/lib/auth-session.ts`, `src/lib/crypto.ts`, `src/features/billing/lib/standard-webhook.ts` |
| A03 Injection | Parameterized Prisma/raw SQL; Zod schemas; no string-built SQL; React escaping | `src/lib/schema.ts`, `src/features/analytics/server/queries/sql/**`, all `parseRequest` call sites |
| A04 Insecure design | Two billing contexts separated; entitlements from server records; no checkout-redirect activation; plan limits server-side | `docs/PLATFORM_BILLING.md`, `src/lib/entitlements.ts`, `src/lib/plans.ts` |
| A05 Security misconfiguration | CSP, HSTS in production, nosniff, frame/referrer/permissions policy, no stack traces in production responses | `next.config.ts`, `src/lib/response.ts` |
| A06 Vulnerable components | `pnpm audit --prod`; CI fails on critical; overrides for patched transitive packages | this doc, `.github/workflows/ci.yml`, `package.json` `pnpm.overrides` |
| A07 Identification/authentication | Rate-limited login/reset/register; single-use expiring tokens; session revocation; suspended-user rejection | `src/lib/rate-limit.ts`, `src/lib/auth-tokens.ts`, `src/lib/auth-session.ts`, `src/lib/auth.ts` |
| A08 Software/data integrity | Versioned Prisma migrations; webhook HMAC; idempotent provider events; audit log; outbox-style processing | `prisma/migrations/**`, `src/features/billing/server/service.ts`, `src/features/payments/server/**` |
| A09 Logging/monitoring failures | Structured JSON logs, secret redaction, error-tracking hook, health/readiness, audit events | `src/lib/logger.ts`, `src/features/system/server/health/**`, `src/queries/prisma/audit.ts` |
| A10 SSRF | Outbound calls use fixed provider endpoints; no user-supplied URL fetch in request handlers; webhook URLs are provider-configured | `src/features/payments/server/providers/**`, `src/lib/fetch.ts` |

## Tenant isolation

- Every website read/update/delete resolves membership through
  `requireWebsiteAccess` / `canViewWebsite` / `canUpdateWebsite`.
- Event and replay rows are keyed by `website_id`; analytics routes reject an
  unauthorized website ID before querying.
- Cache keys include website scope (`session:${websiteId}:${sessionId}`) and a
  mismatched cached row is rejected.
- Billing, usage, audit, and membership writes carry workspace scope.
- A static test fails if a tenant route loses its guard
  (`src/lib/tenant-boundaries.test.ts`).
- Platform administration is separate from workspace OWNER/ADMIN and requires
  `PLATFORM_ADMIN_EMAILS`.

Residual risk: PostgreSQL Row-Level Security is not enabled. Application-level
checks plus the static test are the launch control. Revisit before enterprise
sales.

## Authentication and abuse

- Login: per-IP 30/15 min, per-account 10/15 min, generic invalid-credentials
  response, timing-safe password comparison via bcrypt.
- Registration: per-IP 5/hour, per-email 3/hour, disposable-domain rejection
  (configurable), CSRF origin check.
- Password reset: 10/hour per IP, single-use 1-hour token, all sessions revoked
  on success.
- Sessions: 32-byte random token, SHA-512 at rest, 30-day expiry, revocation on
  password change/reset/deletion/suspension.
- Suspended users are filtered by `getUser` and cannot sign in.
- Bot filtering and blocked-IP checks run on ingestion; tracker-origin
  enforcement is available via `ENFORCE_TRACKER_ORIGIN`.
- Plan metering is atomic and pauses ingestion after the grace window.

## Injection and validation

- All HTTP inputs use Zod through `parseRequest`.
- Prisma parameterizes queries; the inherited raw SQL engine is tenant-keyed and
  covered by the analytics smoke plus unit tests.
- Request bodies are size-limited by the framework/reverse proxy; standard JSON
  endpoints should stay under 1 MB. Replay chunks are the documented exception
  and are gated by entitlement.
- HTML rendering is React-escaped; replay privacy masks inputs by default.

## Headers and browser surface

`next.config.ts` sets:

- Content-Security-Policy
- Strict-Transport-Security in production
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera/microphone/geolocation/payment disabled

Collector CORS is limited to the four ingestion paths and the methods/headers
they actually use instead of a wildcard on every API route.

## Dependency audit

Command: `pnpm audit --prod` on 2026-11-06.

- `zod` was upgraded from 4.4.3 to 4.6.7 to clear a high advisory.
- Safe transitive overrides were applied for `browserslist`, `d3-color`, `defu`,
  `fast-uri`, `hono`, `js-yaml`, `source-map-js`, and `svgo`.
- Remaining high advisories: 18, all under build/dev tooling:
  `del → rimraf → glob → minimatch`, `@svgr/cli → glob → minimatch`, and
  Prisma CLI transitive packages (`deepmerge-ts`, `mysql2`). They are not loaded
  by the Next.js runtime request path.
- CI runs `pnpm audit --prod --audit-level critical`; there are **0 critical**.
- Follow-up: replace `del`/`@svgr/cli` build steps or add a compatible override
  once upstream releases a combined minimatch/brace-expansion fix. Track in
  `docs/PHASES.md`; do not force incompatible major versions.

## Secrets

- No secret is hardcoded or committed. `.env` is gitignored.
- Provider credentials are `enc:` AES-256-GCM values.
- `APP_SECRET` rotation has a dual-key window and a re-encryption script:
  `docs/SECRETS_ROTATION.md`.
- The logger redacts secret-like keys before serialization.

## Remaining launch blockers (not code defects)

- Live Dodo checkout/webhook/portal in test mode: needs keys and product IDs.
- Live Resend delivery: needs API key and verified domain.
- Live provider webhooks for Stripe/Dodo/Lemon Squeezy/Polar/Yolfi: needs
  provider accounts.
- Real browser recorder/masking walkthrough.
- Neon production branch migration, point-in-time restore rehearsal, and
  production load test.
- Lawyer review of legal drafts.

All are labelled **UNVERIFIED** in `docs/PHASES.md` with the exact human action.
