# Success metrics and assumptions

These are models, not historical results. Replace every assumption with a
measured value once the product has traffic. Do not present them as proof.

## North star

**Attributed revenue under management per active workspace per month.** It
captures whether the customer connected payments and whether the product is
returning a revenue signal, not just pageviews.

## Activation funnel

| Stage | Definition | Launch target (assumption) |
| --- | --- | --- |
| Signup | verified account created | — |
| Workspace | workspace exists | 95% of signups |
| Website | website exists | 80% |
| First event | one stored `website_event` | 60% |
| Payment connected | one active provider connection | 35% |
| First attributed payment | one matched payment | 25% |

The platform-admin activation page already reports these stages from durable
rows. Targets are hypotheses to test, not promises.

## Revenue metrics

- MRR = active Starter × $7.99 + active Pro × $14.99.
- ARPU = MRR / paying workspaces.
- Gross margin = (MRR − hosting, database, email, payment fees) / MRR. The
  detailed model and per-customer assumptions are in
  `docs/PRICING_ECONOMICS.md`.
- Churn = cancelled/expired workspaces in the month / paying workspaces at the
  start of the month.
- Expansion = plan changes up minus down.

## Product metrics

- p95 dashboard API latency.
- Ingestion acceptance rate and pause rate.
- Replay sessions per Pro workspace vs the 2,000 allowance.
- Retention job duration and rows deleted.
- Billing webhook failure rate and age of the oldest unprocessed event.
- Support first response time.

## Channel metrics

For each acquisition channel record: spend, visitors, signups, paid
conversions, MRR, and payback period. Use the product's own attribution, but
label first-touch and last-touch separately. A channel that only closes on the
last click is not necessarily the channel that created demand.

## 30/60/90-day checkpoints

| Window | Question | Decision |
| --- | --- | --- |
| 30 days | Is activation above 20% and are there 10 paying customers? | If no, fix onboarding before paid spend |
| 60 days | Is gross margin above the model and churn below 5%? | If no, adjust limits or price, not the promise |
| 90 days | Is one channel producing repeatable paid customers? | Double down; stop the rest |

## Assumptions to verify

- 1 KB average event and 0.5 MB average replay session (measure).
- Dodo US card fee; international cards add roughly 3 points (verify).
- Hosting and Neon costs at 100/500/1,000/5,000 customers (verify with bills).
- 25% activation to first attributed payment (measure).
- Support load of 0.2 tickets per paying workspace per month (measure).

No metric in this file may be quoted publicly as a result until it is measured
and dated.
