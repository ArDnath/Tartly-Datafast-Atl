# Competitor Pricing — Normalized View

**Access date:** 2026-11-14. All prices are USD list prices on the vendor's own
public pricing page unless stated otherwise. Taxes excluded. See
`LIVE_PRODUCT_RESEARCH.md` for per-product context and `SOURCE_REGISTER.md` for
every URL and HTTP status.

**Confidence flags:** `H` = read directly from the pricing page. `M` = read from
a page that animates or matrix-renders prices; cross-checked where possible.
`L` = digit string was ambiguous on the live page; re-verify before quoting.

> **Meter warning.** These products do not meter the same thing. Plausible,
> Fathom, Pirsch and Simple Analytics meter pageviews (Simple also counts
> events); Umami, DataFast and getopen meter events (a pageview is one event);
> Mixpanel and Amplitude meter events; Heap meters sessions. A $9/10k-events plan
> and a $9/10k-pageviews plan are only comparable when the site fires no custom
> events. Do not collapse them into one "$ per 100k" number.

---

## 1. Self-serve web analytics (our direct band)

| Product                         | Entry paid                        | Meter / allowance                      | Sites included      | Plan above                                           | Free tier / trial                                     | Card at trial | Annual offer                    | Source                                     |
| ------------------------------- | --------------------------------- | -------------------------------------- | ------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ------------- | ------------------------------- | ------------------------------------------ |
| **Pirsch**                      | $6/mo (H)                         | 10k pageviews + events/mo              | not stated          | $12 tier shown                                       | 30-day trial                                          | No            | toggle shown                    | https://pirsch.io/pricing                  |
| **trckable**                    | $5/mo early (H)                   | 200k pageviews/mo                      | 5                   | Founder $29/mo (unlimited, later $49)                | Free plan, no time limit                              | No            | $60/yr Solo; $348/yr Founder    | https://trckable.com/                      |
| **Plausible**                   | $9/mo (H)                         | 10k pageviews/mo                       | 1                   | Growth $14 (3 sites)                                 | 30-day trial, no card                                 | No            | 2 months free                   | https://plausible.io/#pricing              |
| **DataFast**                    | $9/mo at 10k events (M)           | 10k events/mo                          | 1                   | Growth $19 (30 sites)                                | 14-day trial                                          | No            | 2 months free                   | https://datafa.st/                         |
| **getopen.so (Open Analytics)** | $9/mo (H)                         | 50k events/mo                          | 1                   | Growth $19 (5 sites, 200k); Pro $49 (10 sites, 500k) | No free plan; 7-day trial                             | **Yes**       | 10 months' price: $90/$190/$490 | https://getopen.so/pricing                 |
| **Talivia**                     | $9.99/mo founding, first year (H) | unlimited sites, meter not published   | unlimited           | list price not published                             | 14-day trial                                          | No            | not published                   | https://talivia.com/                       |
| **Fathom**                      | $15/mo (H)                        | 100k pageviews + custom events/mo      | 50                  | $25 (200k), up to $470 (25M)                         | 7-day trial                                           | **Yes**       | 2 months free                   | https://usefathom.com/pricing              |
| **Simple Analytics**            | $15/mo (H)                        | 20k pageviews + events/mo              | 10                  | $20 (100k), $30 (250k) … $160 (10M)                  | Free plan (5 sites, 30 days, badge); 14-day trial     | No            | 10 months' price                | https://www.simpleanalytics.com/pricing.md |
| **Umami**                       | $20/mo (H)                        | 1M events/mo, then $0.00003/event      | not stated          | $200/mo (10M events)                                 | Free 100k events/mo; 14-day Pro trial                 | No            | monthly billing stated          | https://umami.is/pricing                   |
| **Matomo Cloud**                | $26/mo (H)                        | 50k hits/mo                            | not stated          | scales to 10M hits, then contact                     | Cloud trial, no card; free on-prem (4 users, 5M hits) | No            | 2 months free                   | https://matomo.org/pricing/                |
| **Cloudflare Web Analytics**    | $0 (H)                            | core metrics, no event meter published | unlimited (account) | —                                                    | free forever                                          | No            | —                               | https://www.cloudflare.com/web-analytics/  |

