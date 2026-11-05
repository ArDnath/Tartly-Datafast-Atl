# Payment provider capabilities

Status: **code-verified 2026-11-05**. "Verified" below means the behaviour was
read in the repository and is covered by the referenced module or test. It does
not mean a live provider account was used; that is marked separately. No
provider pricing, rate limit, or external API guarantee is claimed without a
source.

## Shared contract

Every analytics payment integration is per website (`website_id`) and belongs
to exactly one workspace through the website. It is **context B** in
`docs/ARCHITECTURE.md`: customer revenue, never platform billing.

- Credentials and webhook secrets are stored in
  `PaymentProviderConnection.credentialsRef` / `webhookSecretRef` through
  `encryptProviderSecret` (`enc:` prefix, AES via `src/lib/crypto.ts`). New
  writes are encrypted. Legacy values without the `enc:` prefix are still read
  so an existing installation can migrate; `docs/PHASE-7` records that as a
  follow-up, not a silent plaintext write.
- The connection lookup is always scoped by `websiteId` and
  `disconnectedAt: null`. Webhook event keys are unique per provider, and a
  processed event is acknowledged as a duplicate instead of written twice.
- No API response returns `credentialsRef` or `webhookSecretRef`; the
  connections handler selects an explicit safe projection.
- Every provider feeds the same attribution path
  (`features/payments/server/queries/payment.ts`), so first-touch, last-touch,
  renewals, refunds, and disputes use one reducer.

## Capability matrix

| Provider | Connection auth | Webhook verification | Payments | Subscription lifecycle | Renewals | Refunds | Disputes | Historical import | Live verified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stripe | API key (restricted keys supported) | `Stripe-Signature` via official SDK, 5-min tolerance | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_succeeded` | created, updated, deleted, paused, resumed, pending update, trial ending | invoice/subscription matching and duplicate suppression | `refund.created`, `refund.updated`, `charge.refunded` | created, updated, closed, funds withdrawn/reinstated | completed checkout sessions | **UNVERIFIED** (no Stripe account) |
| Dodo Payments | API key + environment derived from key | Standard Webhooks signature over `id.timestamp.body`, 5-min tolerance | `payment.succeeded` | payment rows carry `subscription_id`; no Dodo subscription lifecycle reducer is registered | payment metadata and subscription id retained; renewal flag inferred from subscription history | `refund.succeeded` | not handled | succeeded payments and refunds | **UNVERIFIED** (no Dodo account) |
| Lemon Squeezy | API key; store and test/live mode resolved from the key | HMAC-SHA256 signature over the raw body | `order_created`, `subscription_payment_success`, `subscription_payment_recovered` | created, updated, cancelled, resumed, expired, paused, unpaused, payment failed | initial order is canonical; initial invoice is skipped to avoid double revenue | `order_refunded`, `subscription_payment_refunded` | not handled | not implemented | **UNVERIFIED** (no Lemon Squeezy account) |
| Polar | Organization access token + environment | Standard Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature`) | `order.paid` | created, updated, active, canceled, uncanceled, past_due, revoked | `billing_reason = subscription_cycle` and subscription id | `order.refunded` | not handled | orders and subscriptions listed by the provider client | **UNVERIFIED** (no Polar account) |
| Yolfi | API key plus webhook signing secret | HMAC-SHA256 base64 in `X-Yolfi-Signature` | `payment.confirmed` | `subscription.overdue`, `subscription.cancelled`; active recurring payments create/refresh the subscription | recurring payment events inherit the stored subscription visitor | not handled | not handled | completed payment export with cursor pagination | **UNVERIFIED** (no Yolfi account) |
| Manual API | RevenueLens website API key | not applicable (authenticated API request) | `POST /api/payments/manual` | not applicable | caller may send a session context | not handled (use provider webhooks) | not handled | not applicable | **VERIFIED locally** by route tests; not a live provider |

"Not handled" means there is no reducer branch and the event would be stored as
ignored (or not subscribed), not that the provider lacks the feature. Do not
advertise a capability that this table marks as not handled.

## Isolation and idempotency evidence

| Concern | Evidence |
| --- | --- |
| Webhook writes use the URL website only | `src/features/payments/server/*/[websiteId]/webhook/handler.test.ts` |
| Duplicate event is a no-op | provider handlers return `{ duplicate: true }` after a stored `processed` event |
| Out-of-order subscription events cannot overwrite newer state | `src/features/payments/server/queries/payment-subscription-ordering.test.ts` |
| Refunds reduce attributed revenue without deleting the payment | `src/features/payments/server/queries/payment.test.ts` |
| Provider secrets never leave the server | connection handler projection; `provider-secrets.ts` |
| Attribution journeys keep first and last touch | `src/features/payments/server/queries/attribution-journeys.test.ts` |

## Known limits

- **Live webhook delivery is unverified for every provider** because this
  repository has no provider accounts. The exact human steps are in
  `docs/PLATFORM_BILLING.md` for platform Dodo and in each provider guide under
  `/docs/revenue-guides`.
- Dodo subscription lifecycle events are not reduced. Dodo renewals still
  arrive as successful payments and are attributed through payment history,
  but plan changes, pauses, and cancellations are not represented in the
  analytics `subscription` table from Dodo webhooks.
- Disputes are only reduced for Stripe. Lemon Squeezy, Polar, Yolfi, and Dodo
  do not have dispute branches in the code.
- Historical import exists only for Stripe checkout sessions, Dodo payments
  and refunds, Polar orders/subscriptions, and Yolfi completed payments.
- External API limits and pricing are not asserted here. Fetch them from the
  provider before making a customer-facing claim.
