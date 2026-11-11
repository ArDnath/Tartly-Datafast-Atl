# Platform Billing — Dodo Payments (Phase 5)

Tartly has **two separate payment contexts**. They must never share code,
credentials, webhook routes, or models.

| Context                       | Who pays                                   | Where                                                                   |
| ----------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| **A. Platform billing**       | Workspace owners pay Tartly                | `src/features/billing`, `/api/billing/*`                                |
| **B. Analytics integrations** | The customer's own buyers pay the customer | `src/features/payments`, `/api/payments/<provider>/[websiteId]/webhook` |

The existing Dodo analytics integration is **context B**. It reads per-website
credentials from `payment_provider_connection` and stores the customer's
revenue. Platform billing uses environment credentials and the
`billing_customer` / `platform_subscription` / `billing_invoice` tables. The
two signing secrets are different and are rejected across contexts.

## Provider references

Fetched 2026-11-05; checkout fields re-verified against the installed
`dodopayments` SDK on 2026-11-12:

- Checkout sessions: <https://docs.dodopayments.com/api-reference/checkout-sessions/create>
- Subscription update (cancel at next billing date): <https://docs.dodopayments.com/api-reference/subscriptions/patch-subscriptions>
- Change plan: <https://docs.dodopayments.com/api-reference/subscriptions/change-plan>
- Customer portal session: <https://docs.dodopayments.com/api-reference/customers/create-customer-portal-session>
- Webhooks and Standard Webhooks verification: <https://docs.dodopayments.com/developer-resources/webhooks>
- Subscription lifecycle and event list: <https://docs.dodopayments.com/developer-resources/subscription-integration-guide>
- Subscription statuses: `pending`, `active`, `on_hold`, `paused`, `cancelled`, `failed`, `expired`, `past_due`.

The implementation uses the installed `dodopayments` SDK for outbound calls.
Inbound signatures are verified locally in
`src/features/billing/lib/standard-webhook.ts` so a billing webhook cannot be
accepted from the analytics integration by mistake.

## Data model

| Table                         | Purpose                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `billing_customer`            | One provider customer per workspace.                                                                |
| `platform_subscription`       | One provider subscription per workspace, with lifecycle, period, cancellation, and provider status. |
| `billing_event`               | Raw webhook bookkeeping keyed by the unique `webhook-id`.                                           |
| `billing_invoice`             | Only invoices the provider actually issued.                                                         |
| `billing_subscription_change` | Audit trail for requested plan and traffic-tier changes.                                            |

Migrations: `20261105150000_platform_billing` and
`20261112120000_platform_billing_traffic_tier` (the purchased traffic tier).

## Trial, paywall, and checkout handoff

The 7-day free trial is **Tartly's own trial**, not a Dodo trial:

1. A new workspace gets 7 days, 2,000 events, and one website. No card is
   required.
2. While that trial is live, the app shell shows a daily countdown banner and
   `/app` stays open. A landing-page pricing card sends a signed-in trial user
   straight to `/app`; an owner who wants to subscribe early uses **Plan and
   usage** in settings.
3. When the trial ends, `/app` renders the paywall: two glass plan cards in the
   current light/dark theme, a monthly/yearly switch, and the same traffic-tier
   slider as `/pricing`. The route guard is a UX guard; ingestion and plan
   limits are also enforced server-side by entitlements.
4. A pricing card or paywall card goes to `/checkout?plan=…&interval=…&tier=…`.
   Signed-out visitors continue through Google. A new account finishes the
   website onboarding first and then returns to the checkout intent.
5. The owner completes payment on the hosted Dodo page. Dodo returns the
   browser to `/app?checkout=success`; the app polls the read model and opens
   only after the verified webhook writes paid access.
6. **Plan and usage** in the account menu shows the subscription, invoices,
   plan/tier changes, cancellation, and the Dodo customer portal.

`/api/billing/checkout` creates a hosted session and returns its URL.
**Nothing is activated by the redirect.** The provider webhook is the only
writer of paid state.

## Checkout behaviour

- Dodo is asked for a paid subscription immediately. There is **no second
  provider-side trial**: the local 7-day trial is the only free period. Without
  this rule, a customer could receive 14 free days by subscribing on day one or
  after the local trial ends.
- The checkout carries `workspaceId`, `planId`, `interval`, and `tierIndex` in
  metadata. The webhook resolves the tenant from provider IDs first and uses
  metadata only when no stored provider binding exists.
- Every traffic tier has its own provider product. A non-default tier without
  an exact product is refused (`billing-price-unavailable`) instead of
  silently charging the default product. This keeps the displayed price and
  the charged price identical.
- `feature_flags.redirect_immediately` returns the customer to the app after
  payment. The `trial_period_days` field is intentionally absent.