### Cost at published meter points

Use only as anchor points; meters differ.

| Product          | ~10k/mo                | ~100k/mo                            | ~1M/mo                                   |
| ---------------- | ---------------------- | ----------------------------------- | ---------------------------------------- |
| Pirsch           | $6                     | not read                            | not read                                 |
| Plausible        | $9                     | slider price not captured           | slider price not captured                |
| DataFast         | $9 (events)            | slider price not captured           | slider price not captured                |
| getopen.so       | $9 covers 50k (events) | $15? (100k tier shown in page text) | $49 covers 500k; next size not published |
| Fathom           | $15 covers 100k        | $15                                 | $60 (1M)                                 |
| Simple Analytics | $15 covers 20k         | $20                                 | $60                                      |
| Umami            | free (100k)            | free                                | $20                                      |
| Matomo Cloud     | $26 covers 50k         | price not read                      | price not read                           |

Notes on ambiguous rows:

- **getopen.so** showed `$9 · 50,000 events`, `$15 · 100,000 events` and
  `$9 · 10,000 events` in different contexts (hosted sizes vs comparison table vs
  legacy tiers). The pricing page's own size cards and FAQ use **$9 / $19 / $49
  for 50k / 200k / 500k events**; treat the $15 line as an older/alternate tier
  and do not quote it without re-checking.
- **Talivia** publishes one account-wide price with unlimited websites; there is
  no pageview meter on the public page, and no `/pricing` route (404). The home
  page is the source.
- **Plausible** and **DataFast** scale price with a pageview/event slider; only
  the default 10k position was captured. Do not assume linear pricing.

---

## 2. Product analytics (different buyer, much higher price point)

| Product       | Free tier                                      | Lowest paid                                                   | Meter              | Self-serve?                            | Source                        |
| ------------- | ---------------------------------------------- | ------------------------------------------------------------- | ------------------ | -------------------------------------- | ----------------------------- |
| **PostHog**   | 1M events/mo + per-product allowances, no card | usage-based; no fixed floor                                   | events per product | Yes                                    | https://posthog.com/pricing   |
| **Mixpanel**  | 1M events/mo forever                           | Growth "starts at $0"; **$100/mo at 1.5M events**, $185 at 2M | events             | Yes                                    | https://mixpanel.com/pricing/ |
| **Amplitude** | 2M events/mo forever                           | Plus "starts at $0"; usage-based                              | events             | Yes                                    | https://amplitude.com/pricing |
| **June**      | none published                                 | quote only                                                    | events/accounts    | No (demo)                              | https://www.june.so/pricing   |
| **Heap**      | 10k sessions/mo                                | quote only                                                    | sessions           | Partial (free snippet, sales for paid) | https://www.heap.io/pricing   |

**Observation:** the product-analytics floor is an order of magnitude above the
web-analytics band. Mixpanel's own example ($100/mo at 1.5M events) is 5–10× the
entry price of Plausible/DataFast/Umami. A $7.99–$14.99 plan does not compete
here and should not be marketed against Mixpanel/Amplitude feature-for-feature.

---

## 3. Revenue and subscription analytics (adjacent category)

| Product                 | Entry price                     | Meter                     | Free tier / trial             | What it answers                          | Source                          |
| ----------------------- | ------------------------------- | ------------------------- | ----------------------------- | ---------------------------------------- | ------------------------------- |
| **ChartMogul**          | $69/mo monthly ($57 annual) (M) | MRR bands; free ≤$10K MRR | free ≤$10K MRR; trial on paid | "What is my MRR/churn/cohort?"           | https://chartmogul.com/pricing/ |
| **Baremetrics**         | $75/mo for $0–360K ARR (L)      | ARR bands                 | free trial                    | "What is my subscription revenue doing?" | https://baremetrics.com/pricing |
| **Baremetrics add-ons** | +$129/mo each                   | per add-on                | —                             | payment recovery, cancellation insights  | https://baremetrics.com/pricing |

