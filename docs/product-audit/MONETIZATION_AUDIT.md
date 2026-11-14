# Monetization audit

- **Audited revision:** `d45ad0c`. Read-only; no checkout, webhook, or provider call was executed.
- All live-revenue behaviour is **UNTESTED** here.
- **Concurrency:** the repository is being changed by other agents. Enforcement claims were verified at `d45ad0c`; re-run the cited checks before pricing decisions.

## 1. Plans — source of truth

`src/lib/plans.ts` is the only plan config. Two plans, no free tier, no trial
(`src/lib/plans.ts:4-10,16`).

|                              | Starter                           | Pro                                                                                   | Evidence                                               |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Monthly                      | **$7.99** (`799`)                 | **$14.99** (`1499`)                                                                   | `plans.ts:146,164`                                     |
| Annual                       | **$79.90** (`7990`)               | **$149.90** (`14990`)                                                                 | `plans.ts:147,165` — 10× monthly, i.e. two months free |
| Websites                     | 1                                 | **20**                                                                                | `plans.ts:149,167`                                     |
| Members                      | 1                                 | 10                                                                                    | `plans.ts:150,168`                                     |
| Billable events / month      | 100,000                           | 1,000,000                                                                             | `plans.ts:151,169`                                     |
| Analytics retention          | 90 days                           | 365 days                                                                              | `plans.ts:152,170`                                     |
| Replay sessions / month      | 0 (not included)                  | 2,000                                                                                 | `plans.ts:153,171`                                     |
| Replay retention             | 0                                 | 30 days                                                                               | `plans.ts:154,172`                                     |
| Payment provider connections | 1                                 | unlimited (`null`)                                                                    | `plans.ts:155,173`                                     |
| Features                     | revenue attribution, funnels, CSV | all, incl. advanced attribution, journeys, replay, client reporting, API, full backup | `plans.ts:156,174-185`                                 |

Traffic tiers raise events and price together (`plans.ts:79-128`). The owner-fixed price point is
tier index 3 (`plans.ts:128`): $7.99 / 100k and $14.99 / 1M. Higher tiers are legitimate products,
not upsells over a hidden cap.

Onboarding allowance while unpaid: 1 website, 1 member, no ingestion
(`plans.ts:130-137`, `src/lib/entitlements.ts:100-120`).

### 1.1 Documented plan mismatches

| Document                                                                | Claim                       | Code                                                                                      |
| ----------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `docs/PRICING_ECONOMICS.md:9,34,52,71` and `docs/LAUNCH_CHECKLIST.md:9` | Pro "up to **50** websites" | **20** (`plans.ts:167`)                                                                   |
| `docs/TENANCY.md:66`                                                    | Pro member allowance **5**  | **10** (`plans.ts:168`)                                                                   |
| `AGENTS.md:36`                                                          | Pro "up to **20**"          | matches code                                                                              |
| `AGENTS.md:55-57`                                                       | "no ClickHouse deployment"  | production compose runs ClickHouse/Kafka (`deploy/production/docker-compose.yml:111-180`) |

The 50-site docs are stale after commit `20c3a64` ("align Pro website limit with the owner spec").
They will misprice the product on the public comparison table if reused.

## 2. Entitlement derivation

`getWorkspaceEntitlements(workspaceId)` (`src/lib/entitlements.ts:35-87`):

1. Loads the workspace unless deleted/suspended.
2. Reads `platform_subscription` if present; otherwise falls back to
   `workspace.subscriptionStatus`.
3. `active` is true only for `ACTIVE`, `TRIALING`, `PAST_DUE`, or a `CANCELLED` subscription whose
   `cancelAtPeriodEnd` period has not ended (`src/lib/billing-lifecycle.ts:112-139`).
4. Resolves the purchased traffic tier so the event allowance matches the charged price
   (`src/lib/plans.ts:197-213`).
5. `setup = !active`; setup limits are 1 website / 1 member.

The paywall read model is `/api/billing/access` → `getWorkspaceBillingAccess()`
(`src/features/billing/server/access/service.ts:12-90`). It is display-only; the UI never activates
a plan (`src/features/app-shell/AppBillingGate.tsx:20-90`).

## 3. Metering

### 3.1 Events

- Only event types 1–4 are billable (pageview, custom, link, pixel); performance and identify are
  free (`src/lib/usage.ts:113-117`).
- Reservation happens **before** any session/visitor/event write and is a single atomic
  `INSERT … ON CONFLICT … WHERE count < hard_limit RETURNING` (`usage.ts:133-181`).
- A failed write releases the reservation (`send/handler.ts:620-630`, `usage.ts:188-200`).
- Period = **UTC calendar month**, not the subscription anniversary (`usage.ts:68-73`).
- Grace = **1,000 events** after the allowance; then billable ingestion returns
  `{ ok:false, reason:'usage_limit_reached' }` (`usage.ts:31-34`, `send/handler.ts:273-296`).
- At 80% and 100% the owner receives one email per period (`src/features/system/cron/jobs/usage-notices.ts:40-140`).

