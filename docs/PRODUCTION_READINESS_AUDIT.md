# Production-readiness audit (20-point skill matrix)

Audited against `.opencode/skills/production-backend-readiness/SKILL.md` on
2026-11-06. Status values: **PASS**, **PARTIAL**, **STAGED** (deliberately
deferred to a measured scale trigger), **BLOCKED** (external credential).

| # | Check | Status | Evidence / gap |
| --- | --- | --- | --- |
| 1 | Layered architecture | PASS | `src/app` is routes only; handlers in `features/*/server`; repositories in `features/*/server/queries`; `src/lib/app-structure.test.ts` enforces it |
| 2 | REST and HTTP semantics | PASS | Shared response helpers; plural route nouns; 200/201/204/400/401/403/404/409/422/429/500 used; list endpoints return empty arrays |
| 3 | OpenAPI contract | PASS | `openapi.yaml` (3.1) documents health, auth, account export, developer, operator, and platform-billing surfaces; `src/lib/openapi.test.ts` pins the paths. Runtime request validation still uses Zod, not the spec. |
| 4 | Input validation | PASS | Zod on every handler via `parseRequest`; semantic checks in services/transactions |
| 5 | BOLA/IDOR protection | PASS | Central `src/permissions` + workspace membership; ID-swap isolation suite; cache tenant check |
| 6 | Authentication security | PASS | HttpOnly/Secure/SameSite sessions, 30-day server expiry, revocation, reset/verification tokens hashed and single-use |
| 7 | Password/crypto hygiene | PASS | bcrypt cost 10 (inherited; raise to 12 on next hash change), SHA-512 tokens, AES-256-GCM provider secrets, constant-time webhook compare |
| 8 | Global error middleware | PASS | Unified error envelope; production leaks no stack/SQL; `serverError` generic |
| 9 | Graceful shutdown | PASS | `scripts/start-server.mjs` forwards SIGTERM/SIGINT to the standalone server, drains with a 30 s bound, then exits. Background workers remain separate processes. |
| 10 | Migrations | PASS | Versioned Prisma SQL migrations; no production auto-sync; `migrate deploy` in CI |
| 11 | Indexes / N+1 | PASS | FK and query indexes in schema; analytics smoke; eager selects; `EXPLAIN ANALYZE` required for new high-volume queries per gate |
| 12 | Connection pooling | PASS | Pool size/timeouts in `src/lib/prisma.ts`; pooled vs direct URL split; PgBouncer/Neon pooler documented |
| 13 | Caching | PASS | Tenant-scoped keys, TTLs, invalidation; stampede guard STAGED until measured |
| 14 | Async queues | PARTIAL | Cron jobs and provider cleanup are idempotent; no general job queue exists. STAGED: add only when a measured workload requires it. |
| 15 | Object storage | N/A | No user file uploads at launch; replay payloads are compressed event rows. Revisit if recording exports move to object storage. |
| 16 | Webhook security | PASS | HMAC verification, raw body, timestamp tolerance, unique event IDs, replay-safe lifecycle reduction; outbound webhook outbox not needed (no outbound webhooks product) |
| 17 | 12-factor config | PASS | Env-only config, lockfile committed, `.env.example`, no secrets in git |
| 18 | Observability | PASS | JSON logs + redaction, error-tracking hook, health/live + health/ready, audit log and a platform-admin audit viewer. Metrics/tracing STAGED until a host collector is chosen. |
| 19 | Testing | PASS | 765 unit/route tests, tenant isolation, 48-assertion PostgreSQL smoke, and a recorded 10k-event/50-concurrency ingestion probe (`docs/LOAD_TEST.md`). Testcontainers not used because CI provisions a real PostgreSQL service. |
| 20 | Container/CI | PASS | Multi-stage non-root Dockerfile, health check, CI lint/typecheck/tests/audit/build. Vulnerability scan is `pnpm audit`; image scanning STAGED for the hosting pipeline. |

## Deliberate staging

RevenueLens is a micro-SaaS. The high-scale skill is applied in measured stages
(see `docs/ENGINEERING_STANDARDS.md` §4). The following are not missing by
accident:

- Redis cluster sharding, Kafka/Redpanda, ClickHouse, and multi-region ingress
  wait for sustained traffic beyond the current PostgreSQL design.
- Worker clustering waits for multi-core saturation evidence.
- RLS is deferred in favour of application checks plus the static boundary test
  until enterprise requirements justify the pooled-transaction complexity.
- OpenAPI generation, general queue workers, and metrics/tracing wait for the
  first external API consumer and the chosen host.

## Launch verdict

**Engineering-ready for a controlled launch**, with these external blockers:
Dodo test/live credentials, Resend domain, provider webhook accounts, Neon
production project and restore rehearsal, hosting/DNS, lawyer review, browser
walkthrough, and a recorded load test. All are listed in
`docs/LAUNCH_CHECKLIST.md`.