**Observation:** these prove founders pay for revenue visibility, but neither
answers "which traffic source produced this customer?". They are partners or
upsell comparisons, not direct competitors — and their $69–$204/month price band
is far above the indie buyer.

---

## 4. Reference products (local repositories)

| Product                         | Live?            | Entry price                    | Meter                                | Free / trial                       | Revenue attribution                                              | Source                                             |
| ------------------------------- | ---------------- | ------------------------------ | ------------------------------------ | ---------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| **Talivia**                     | Yes              | $9.99/mo founding (first year) | unlimited sites, meter not published | 14-day trial, no card stated       | Yes: Stripe, Lemon Squeezy, Polar, Dodo, Yolfi, Manual API       | https://talivia.com/                               |
| **Open Analytics (getopen.so)** | Yes              | $9/mo                          | 50k events                           | no free plan; 7-day trial, card    | Yes: Stripe, Polar                                               | https://getopen.so/pricing                         |
| **Umami**                       | Yes (cloud)      | $20/mo                         | 1M events                            | free 100k events; 14-day Pro trial | Revenue events, not provider keys                                | https://umami.is/pricing                           |
| **trckable**                    | Yes              | $5/mo early (later $16)        | 200k pageviews                       | free plan, no card, 1 site         | Yes: Stripe, Paddle, Lemon Squeezy, Polar, Dodo, Gumroad, PayPal | https://trckable.com/                              |
| **DataGoat**                    | No (self-deploy) | $0                             | own Cloudflare account               | n/a                                | DataFast-compatible (beta)                                       | https://github.com/sarequl/datagoat                |
| **Minilytics**                  | No (self-host)   | $0                             | own Cloudflare account               | n/a                                | Yes (self-hosted)                                                | https://github.com/surendrapandar/minilytics       |
| **Pixelmoth**                   | No (self-host)   | $0                             | own Cloudflare account               | n/a                                | Dodo Payments built in                                           | https://github.com/iKislay/pixelmoth               |
| **Open Web Analytics**          | No (self-host)   | $0                             | own server                           | n/a                                | E-commerce transactions only                                     | https://www.openwebanalytics.com/                  |
| **analytics.js / Segment**      | Yes (Twilio CDP) | sales-led                      | n/a                                  | n/a                                | None (CDP plumbing)                                              | https://www.twilio.com/en-us/pricing/customer-data |
| **ActivateIQ**                  | No               | n/a                            | n/a                                  | n/a                                | None                                                             | https://activateiq.com/ (timeout)                  |

---

## 5. Capability matrix (relevant to our differentiation)