### 3.2 Replay

- One meter per session per period, unique `(usage_period_id, session_id)`
  (`usage.ts:210-330`, `schema.prisma:199-211`).
- Requires an active plan **and** the `session_replay` feature (`record/handler.ts:114-122`).
- 2,000 sessions + 100 grace on Pro; Starter hard-stops at 0.

### 3.3 What is not metered

- Link/pixel events: `send` reserves usage only when `websiteId && workspaceId` is present
  (`send/handler.ts:263`). A legacy website with `workspace_id = NULL`, or a link/pixel event
  (no website id), writes events and sessions with **no entitlement check and no usage counter**.
  The link/pixel create endpoints are disabled, but pre-existing rows and `/q/[slug]` / `/p/[slug]`
  remain live (`src/features/legacy/server/collect/link/handler.ts`, `pixel/handler.ts`).
- Imported historical data: `WebsiteImport` / `WebsiteHistoricalMetric` are not counted toward the
  event allowance (no `reserveEventUsage` call in `src/features/websites/server/imports/**`).

## 4. Enforcement matrix

| Limit / feature                     | Server-side enforced? | Where                                                                                                 | Notes                                                                                            |
| ----------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Monthly events                      | **Yes**               | `send/handler.ts:273-296`, `usage.ts:133-181`                                                         | Atomic; pauses at limit + 1,000.                                                                 |
| Replay sessions/month               | **Yes**               | `record/handler.ts:114-137`, `usage.ts:214-330`                                                       | Requires the Pro switch plus an active plan.                                                     |
| Website limit                       | **Yes**               | `websites/handler.ts:89-104`; `onboarding.ts:176-184`                                                 | Setup allowance 1; Pro 20.                                                                       |
| Member limit                        | **Yes**               | `workspace-invitations.ts:99-107`; `usage.ts:382-470`                                                 | Counts members + pending invites.                                                                |
| Analytics retention                 | **Yes**               | `analytics-retention.ts:211-260`                                                                      | Per-plan 90/365 days.                                                                            |
| Replay retention                    | **Yes**               | `analytics-retention.ts:246-250`                                                                      | Purges all replay rows when plan has 0 days.                                                     |
| `session_replay` feature            | **Yes**               | `record/handler.ts:119`; `websites/[websiteId]/handler.ts:120-129`                                    | Starter cannot enable or record.                                                                 |
| `paymentConnectionLimit`            | **No**                | Only `plans.ts:155,173` and marketing `PricingPage.tsx:38-40`                                         | Starter can connect unlimited providers.                                                         |
| `api_access`                        | **No**                | No `planHasFeature('api_access')` caller                                                              | Starter can create API keys, CLI/MCP, manual payment writes (`[websiteId]/api-keys/handler.ts`). |
| `full_backup`                       | **No**                | `src/features/websites/server/[websiteId]/backup/handler.ts:21-23` checks role/export permission only | Starter can download the full backup.                                                            |
| `client_reporting` (shares)         | **No**                | `src/features/websites/server/[websiteId]/shares/handler.ts:29-31` checks integration role only       | Starter can create public share dashboards.                                                      |
| `journeys` / `advanced_attribution` | **No**                | No feature check in `reports/journey/handler.ts` or `getAttribution.ts`                               | Starter can run every report.                                                                    |
| `priority_support`                  | N/A                   | Not a software feature                                                                                | —                                                                                                |
| `csv_export`                        | **No**                | Included in both plans                                                                                | No differentiation needed.                                                                       |

`entitlementsHaveFeature()` has exactly one production caller: the website update handler gates the
replay switch (`src/features/websites/server/[websiteId]/handler.ts:120-129`). `planHasFeature` is
also called directly by the replay ingestion path (`record/handler.ts:119`). No other Pro feature
is enforced.

## 5. Checkout and webhook flow

### 5.1 Checkout

`POST /api/billing/checkout` (`src/features/billing/server/checkout/handler.ts`):

1. OWNER on the workspace (`:39-46`).
2. Rate limit 20 / 10 min per workspace (`:48-61`).
3. `getBillingConfig()` must return a config; otherwise 503 (`:64-71`).
4. `findBillingProduct(plan, interval, tier)` must resolve an **exact** product; otherwise 400
   (`:73-83`, `provider.ts:197-230`).
5. Refuses if an active subscription already exists (`:85-108`).
6. Requires an account email, reuses the provider customer if known, and returns the Dodo checkout
   URL (`:110-144`). Metadata carries `workspaceId`, `planId`, `interval`, `tierIndex`
   (`providers/dodo.ts:48-63`).
7. `successUrl`/`cancelUrl` return to `/app?checkout=success|cancelled`
   (`:142-143`). Nothing is activated locally.

Config requirements (`provider.ts:145-187`): `DODO_PAYMENTS_API_KEY`,
`DODO_PAYMENTS_WEBHOOK_SECRET`, and a monthly product for **each** plan. Annual products are
optional. Per-tier products are read from `DODO_PRODUCT_IDS_JSON` keyed
`starter|pro:monthly|annual:<tierIndex>` (`provider.ts:79-138`).

