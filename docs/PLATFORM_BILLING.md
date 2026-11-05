# Platform Billing — Dodo Payments (Phase 5)

RevenueLens has **two separate payment contexts**. They must never share code,
credentials, webhook routes, or models.

| Context | Who pays | Where |
| --- | --- | --- |
| **A. Platform billing** | Workspace owners pay RevenueLens | `src/features/billing`, `/api/billing/*` |
| **B. Analytics integrations** | The customer's own buyers pay the customer | `src/features/payments`, `/api/payments/<provider>/[websiteId]/webhook` |

The existing Dodo analytics integration is **context B**. It reads per-website
credentials from `payment_provider_connection` and stores the customer's
revenue. Platform billing uses environment credentials and the
`billing_customer` / `platform_subscription` / `billing_invoice` tables. The
two signing secrets are different and are rejected across contexts.

## Provider references

Fetched 2026-11-05:

- Checkout sessions: <https://docs.dodopayments.com/api-reference/checkout-sessions/create>
- Subscription update (cancel at next billing date): <https://docs.dodopayments.com/api-reference/subscriptions/patch-subscriptions>
- Change plan: <https://docs.dodopayments.com/api-reference/subscriptions/change-plan>
- Customer portal session: <https://docs.dodopayments.com/api-reference/customers/create-customer-portal-session>
- Webhooks and Standard Webhooks verification: <https://docs.dodopayments.com/developer-resources/webhooks>
- Subscription lifecycle and event list: <https://docs.dodopayments.com/developer-resources/subscription-integration-guide>
- Subscription statuses: `pending`, `active`, `on_hold`, `paused`, `cancelled`, `failed`, `expired`, `past_due`.

The implementation uses the installed `dodopayments` SDK (`2.42.2`) for outbound
calls. Inbound signatures are verified locally in
`src/features/billing/lib/standard-webhook.ts` so a billing webhook cannot be
accepted from the analytics integration by mistake.

## Data model

| Table | Purpose |
| --- | --- |
| `billing_customer` | One provider customer per workspace. |
| `platform_subscription` | One provider subscription per workspace, with lifecycle, period, cancellation, and provider status. |
| `billing_event` | Raw webhook bookkeeping keyed by the unique `webhook-id`. |
| `billing_invoice` | Only invoices the provider actually issued. |
| `billing_subscription_change` | Audit trail for requested plan changes. |

Migration: `prisma/migrations/20261105150000_platform_billing`.

## Flow

1. Owner chooses a plan in **Settings → Plan and usage**.
2. `POST /api/billing/checkout` creates a Dodo checkout session and returns the
   hosted URL. **Nothing is activated by the redirect.**
3. Dodo sends `subscription.active` (or another lifecycle event) to
   `POST /api/billing/webhook/dodo` with `webhook-id`, `webhook-timestamp`, and
   `webhook-signature`.
4. The handler verifies the Standard Webhooks HMAC over
   `${id}.${timestamp}.${rawBody}`, then processes the event.
5. The reducer writes `platform_subscription`, mirrors plan/status onto the
   workspace for legacy compatibility, and records the event ID.
6. Entitlements read the subscription row through
   `src/lib/entitlements.ts`. A workspace without a confirmed subscription gets
   Starter setup limits but no paid feature.

## Lifecycle mapping

| Dodo status / event | Local lifecycle | Paid access |
| --- | --- | --- |
| `active` | `ACTIVE` | yes |
| `active` with a trial | `TRIALING` | yes |
| `past_due` | `PAST_DUE` | yes (provider grace) |
| `on_hold`, `paused`, `failed` | `SUSPENDED` | no |
| `cancelled` | `CANCELLED` | only until `current_period_end` when cancellation was scheduled |
| `expired` | `EXPIRED` | no |
| `pending` | `INCOMPLETE` | no |

Cancel-at-period-end is a provider call plus a local flag. The subscription
stays `ACTIVE`/`TRIALING` until the period ends, then the provider event moves
it to a terminal state. Access is also time-bounded by `current_period_end`, so
a missing final event cannot extend access forever.

## Idempotency and ordering

- `billing_event.provider_event_id` is unique. A replayed `webhook-id` returns
  `200 {status:"duplicate"}` without applying the event twice.
- A failed processing attempt is marked `failed`; the provider retry can
  re-claim it.
- Subscription snapshots are ordered by the event timestamp. Equal timestamps
  use a fixed priority where terminal events rank above `updated`. Older
  snapshots are recorded as `ignored` and never overwrite newer state.
- An event whose tenant cannot be resolved is recorded as `unmatched` and
  acknowledged. The handler never guesses a workspace.
- An unknown product ID is recorded as `unsupported` rather than defaulting to
  Starter. A misconfigured product must be visible, not silently grant limits.

## Configuration

Required for checkout:

```
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_SECRET=
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_STARTER_PRODUCT_ID=
DODO_PRO_PRODUCT_ID=
```

Optional annual prices (two months free):

```
DODO_STARTER_ANNUAL_PRODUCT_ID=
DODO_PRO_ANNUAL_PRODUCT_ID=
```

If the API key, webhook secret, or a monthly product ID is missing, the billing
page reports that billing is not connected and checkout returns `503`. No
charge is attempted.

## API

| Route | Role | Behaviour |
| --- | --- | --- |
| `GET /api/billing?workspaceId=` | VIEWER | Plan, lifecycle, period, cancellation flag, invoices, available products. No secrets or raw payloads. |
| `POST /api/billing/checkout` | OWNER | Creates a hosted checkout; returns `{url}`. |
| `POST /api/billing/portal` | OWNER | Creates a provider customer-portal link. |
| `POST /api/billing/cancel` | OWNER | Schedules cancellation at period end. |
| `POST /api/billing/change-plan` | OWNER | Requests an immediate prorated plan change; local state waits for the webhook. |
| `POST /api/billing/webhook/dodo` | signed only | Verifies and processes Dodo platform events. |

## Manual test against Dodo test mode (not yet run)

**UNVERIFIED:** no Dodo test keys exist in this environment. The unit and
route-contract suites cover verification, idempotency, ordering, lifecycle, and
checkout creation, but a live provider run still needs the human.

Steps when keys are available:

1. Create two monthly products in Dodo test mode and put their IDs plus a test
   API key in `.env`.
2. Create a webhook endpoint pointing at
   `https://<host>/api/billing/webhook/dodo` and copy its signing secret.
3. Sign in as a workspace owner, open `/app/settings/billing`, choose Starter,
   and complete test checkout with a Dodo test card.
4. Confirm the workspace stays unchanged until the webhook arrives, then shows
   `Active`.
5. Replay the same webhook from the Dodo dashboard; confirm
   `billing_event` does not grow and the subscription is unchanged.
6. Schedule cancellation and confirm access remains until
   `current_period_end`.
7. Confirm the analytics revenue webhook
   `/api/payments/dodo/<websiteId>/webhook` rejects the platform secret and
   vice versa.

## Deliberate non-goals

- No trial by default. The two plans are paid from day one.
- No invoice is invented before the provider issues one.
- No plan activation from a success redirect or client-side state.
- No reuse of the customer's analytics payment connections for charging them.