| Product          | Provider-key revenue attribution                  | Session replay          | AI-assistant traffic                                 | Self-host edition                         | API / MCP        | Public launch price under $15 |
| ---------------- | ------------------------------------------------- | ----------------------- | ---------------------------------------------------- | ----------------------------------------- | ---------------- | ----------------------------- |
| Talivia          | **Yes** (5 providers + manual API)                | **Yes**                 | Social/search visibility; AI referrers not confirmed | Yes (MIT)                                 | API              | Yes ($9.99)                   |
| DataFast         | **Yes** (5 providers + Payments API)              | No                      | Not confirmed on page                                | No                                        | API, CLI, MCP    | Yes ($9)                      |
| trckable         | **Yes** (7 providers)                             | No                      | Yes (AI-assistant traffic)                           | Yes (AGPL)                                | API              | Yes ($5 early)                |
| getopen.so       | **Yes** (Stripe, Polar)                           | No                      | No                                                   | Yes (AGPL)                                | API, MCP         | Yes ($9)                      |
| Umami            | No (revenue events only)                          | **Yes** ($0.005/replay) | No                                                   | Yes (MIT)                                 | API              | No ($20)                      |
| Plausible        | No (docs: webhooks cannot be linked to the visit) | No                      | Yes (AI referrers)                                   | Yes (AGPL)                                | Stats API        | Yes ($9)                      |
| Fathom           | No                                                | No                      | No                                                   | No (proprietary)                          | API              | No ($15)                      |
| Simple Analytics | No                                                | No                      | No                                                   | No                                        | API, MCP         | No ($15)                      |
| Pirsch           | No                                                | No                      | No                                                   | Yes (open source per site)                | API              | Yes ($6)                      |
| Matomo           | No (ecommerce tracking only)                      | **Yes** (DOM streams)   | No                                                   | Yes (GPL)                                 | API              | No ($26 cloud; free on-prem)  |
| Cloudflare       | No                                                | No                      | No                                                   | No                                        | No analytics API | Yes (free)                    |
| PostHog          | Not packaged (warehouse joins only, inferred)     | **Yes**                 | No                                                   | Repo is open source (self-host supported) | API, MCP         | Yes (free tier)               |
| Mixpanel         | No                                                | **Yes**                 | No                                                   | No                                        | API              | Free tier                     |
| Amplitude        | No                                                | **Yes**                 | No                                                   | No                                        | API              | Free tier                     |
| June             | No                                                | No                      | No                                                   | No                                        | API              | No                            |
| Heap             | No                                                | **Yes**                 | No                                                   | No                                        | API              | Free tier (10k sessions)      |
| ChartMogul       | Revenue side only                                 | No                      | No                                                   | No                                        | API              | Free ≤$10K MRR                |
| Baremetrics      | Revenue side only                                 | No                      | No                                                   | No                                        | API              | No                            |

**Reading:** provider-key attribution is the feature that separates the
"revenue-first" group (Talivia, DataFast, trckable, getopen) from the
"privacy analytics" group (Plausible, Fathom, Simple Analytics, Pirsch, Umami).
Session replay is available in Talivia and Umami (and enterprise tools); no
replay feature was found on DataFast's or Plausible's public pages.

> **How to read "No" in this matrix:** it means _no such feature was found on the
> product's public pricing/feature/docs pages during this pass_, not proof that
> it does not exist. Vendors add features without changing the pricing page. The
> replay and AI-traffic columns are the most likely to age; re-check before
> publishing any comparison.

---

## 6. Trial, card and free-tier mechanics

| Mechanic                              | Products                                                                                                                                                                                                | Evidence          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| No-card trial                         | Plausible (30d), Pirsch (30d), Simple Analytics (14d), Umami (14d Pro), DataFast (14d), Talivia (14d), Matomo Cloud, DataFast                                                                           | Pricing pages     |
| Card-required trial                   | Fathom (7d), getopen.so (7d)                                                                                                                                                                            | Pricing pages     |
| Free forever plan as trial substitute | trckable (1 site, unlimited pageviews), Umami (100k events), PostHog (1M events), Mixpanel (1M events), Amplitude (2M events), Simple Analytics (5 sites, 30-day retention, badge), Heap (10k sessions) | Pricing pages     |
| No free plan, no trial                | getopen.so (trial only)                                                                                                                                                                                 | Pricing page      |
| Price lock for early customers        | trckable ("your price stays"), Talivia founding $9.99 first year                                                                                                                                        | Home pages        |
| No overage charges                    | getopen.so (collection pauses), PostHog (stops at free limits)                                                                                                                                          | Pricing pages/FAQ |
| 2 months free annual                  | Plausible, Fathom, Matomo, DataFast                                                                                                                                                                     | Pricing pages     |
| 10× monthly annual                    | Simple Analytics, getopen.so                                                                                                                                                                            | Pricing pages     |
| Startup program                       | Mixpanel (1 year free, <$8M raised), Amplitude (1 year free, <$10M raised, <20 staff)                                                                                                                   | Pricing pages     |

**Observation:** no-card entry (trial or free plan) is the norm: 7 of the 11
self-serve web analytics products offer one (Plausible, Pirsch, Simple
Analytics, Umami, DataFast, Talivia, Matomo; trckable and Cloudflare use a free
plan instead of a trial). Card-gated trials exist but are a minority and are
compensated with unusual transparency (getopen's day-7 date and paused
collection).