## Lifecycle mapping

| Dodo status / event            | Local lifecycle | Paid access                                                     |
| ------------------------------ | --------------- | --------------------------------------------------------------- |
| `active`                       | `ACTIVE`        | yes                                                             |
| `active` with a provider trial | `TRIALING`      | yes (legacy/edge case; new checkouts do not request one)        |
| `past_due`                     | `PAST_DUE`      | yes (provider grace)                                            |
| `on_hold`, `paused`, `failed`  | `SUSPENDED`     | no                                                              |
| `cancelled`                    | `CANCELLED`     | only until `current_period_end` when cancellation was scheduled |
| `expired`                      | `EXPIRED`       | no                                                              |
| `pending`                      | `INCOMPLETE`    | no                                                              |

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

Optional annual default-tier prices (two months free):

```
DODO_STARTER_ANNUAL_PRODUCT_ID=
DODO_PRO_ANNUAL_PRODUCT_ID=
```

Optional exact traffic-tier products. Key format is
`<plan>:<interval>:<tierIndex>`:

```
DODO_PRODUCT_IDS_JSON={"starter:monthly:3":"pdt_...","pro:monthly:3":"pdt_..."}
```

If the API key, webhook secret, or either plan's monthly product is missing,
the billing page reports that billing is not connected and checkout returns
`503`. No charge is attempted.

## Setting up Dodo from zero

**UNVERIFIED in this environment:** no Dodo credentials or product IDs exist in
this checkout. The code and setup tooling are complete; the owner must run the
steps below with a real Dodo account.

1. Create a Dodo business in **test mode**, then create an API key.
2. Register the webhook endpoint `https://<host>/api/billing/webhook/dodo`.
   Subscribe it to `subscription.*`, `payment.succeeded`, and `payment.failed`.
   Copy the signing secret into `DODO_PAYMENTS_WEBHOOK_SECRET`.
3. Put the API key, webhook secret, and `DODO_PAYMENTS_ENVIRONMENT=test_mode`
   in the runtime environment.
4. Run:

   ```bash
   pnpm billing:setup-dodo            # dry run: prints all 32 products
   pnpm billing:setup-dodo --apply    # creates missing products, reuses matches
   ```

   The script uses `src/lib/plans.ts`, so every slider position has a product
   at the exact displayed amount. It prints `DODO_PRODUCT_IDS_JSON` and the
   four default-tier environment values.
5. Paste the printed values into the runtime environment and restart the app.
   Do **not** commit them.
6. Sign in as a workspace owner whose 7-day trial has ended. Open `/app`; the
   paywall should show. Choose a plan, complete test checkout with a Dodo test
   card, and confirm the return to `/app?checkout=success` shows the
   confirmation screen until the webhook lands.
7. Replay the same webhook from the Dodo dashboard. Confirm `billing_event`
   does not grow and the subscription is unchanged.
8. Schedule cancellation from **Plan and usage** and confirm access remains
   until `current_period_end`.
9. Change plan and traffic tier from **Plan and usage**; confirm the local
   state updates only after the provider webhook.
10. Confirm the analytics revenue webhook
    `/api/payments/dodo/<websiteId>/webhook` rejects the platform secret and
    vice versa.
11. When live mode is approved, repeat with `DODO_PAYMENTS_ENVIRONMENT=live_mode`
    and `pnpm billing:setup-dodo --apply --yes-live`.

## API

| Route                                  | Role        | Behaviour                                                                                             |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `GET /api/billing?workspaceId=`        | VIEWER      | Plan, lifecycle, period, cancellation flag, invoices, available products. No secrets or raw payloads. |
| `GET /api/billing/access?workspaceId=` | VIEWER      | Compact paid/trial/paywall state for the app shell.                                                   |
| `POST /api/billing/checkout`           | OWNER       | Creates a hosted checkout for a plan, interval, and traffic tier; returns `{url}`.                    |
| `POST /api/billing/portal`             | OWNER       | Creates a provider customer-portal link.                                                              |
| `POST /api/billing/cancel`             | OWNER       | Schedules cancellation at period end.                                                                 |
| `POST /api/billing/change-plan`        | OWNER       | Requests an immediate prorated plan or tier change; local state waits for the webhook.                |
| `POST /api/billing/webhook/dodo`       | signed only | Verifies and processes Dodo platform events.                                                          |

## Deliberate non-goals

- No invoice is invented before the provider issues one.
- No plan activation from a success redirect or client-side state.
- No reuse of the customer's analytics payment connections for charging them.
- No provider-side free trial. The local 7-day trial and its countdown are the
  only free period.
- No third paid plan and no hardcoded plan limit in the paywall or checkout UI.