### 5.2 Webhook

`POST /api/billing/webhook/dodo` (`src/features/billing/server/webhook/dodo/handler.ts`):

1. 256 KB body cap, JSON parse.
2. Standard Webhooks signature verification with the platform secret (`:40-61`,
   `src/features/billing/lib/standard-webhook.ts`).
3. `processDodoWebhook()`:
   - Idempotent claim on `billing_event.provider_event_id`; stale `processing` rows are reclaimed
     after 60 s (`service.ts:173-222`).
   - Tenant resolution prefers `providerSubscriptionId`, then `providerCustomerId`, then metadata
     (`service.ts:123-171`).
   - Out-of-order events are rejected by `(eventAt, priority)` ordering
     (`billing-lifecycle.ts:141-175`, `service.ts:343-351`).
   - One transaction upserts `platform_subscription`, `billing_customer`, and the workspace mirror
     (`service.ts:376-402`).
   - Invoices are stored only from provider invoice objects; no invoice is invented
     (`schema.prisma:131-132`, `service.ts:424-520`).
   - `payment.failed` sends an owner email (`service.ts:487-525,595-597`).

### 5.3 Portal / cancel / change plan

All OWNER-only (`src/features/billing/server/{portal,cancel,change-plan}/handler.ts`). Cancellation
sets `cancelAtPeriodEnd` locally after the provider accepts it; access remains until
`current_period_end` (`cancel/handler.ts:66-80`, `billing-lifecycle.ts:126-133`). A plan change is
requested at the provider and the local plan changes only on the next webhook
(`change-plan/handler.ts:100-135`).

## 6. Revenue-impact gaps (ranked)

1. **Most Pro-only entitlements are unenforced**, so a $7.99 Starter customer receives API access,
   full backups, public client dashboards, journeys, and unlimited payment connections. Session
   replay is now the one Pro feature with a server gate; the others rely on UI copy.
2. **Portfolio MRR by channel is computed but not rendered.** Per-website revenue by
   channel/campaign/referrer *is* shown in the overview breakdown cards
   (`DashboardBreakdownPanel.tsx:18-95`, `dashboardBreakdown.ts:263-311`), but the portfolio
   `mrrByChannel` payload has no UI consumer (`portfolioMrr.ts:16`, `website-overview.ts:108,245`).
   The dedicated `getRevenueAttributionReport` is also unused by the UI; only the CSV export and
   an HTTP route call it. This is a missing view, not a missing engine.
3. **Metering leaks.** Legacy websites with `workspace_id = NULL`, link/pixel collection, and
   imported historical data bypass the event counter. A failed `event_data` write after the
   `website_event` insert also releases the reservation while the event remains
   (`saveEvent.ts:125-190` throws after the insert; `send/handler.ts:620-630` releases).
4. **Billing period ≠ subscription period.** Metering uses the UTC calendar month
   (`usage.ts:68-73`). A customer who subscribes on the 28th receives a full monthly allowance for
   two days, then a fresh allowance on the 1st. A mid-month downgrade applies the smaller allowance
   against usage already accumulated under the larger plan. No proration logic exists in the
   metering layer (the code comment at `usage.ts:23-25` still says billing periods "become
   provider-driven when platform billing lands"; it has landed).
5. **Payment-connection limit and plan feature claims are marketing-only.** `paymentConnectionLimit`
   has no consumer outside `plans.ts` and the pricing table.
6. **Annual/tier operations are manual.** Every annual product and every non-default tier must be
   created in Dodo and mapped by env; otherwise the UI offers a plan that checkout rejects with
   400 (`checkout/handler.ts:73-83`). There is no startup validation that all displayed tiers are
   purchasable; `availableProducts` only tells the UI what exists
   (`access/service.ts:71-76`).
7. **No overage revenue path.** Ingestion pauses at the hard limit. That is honest and avoids bill
   shock, but it also means a customer who outgrows the tier must self-serve an upgrade; there is no
   automatic tier recommendation beyond the usage banner.

## 7. What is good

- One plan config; no hardcoded limits in components (`BillingPaywall.tsx` and `PricingSection.tsx`
  read `Plan` fields).
- Provider state, not redirects, is authoritative for access.
- Webhook signature, idempotency, ordering, and tenant resolution are carefully implemented.
- Metering is atomic and fails closed.
- Setup allowance is explicitly not a free plan.
- No fake invoices or fabricated statuses.

## 8. UNVERIFIED

- Whether Dodo products exist for both plans, all tiers, and annual; whether the webhook secret is
  configured: **UNVERIFIED** (no credential or provider call).
- Whether a real checkout → webhook → entitlement transition works end to end: **UNVERIFIED**.
- Whether Stripe/Dodo/etc. analytics integrations can provision webhook endpoints with real
  credentials: **UNVERIFIED**.
- Actual gross margin: see `docs/PRICING_ECONOMICS.md`; its cost inputs are engineering assumptions
  and were not independently verified in this audit.