---

## 7. Price positioning summary

Price anchors in ascending order (entry/tier as observed on 2026-11-14):

| Anchor  | Price  | Product / tier                                                                                                  | Has provider attribution? |
| ------- | ------ | --------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Free    | $0     | Cloudflare; Umami 100k events; PostHog; Mixpanel 1M; Amplitude 2M; trckable free; Simple Analytics free (badge) | trckable only             |
| Floor   | $5     | trckable Solo (early price, 200k pageviews, 5 sites)                                                            | Yes                       |
|         | $6     | Pirsch (10k pageviews)                                                                                          | No                        |
|         | $9     | Plausible Starter (10k, 1 site)                                                                                 | No                        |
|         | $9     | DataFast Starter (10k events, 1 site)                                                                           | Yes                       |
|         | $9     | getopen Starter (50k events, 1 site)                                                                            | Yes                       |
|         | $9.99  | Talivia founding (first year, unlimited sites)                                                                  | Yes                       |
| Mid     | $14    | Plausible Growth (3 sites)                                                                                      | No                        |
|         | $14.99 | **Tartly Pro (up to 20 sites, price is the owner's)**                                                           | Yes (presumed plan scope) |
|         | $15    | Fathom (100k pageviews, 50 sites)                                                                               | No                        |
|         | $15    | Simple Analytics (20k pageviews, 10 sites)                                                                      | No                        |
|         | $19    | DataFast Growth (30 sites)                                                                                      | Yes                       |
|         | $19    | getopen Growth (5 sites, 200k events)                                                                           | Yes                       |
|         | $20    | Umami Pro (1M events)                                                                                           | No (revenue events only)  |
|         | $26    | Matomo Cloud (50k hits)                                                                                         | No                        |
|         | $29    | trckable Founder (unlimited; later $49)                                                                         | Yes                       |
|         | $49    | getopen Pro (10 sites, 500k events)                                                                             | Yes                       |
| Revenue | $69    | ChartMogul first paid band                                                                                      | MRR only                  |
|         | $75    | Baremetrics $0–360K ARR band (Low confidence)                                                                   | Revenue only              |
| Product | $100   | Mixpanel at 1.5M events                                                                                         | No                        |

- **Indie entry band:** $5–$10 (Pirsch, trckable, Plausible, DataFast, getopen,
  Talivia).
- **Mainstream privacy band:** $15–$20 (Fathom, Simple Analytics, Umami).
- **Prosumer/agency band:** $20–$49 (Umami 10M, getopen Pro, trckable Founder,
  Matomo mid).
- **Product analytics:** $100+ (Mixpanel at 1.5M events; Amplitude/Heap quote).
- **Revenue/subscription analytics:** $69–$204 (ChartMogul, Baremetrics).

The fixed Tartly model ($7.99 Starter / $14.99 Pro) sits at the **bottom of the
indie band**. At $14.99 it **would** be the cheapest plan in this set that
combines **20 sites** with payment attribution at that price point — and, if
replay is included in Pro, the only one with all three (trckable's $5 early price
is cheaper but covers 5 sites and has no replay) — provided the event allowance
is sane and margin is proven in `docs/PRICING_ECONOMICS.md`.

### Test checklist before locking prices

- [ ] Publish a monthly event/pageview allowance per plan; every competitor does.
- [ ] Define over-limit behaviour (pause vs overage). Pause is the current market
  trend (getopen, PostHog).
- [ ] Confirm 20 sites at $14.99 is not arbitraged by high-traffic agencies.
- [ ] Decide trial length: 14 days matches DataFast/Talivia/Umami/Simple; 30 days
  matches Plausible/Pirsch.
- [ ] Decide card-at-trial: no card is the indie norm; card is the minority.
- [ ] If annual is offered, 10× monthly (two months free) matches the market.
- [ ] Re-verify DataFast Growth ($19) and Baremetrics/ChartMogul digits on the
  live pages before quoting them externally (JS-animated counters).
