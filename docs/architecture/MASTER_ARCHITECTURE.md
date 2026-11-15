# Master architecture — post-harvest

- **Date:** 2026-11-15
- **Source of truth:** `/home/ariyaman/Dev/fight/efforts/revenuelens`
- **Integration branch:** `autonomous/saas-buildout`
- **Basis:** `docs/product-audit/*`, `docs/market-intelligence/*`,
  `docs/architecture/HARVEST_*.md`, and direct source inspection.
- **Rule:** one best approach per subsystem. This is not a merge of references.

## 1. What the product is

A hosted, multi-tenant, revenue-first web analytics SaaS: cookieless page and
event tracking, first/last-touch attribution, payment-provider integrations,
session replay on Pro, and two paid plans (Starter $7.99 / Pro $14.99). The
primary job is answering "which channel makes money" for a solo founder, not
general product analytics.

## 2. Runtime topology

```
Browser tracker ──POST /api/send──► collector handler
                                      ├─ website lookup (Redis cache, 24h)
                                      ├─ origin / bot / IP checks
                                      ├─ plan usage reserve
                                      ├─ visitor/session upsert (Postgres)
                                      └─ saveEvent
                                           ├─ Postgres mirror (attribution)
                                           └─ ClickHouse when configured
Recorder ───────POST /api/record──► replay handler (plan + replay meter)
Dashboard ──────/api/websites/:id/*──► runQuery → Postgres or ClickHouse
Billing ────────Dodo webhooks──────► platform subscription → entitlements
```

- **Framework:** Next.js 16.4.5 App Router, React 19, TypeScript, Biome.
- **Relational store:** PostgreSQL through Prisma 7 (`relationMode = "prisma"`).
  This is the control plane and, in this fork's default local setup, also the
  analytics store.
- **High-volume store:** ClickHouse is present in the production compose stack
  and selected when `CLICKHOUSE_URL` is set. Kafka carries events to ClickHouse
  with a direct-write fallback.
- **Cache / throttle:** Redis for collector throttles and website cache.
- **Billing provider:** Dodo Payments, test mode until credentials are verified.
- **Deployment:** single VPS, Docker Compose, Caddy edge, automated deploy.

No new infrastructure is justified at current scale.

## 3. Identity and privacy (chosen approach)

- **No tracker cookies.** A random session token lives in `sessionStorage`
  (30-minute rolling idle, memory fallback), never across tabs or sites.
- **Visitor key:** server-derived keyed hash of website, IP, user agent,
  rotating salt, and `APP_SECRET`. Raw IP is never stored. Rotation defaults to
  monthly so first-touch attribution survives days; day/week remain available.
- **Cross-domain continuity:** signed 5-minute linker on configured domains.
  Visitor and session tokens are truncated to 100 characters on both sides so
  the derived UUIDs match the stored `Visitor.token`.
- **Consent:** `data-consent="required"` blocks all sends until
  `window.talivia.setConsent(true)` or a `talivia:consent` event. GPC is honored
  by default; DNT is opt-in; `localStorage` opt-out is supported.
- **Uniqueness semantics:** unique visitors are unique per rotation window, not
  per day. The dashboard definition states this. Visitors behind one NAT with
  the same browser collapse into one visitor for the window.

This is the deliberate trade-off recorded in ADR-001: a daily hash broke
first-touch attribution for returning buyers; monthly restores it without a
persistent client identifier.

## 4. Ingestion and processing

- Public site ID only routes events; it grants no read access.
- Website existence, workspace, and entitlement are resolved server-side.
- Origin check exists (`ENFORCE_TRACKER_ORIGIN`), bot filtering uses `isbot`,
  body size is capped, and timestamps are bounded to 7 days past / 5 minutes
  future.
- Usage is reserved before a billable write; a failed write releases it.
- The collector cache (signed JWT) carries visitor/session IDs between requests.
- **Known limits (documented, not hidden):**
  - No event-level idempotency key; a retried client event can be counted twice.
  - A failed response after a committed write releases the reservation while the
    event remains (meter can under-count on a narrow failure window).
  - ClickHouse retention and deletion are not implemented; Postgres retention is.
  - The last-touch model does not yet have a separate `last_non_direct` model.
  - Collector hot path performs several Postgres round trips per event.

## 5. Storage and aggregation

- Event, event data, session data, visitor, session, revenue, and payment
  attribution tables are tenant-keyed by `website_id`.
- Reads go through `runQuery` with a Postgres and ClickHouse implementation.
- Retention is plan-driven and tenant-scoped for PostgreSQL; ClickHouse is the
  open gap.
- Metric definitions live in `src/features/analytics/lib/metric-definitions.ts`
  and are rendered on the overview KPI cards.

## 6. Billing and entitlements

- Two plans only, centralized in `src/lib/plans.ts`. Pro is 20 websites.
- Platform billing and analytics integrations are separate contexts.
- Checkout is server-created; a redirect never activates a plan. Webhooks are
  signature-verified and idempotent. Entitlements derive from backend records.
- Session replay is now togglable and enforced at both the settings write and
  the ingest endpoint. API access, exports, and some other Pro features still
  lack a central server check.

## 7. Design language

`docs/product-audit/DESIGN_LANGUAGE.md` is binding. Near-black canvas, tonal
cards, hairline borders, one blush accent, Inter, dense labels, tabular
numerals, a 440 px onboarding column, directional slide/fade motion, and quiet
empty states. New screens reuse these tokens and components; no foreign UI kit.

## 8. Thresholds for adding complexity

Do not add a queue, cache layer, or columnar migration until one of these is
measured on the deployed stack:

| Symptom           | Threshold                       | First response                                   |
| ----------------- | ------------------------------- | ------------------------------------------------ |
| Collector p95     | > 800 ms for 5 min at 100 req/s | Cache entitlements + attribution config in Redis |
| Write failures    | > 0.5% of events for 15 min     | Batch writes / inspect ClickHouse                |
| Dashboard p95     | > 2 s for a 30-day range        | Add a rollup, not a new database                 |
| ClickHouse growth | > 70% disk                      | Enable retention/TTL first                       |
| Postgres CPU      | > 75% sustained for 1 h         | Move reads to ClickHouse, then roll up           |

## 9. Release-critical gaps

1. ClickHouse retention/deletion (privacy promise).
2. Event idempotency (metering and pageview accuracy).
3. Last-non-direct attribution model (revenue accuracy).
4. Live provider credentials and browser walkthrough (external).
5. Central enforcement for all Pro features (API, exports, client reporting).
6. Billing period versus calendar-month metering.
7. Webhook payload and audit IP retention.
