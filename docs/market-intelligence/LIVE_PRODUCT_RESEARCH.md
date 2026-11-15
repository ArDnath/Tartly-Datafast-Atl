# Live Product Research — Web, Product and Revenue Analytics

**Access date for every source in this document: 2026-11-14.**
**Prepared by:** S4 (live market, traction and pricing verification).
**Status:** one-pass desk research against live public pages. No accounts were
created, no checkouts were run, and no private dashboards were accessed.

## Method and limits

- Every URL cited here was fetched on 2026-11-14. Status codes and redirects are
  recorded in `SOURCE_REGISTER.md`.
- Prices and plan limits were read from the vendor's own public pricing page.
  They are labelled **Verified** when the number was read directly from that
  page. When a page renders prices through a JavaScript counter (DataFast,
  Baremetrics, ChartMogul), the digit string can duplicate during animation; those
  rows carry **Medium/Low** confidence and a re-verify note.
- Customer, user and revenue counts are **Company-reported** unless a public
  filing or independent source is named. GitHub stars come from the GitHub REST
  API and are **Verified** as star counts — not as customers.
- **No traffic, star count, download count, funding round or "users" figure in
  this document is treated as paying customers or revenue.**
- Onboarding notes come from public marketing pages and public docs. They
  describe the public flow, not a completed signup.
- No legal or compliance conclusions are drawn here. Items that need legal
  review are flagged as such.

### Evidence labels used

| Label                | Meaning in this document                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Verified             | Read directly from a live page or API during this pass (price, plan limit, star count, HTTP status). |
| Company-reported     | A scale/traction claim published by the company about itself; not independently audited.             |
| Founder-reported     | A claim by a named founder in a public post. Not used in this pass.                                  |
| Third-party estimate | A number produced by someone other than the company. Used only where named.                          |
| Inferred             | A conclusion drawn from observed facts, not a published number.                                      |
| Undisclosed          | The company does not publish the figure.                                                             |

### Coverage note

The contract's minimum list is covered in full, plus the live products of the
local references. Five local references have **no live commercial product**:
DataGoat (pre-release, self-deploy only), Minilytics (self-host only), Pixelmoth
(self-host only), Open-Web-Analytics (self-host only) and ActivateIQ (local
prototype; its likely domain timed out). They are documented as such rather than
invented as products.

---

## 1. Plausible Analytics

- **Official site:** https://plausible.io/ — loaded (200).
- **Pricing:** https://plausible.io/#pricing — loaded (200).
- **Docs / install:** https://plausible.io/docs — loaded (200); install steps
  include "Add the tracking script" and "Verify the integration is working".
- **Changelog:** https://plausible.io/changelog — loaded (200).
- **Positioning:** "Easy to use and privacy-friendly Google Analytics
  alternative." Site is segmented by ecommerce, SaaS, agencies, creators,
  public sector, white-label and enterprise.
- **Target audience:** site owners and teams who want simple, cookieless,
  EU-hosted analytics; agencies and public sector; enterprise on custom terms.
- **Free tier / trial:** 30-day free trial, **no credit card required**. No free
  forever tier.
- **Lowest paid tier:** Starter **$9/month**, 1 site, up to 10k monthly pageviews,
  no retention limit. Growth $14 (3 sites), Business $19 (10 sites), Enterprise
  custom.
- **Revenue capability:** revenue goals exist, but attribution is event-based.
  The docs state plainly that "Payment provider webhooks can't be linked to the
  visit that led to the payment." This is not payment-provider attribution.
- **Notable integrations:** Slack/email reports, Google Search Console, Google
  Tag Manager, WordPress, Stats API, shared links and embedded dashboards.
- **Onboarding flow (public):** register → name/add site → copy the script tag →
  install → verify the integration → dashboard. A **public live demo dashboard**
  (`/plausible.io`) lets a visitor see real data before signup.

### Traction

| Metric             | Value                           | Source URL                                       | Date       | Evidence type    | Confidence |
| ------------------ | ------------------------------- | ------------------------------------------------ | ---------- | ---------------- | ---------- |
| Paying subscribers | 22,000+                         | https://plausible.io/about                       | 2026-11-14 | Company-reported | High       |
| ARR milestone      | Crossed $1M ARR in 2022         | https://plausible.io/about                       | 2026-11-14 | Company-reported | High       |
| Funding            | Self-funded, no outside funding | https://plausible.io/about                       | 2026-11-14 | Company-reported | High       |
| Team size          | 11                              | https://plausible.io/                            | 2026-11-14 | Company-reported | High       |
| GitHub stars       | 29,845                          | https://api.github.com/repos/plausible/analytics | 2026-11-14 | Verified         | High       |
| Free trial         | 30 days, no card                | https://plausible.io/#pricing                    | 2026-11-14 | Verified         | High       |

**Reading:** the strongest _self-serve, privacy-analytics_ commercial signal in
this set. "Paying subscribers" is the company's own label, so it is the closest
thing to a paid-customer count available without a filing.

---

## 2. Fathom Analytics

- **Official site:** https://usefathom.com/ — loaded (200).
- **Pricing:** https://usefathom.com/pricing — loaded (200).
- **Docs:** https://usefathom.com/docs — loaded (200).
- **Changelog:** https://usefathom.com/changelog — loaded (200).
- **About / traction:** https://usefathom.com/about — loaded (200).
- **Positioning:** "Analytics without the cookies" — privacy-first Google
  Analytics alternative; "customer-funded, bootstrapped, zero investors".
- **Target audience:** privacy-focused site owners, agencies and businesses;
  every plan includes at least 50 sites, which suits agencies.
- **Free tier / trial:** 7-day free trial, **card required**, with an email before
  the plan starts billing. No free tier.
- **Lowest paid tier:** **$15/month** for up to 100,000 monthly pageviews across
  all sites, 50 sites included; custom events count against the pageview
  allowance. Extra site packs: 50 sites for $10/month.
- **Revenue capability:** no revenue-attribution product found on the site or
  docs (homepage, features and docs searched; no "revenue" or payment-provider
  attribution page). Treated as traffic analytics only.
- **Notable integrations:** Search Console integration; email reports; the usual
  script/SPA install paths documented.
- **Onboarding flow (public):** "Start free trial" → card entry → add site →
  script install → dashboard. The card gate is the visible friction point;
  billing is disclosed up front.

### Traction

| Metric              | Value                                                          | Source URL                    | Date       | Evidence type    | Confidence |
| ------------------- | -------------------------------------------------------------- | ----------------------------- | ---------- | ---------------- | ---------- |
| Paying customers    | "Thousands"                                                    | https://usefathom.com/about   | 2026-11-14 | Company-reported | Medium     |
| Customer websites   | "Millions"                                                     | https://usefathom.com/about   | 2026-11-14 | Company-reported | Medium     |
| Pageviews processed | "Billions"                                                     | https://usefathom.com/about   | 2026-11-14 | Company-reported | Medium     |
| Profitability       | "Sustainable and profitable"                                   | https://usefathom.com/about   | 2026-11-14 | Company-reported | Medium     |
| GitHub stars        | Not applicable — proprietary, no source repo published on site | https://usefathom.com/        | 2026-11-14 | Undisclosed      | —          |
| Free trial          | 7 days, card required                                          | https://usefathom.com/pricing | 2026-11-14 | Verified         | High       |

**Reading:** "millions of customer websites" is a website count, not a customer
count; the paid-customer figure is only "thousands". Do not convert either into
revenue.

---

## 3. Umami

- **Official site:** https://umami.is/ — loaded (200).
- **Pricing:** https://umami.is/pricing — loaded (200).
- **Docs:** https://docs.umami.is/docs — loaded (200). Quickstart covers
  "Add a website" and "Install the tracking script".
- **Revenue docs:** https://docs.umami.is/docs/revenue — loaded (200).
- **Changelog:** https://github.com/umami-software/umami/releases — loaded (200).
  (`https://umami.is/changelog` returns 404.)
- **Positioning:** "The complete picture of your website" — open-source web and
  product analytics; acquisition, behaviour, conversion and retention; self-host
  or cloud.
- **Target audience:** developers and self-hosters first, plus teams that want a
  cloud option; broad web + product analytics.
- **Free tier / trial:** free tier **$0 for up to 100K events/month**; Pro trial
  14 days; paid tiers billed monthly, cancel anytime.
- **Lowest paid tier:** **$20/month** for 1M events/month, then $0.00003 per
  additional event; $200/month for 10M events. Session replay is $0.005 per
  replay. (All Verified on the pricing page.)
- **Revenue capability:** revenue is sent as **event data** from the tracker
  (`data-umami-event-revenue` / tracker function). No payment-provider key or
  webhook-to-visit attribution is documented. This is "revenue events", not
  provider-level attribution.
- **Notable integrations:** tracker script, REST API, share links, session
  replay, funnels/insights; self-host via Docker.
- **Onboarding flow (public):** sign up (free) → add website → install tracking
  script → data appears; upgrade to Pro for volume/features. The free tier acts
  as the trial.

### Traction

| Metric                 | Value             | Source URL                                        | Date       | Evidence type    | Confidence |
| ---------------------- | ----------------- | ------------------------------------------------- | ---------- | ---------------- | ---------- |
| GitHub stars           | 40,141            | https://api.github.com/repos/umami-software/umami | 2026-11-14 | Verified         | High       |
| GitHub forks           | 8,548             | https://api.github.com/repos/umami-software/umami | 2026-11-14 | Verified         | High       |
| Downloads              | 30M+              | https://umami.is/                                 | 2026-11-14 | Company-reported | Medium     |
| Stars claimed on site  | 39K+              | https://umami.is/                                 | 2026-11-14 | Company-reported | High       |
| Cloud paying customers | Not published     | https://umami.is/pricing                          | 2026-11-14 | Undisclosed      | —          |
| Free tier              | 100K events/month | https://umami.is/pricing                          | 2026-11-14 | Verified         | High       |

**Reading:** the largest _community_ footprint in the set (40k+ stars, 30M+
downloads), but downloads and stars are not cloud customers. This is the clearest
example of "strongest user base" ≠ "strongest commercial traction".

---

## 4. Simple Analytics

- **Official site:** https://www.simpleanalytics.com/ — loaded (200).
- **Pricing:** https://www.simpleanalytics.com/pricing — loaded (200); a
  machine-readable mirror exists at https://www.simpleanalytics.com/pricing.md
  (loaded, 200).
- **Docs:** https://docs.simpleanalytics.com/ — loaded (200).
- **Changelog:** https://www.simpleanalytics.com/changelog — loaded (200).
- **About:** https://www.simpleanalytics.com/about — loaded (200).
- **Positioning (current):** "See the traffic Google Analytics misses" — the
  pitch has shifted to running alongside GA4 to compare consent-affected
  traffic, with a 30-day assisted proof of concept for enterprise.
- **Target audience:** teams and agencies comparing GA4; enterprise procurement
  via POC; hobby sites on the free plan.
- **Free tier / trial:** Free plan $0 (1 user, 5 websites, last 30 days of data,
  **Simple Analytics badge required**, no events/goals/APIs). Self-serve trial
  14 days, no credit card. Enterprise POC 30 days.
- **Lowest paid tier:** Simple **$15/month** for 20k pageviews+events, $20/month
  for 100k, $30 for 250k, scaling to $160 for 10M; +$20/month per extra user;
  10 websites included; 3-year retention.
- **Revenue capability:** no revenue-attribution product found (homepage has no
  revenue mention; docs cover events, goals, campaigns). Treated as traffic
  analytics only.
- **Notable integrations:** events API, MCP server (OAuth) for AI agents,
  automated events, goals/funnels, email reports.
- **Onboarding flow (public):** sign up → script tag (`sa_event` for events) →
  dashboard; free plan requires placing the badge.

### Traction

| Metric           | Value                                     | Source URL                                 | Date       | Evidence type    | Confidence |
| ---------------- | ----------------------------------------- | ------------------------------------------ | ---------- | ---------------- | ---------- |
| Users            | 31k+                                      | https://www.simpleanalytics.com/about      | 2026-11-14 | Company-reported | Medium     |
| Team size        | 3                                         | https://www.simpleanalytics.com/about      | 2026-11-14 | Company-reported | High       |
| Funding          | Self-funded                               | https://www.simpleanalytics.com/about      | 2026-11-14 | Company-reported | High       |
| Paying customers | Not published                             | https://www.simpleanalytics.com/pricing    | 2026-11-14 | Undisclosed      | —          |
| Free plan        | 5 sites, 30-day retention, badge required | https://www.simpleanalytics.com/pricing.md | 2026-11-14 | Verified         | High       |

**Reading:** "31k+ users" includes free-plan and badge users. It cannot be read
as 31k paying customers.

---

## 5. Pirsch Analytics

- **Official site:** https://pirsch.io/ — loaded (200).
- **Pricing:** https://pirsch.io/pricing — loaded (200).
- **Docs:** https://docs.pirsch.io/ — loaded (200).
- **Changelog:** no public changelog found (`https://pirsch.io/changelog` → 404).
- **Positioning:** "The Best, Privacy-Friendly Google Analytics Alternative";
  meta description calls it open source, lightweight, cookie-free.
- **Target audience:** privacy-conscious site owners, developers, small teams.
- **Free tier / trial:** 30-day free trial, **no credit card required**. No free
  forever tier stated on the pricing page.
- **Lowest paid tier:** **$6/month** for 10,000 monthly page views; $12 tier
  shown next on the same page (annual/monthly toggle). Custom events and 10% of
  session extensions count toward the pageview limit.
- **Revenue capability:** no revenue attribution product found on site or docs.
  Treated as traffic analytics only.
- **Notable integrations:** script, server-side SDKs, email reports.
- **Onboarding flow (public):** start trial → add domain → install tracking →
  dashboard.

### Traction

| Metric              | Value                            | Source URL                | Date       | Evidence type    | Confidence |
| ------------------- | -------------------------------- | ------------------------- | ---------- | ---------------- | ---------- |
| Customers           | 500+                             | https://pirsch.io/        | 2026-11-14 | Company-reported | Medium     |
| Pageviews collected | "Hundreds of millions" per month | https://pirsch.io/        | 2026-11-14 | Company-reported | Low        |
| Free trial          | 30 days, no card                 | https://pirsch.io/pricing | 2026-11-14 | Verified         | High       |
| Lowest price        | $6/month, 10k pageviews          | https://pirsch.io/pricing | 2026-11-14 | Verified         | High       |

**Reading:** the cheapest credible entry price among the main privacy-analytics
peers, with no revenue attribution.

---

## 6. Matomo

- **Official site:** https://matomo.org/ — loaded (200).
- **Pricing:** https://matomo.org/pricing/ — loaded (200).
- **Docs:** https://matomo.org/docs/ → redirects to https://matomo.org/guides/
  (200).
- **Changelog:** https://matomo.org/changelog/ — loaded (200).
- **Cloud product:** https://matomo.org/matomo-cloud/ — loaded (200).
- **Positioning:** "Privacy-first analytics you can trust"; data ownership;
  100% on-premise or cloud.
- **Target audience:** enterprises, public sector and regulated teams that need
  self-hosted or EU-hosted analytics with full data ownership; also small teams
  via the free on-prem edition.
- **Free tier / trial:** On-premise download is free (GPL). Matomo Cloud has a
  free trial, **no credit card required**. On-prem "Free" tier is up to 4 users
  and 5M hits/month per the pricing page.
- **Lowest paid tier:** Matomo Cloud from **USD 26/month (excl. tax)** for 50k
  hits/month; 2 months free on annual billing. (Verified on pricing page.)
- **Revenue capability:** ecommerce tracking exists (orders/revenue), but no
  payment-provider-to-visit attribution product was found. Treated as
  ecommerce/traffic analytics, not channel-to-payment attribution.
- **Notable integrations:** WordPress plugin, tag manager, REST API, heatmaps,
  session recordings, custom dimensions.
- **Onboarding flow (public):** choose Cloud trial (no card) or download and
  install on PHP/MySQL yourself; add site → tracking code → dashboard. The
  self-host path has materially higher setup friction than SaaS peers.

### Traction

| Metric            | Value               | Source URL                                     | Date       | Evidence type    | Confidence |
| ----------------- | ------------------- | ---------------------------------------------- | ---------- | ---------------- | ---------- |
| Organisations     | 1 million worldwide | https://matomo.org/                            | 2026-11-14 | Company-reported | Medium     |
| GitHub stars      | 22,026              | https://api.github.com/repos/matomo-org/matomo | 2026-11-14 | Verified         | High       |
| Cloud entry price | $26/month, 50k hits | https://matomo.org/pricing/                    | 2026-11-14 | Verified         | High       |
| Free trial        | Yes, no card        | https://matomo.org/pricing/                    | 2026-11-14 | Verified         | High       |

**Reading:** "1 million organisations" almost certainly mixes free on-prem
installs with paid cloud. It is not a customer count.

---

## 7. Cloudflare Web Analytics

- **Official site:** https://www.cloudflare.com/web-analytics/ — loaded (200).
- **Docs:** https://developers.cloudflare.com/web-analytics/ — loaded (200).
- **Pricing:** free; presented on the product page and Cloudflare plans pages.
  No separate paid Web Analytics SKU found.
- **Changelog:** no product-specific changelog page found; platform changelog is
  Cloudflare-wide.
- **Positioning:** "Privacy-first, accurate, essential web analytics — for free."
- **Target audience:** existing Cloudflare users; site owners who want free,
  zero-maintenance core metrics.
- **Free tier / trial:** free, no card. Requires a Cloudflare account; the
  easiest path proxies the site behind Cloudflare, in which case "there is no
  code to add".
- **Lowest paid tier:** N/A — free. Adjacent paid Cloudflare plans are for the
  proxy/CDN, not analytics.
- **Revenue capability:** none. Core traffic metrics only (views, referrers,
  Core Web Vitals).
- **Notable integrations:** automatic when proxied through Cloudflare; JS snippet
  otherwise.
- **Onboarding flow (public):** create Cloudflare account → add site → change
  nameservers to proxy → Web Analytics appears in the dashboard with no snippet.

### Traction

| Metric              | Value                           | Source URL                                | Date       | Evidence type | Confidence |
| ------------------- | ------------------------------- | ----------------------------------------- | ---------- | ------------- | ---------- |
| Price               | $0                              | https://www.cloudflare.com/web-analytics/ | 2026-11-14 | Verified      | High       |
| Customer count      | Not published for Web Analytics | https://www.cloudflare.com/web-analytics/ | 2026-11-14 | Undisclosed   | —          |
| Billing requirement | None                            | https://www.cloudflare.com/web-analytics/ | 2026-11-14 | Verified      | High       |

**Reading:** a free feature of a large infrastructure company, not a commercial
analytics product. It sets the price floor for "basic traffic numbers" at zero.

---

## 8. PostHog

- **Official site:** https://posthog.com/ — loaded (200).
- **Pricing:** https://posthog.com/pricing — loaded (200).
- **Docs:** https://posthog.com/docs — loaded (200).
- **Changelog:** https://posthog.com/changelog — loaded (200).
- **Positioning:** "Your product's context layer" — analytics, session replay,
  flags, experiments, error tracking, logs, AI observability.
- **Target audience:** product engineers and startups through enterprise; very
  broad suite, usage-based pricing.
- **Free tier / trial:** monthly free allowance per product (1M events/month and
  per-product allowances shown on the pricing page), no credit card, usage stops
  at the free limit so there are no surprise charges. No trial needed.
- **Lowest paid tier:** usage-based; the first paid step is per-event/per-product
  above the free allowance. No single fixed entry price.
- **Revenue capability:** marketing/product analytics are first-class; payment
  provider attribution is not a headline pricing-page feature. Data-warehouse
  joins could support it, but that is **Inferred** and not verified as a
  packaged flow.
- **Notable integrations:** SDKs, data warehouse, CDP-like exports, Slack,
  session replay, experiments.
- **Onboarding flow (public):** "Get started – free" → create project → install
  snippet/SDK → events arrive; billing limit can be set to $0 to prevent charges.

### Traction

| Metric           | Value                                    | Source URL                                   | Date       | Evidence type | Confidence |
| ---------------- | ---------------------------------------- | -------------------------------------------- | ---------- | ------------- | ---------- |
| GitHub stars     | 40,781                                   | https://api.github.com/repos/PostHog/posthog | 2026-11-14 | Verified      | High       |
| Revenue          | Not published on pricing page            | https://posthog.com/pricing                  | 2026-11-14 | Undisclosed   | —          |
| Paying customers | Not published                            | https://posthog.com/pricing                  | 2026-11-14 | Undisclosed   | —          |
| Free tier        | 1M events/month + per-product allowances | https://posthog.com/pricing                  | 2026-11-14 | Verified      | High       |

**Reading:** the second 40k-star project in the set. Stars and a generous free
tier say nothing about paid conversion; PostHog does not publish either number
here.

---

## 9. Mixpanel

- **Official site:** https://mixpanel.com/ — loaded (200).
- **Pricing:** https://mixpanel.com/pricing/ — loaded (200).
- **Docs:** https://docs.mixpanel.com/ — loaded (200).
- **Changelog:** no public changelog at `/changelog/` (404).
- **Positioning:** "Product Intelligence Platform for the AI Era" — analytics,
  session replay, experiments, feature flags, AI insights.
- **Target audience:** product teams, B2B SaaS, growth teams; enterprise at the
  top end.
- **Free tier / trial:** Free forever up to 1M events/month, no card.
- **Lowest paid tier:** Growth "starts at $0" and scales with volume; the page's
  own example shows **1.5M events/month = $100/month** ($1,200/year) and
  2M = $185/month. Annual billing saves $480/year at that band.
- **Revenue capability:** product analytics events; no payment-provider-to-visit
  attribution product on the pricing page. Treated as product analytics.
- **Notable integrations:** SDKs, warehouses, session replay, experiments, group
  analytics (B2B accounts).
- **Onboarding flow (public):** free signup → create project → install SDK →
  events; Growth upgrade handled in-product with a volume slider.

### Traction

| Metric                     | Value                                        | Source URL                    | Date       | Evidence type | Confidence |
| -------------------------- | -------------------------------------------- | ----------------------------- | ---------- | ------------- | ---------- |
| Free plan                  | 1M events/month forever                      | https://mixpanel.com/pricing/ | 2026-11-14 | Verified      | High       |
| First paid example         | $100/month at 1.5M events                    | https://mixpanel.com/pricing/ | 2026-11-14 | Verified      | High       |
| Startup program            | First year free (<5 years old, ≤$8M funding) | https://mixpanel.com/pricing/ | 2026-11-14 | Verified      | High       |
| Paying customers / revenue | Not published                                | https://mixpanel.com/pricing/ | 2026-11-14 | Undisclosed   | —          |

**Reading:** the $100/month first paid step validates that product-analytics
pricing sits an order of magnitude above the web-analytics band we target.

---

## 10. Amplitude

- **Official site:** https://amplitude.com/ — loaded (200).
- **Pricing:** https://amplitude.com/pricing — loaded (200).
- **Docs:** https://amplitude.com/docs — loaded (200).
- **Changelog:** no public changelog at `/changelog` (404).
- **Positioning:** "A new era for product teams" — analytics, feedback, AI,
  self-improving products.
- **Target audience:** product/growth teams and enterprises; public company.
- **Free tier / trial:** Free plan **2M events/month forever**, no card.
  Startups under $10M funding and under 20 employees get one free year on Growth.
- **Lowest paid tier:** Plus "starts at $0" and scales with volume; no single
  fixed floor is published. Enterprise is sales-led.
- **Revenue capability:** product analytics; no payment-provider-to-visit
  attribution product on the pricing page. Treated as product analytics.
- **Notable integrations:** SDKs, warehouses, session replay, experimentation,
  AI agents.
- **Onboarding flow (public):** free signup → create project → SDK/snippet →
  events; "Start for free".

### Traction

| Metric                  | Value                             | Source URL                             | Date       | Evidence type                               | Confidence |
| ----------------------- | --------------------------------- | -------------------------------------- | ---------- | ------------------------------------------- | ---------- |
| FY26 revenue guidance   | $415.8M–$418.2M                   | https://stockanalysis.com/stocks/ampl/ | 2026-11-14 | Company-reported (guidance, via aggregator) | Medium     |
| Q4 revenue guidance     | $110.8M–$113.2M                   | https://stockanalysis.com/stocks/ampl/ | 2026-11-14 | Company-reported (guidance, via aggregator) | Medium     |
| Free plan               | 2M events/month                   | https://amplitude.com/pricing          | 2026-11-14 | Verified                                    | High       |
| Investor relations page | Blocked to this client (HTTP 403) | https://investors.amplitude.com/       | 2026-11-14 | Blocked                                     | —          |

**Reading:** Amplitude is the only public company in the set and therefore the
only **verified-scale revenue** figure here. It competes for enterprise product
analytics budgets, not the indie web-analytics budget. Primary filings should be
re-checked by a human; the IR site returned 403 to this client.

---

## 11. June

- **Official site:** https://june.so/ — loaded (200).
- **Pricing:** https://june.so/pricing → https://www.june.so/pricing (200).
- **Docs:** https://www.june.so/docs — loaded (200).
- **Changelog:** https://changelog.june.so/ — loaded (200).
- **Positioning:** "Product & Customer Analytics Software for B2B SaaS" —
  auto-generated reports on how companies use the product.
- **Target audience:** B2B SaaS, explicitly companies past product-market fit.
  The pricing page says June fits companies with **at least $1M ARR** and
  suggests cheaper tools below that.
- **Free tier / trial:** sales-led; no self-serve price is published. The page
  routes to a demo/sales conversation.
- **Lowest paid tier:** not published (quote only).
- **Revenue capability:** product/account analytics for B2B SaaS; no
  payment-provider-to-visit attribution product on the pricing page.
- **Notable integrations:** Segment/CDP-style event sources, Slack, CRM-style
  company reports.
- **Onboarding flow (public):** book a demo → sales qualification → event
  instrumentation. Not self-serve.

### Traction

| Metric      | Value                | Source URL                  | Date       | Evidence type                  | Confidence |
| ----------- | -------------------- | --------------------------- | ---------- | ------------------------------ | ---------- |
| Minimum fit | At least $1M ARR     | https://www.june.so/pricing | 2026-11-14 | Company-reported (positioning) | High       |
| Price       | Not published (demo) | https://www.june.so/pricing | 2026-11-14 | Undisclosed                    | —          |
| Customers   | Not published        | https://www.june.so/        | 2026-11-14 | Undisclosed                    | —          |

**Reading:** June has deliberately moved upmarket. It is not a competitor for a
$7.99–$14.99 buyer.

---

## 12. Heap (Contentsquare)

- **Official site:** https://www.heap.io/ — loaded (200).
- **Pricing:** https://www.heap.io/pricing — loaded (200).
- **Docs:** https://docs.heap.io/ → https://help.heap.io/hc/en-us (200).
- **Changelog:** no public changelog at `/changelog` (404).
- **Positioning:** "Better Insights. Faster." — digital insights platform by
  Contentsquare; autocapture of "unknown unknowns".
- **Target audience:** enterprise product, marketing and UX teams.
- **Free tier / trial:** Free plan up to **10k monthly sessions**; paid plans
  custom-quoted. "Get a quote" is the conversion path.
- **Lowest paid tier:** not published (custom).
- **Revenue capability:** product analytics/session replay; no
  payment-provider-to-visit attribution product on the pricing page.
- **Notable integrations:** session replay add-on, warehouse sync, engagement
  tools, custom event properties.
- **Onboarding flow (public):** free signup with snippet ("install the free
  snippet to get an estimate") → paid via sales.

### Traction

| Metric              | Value                | Source URL                  | Date       | Evidence type | Confidence |
| ------------------- | -------------------- | --------------------------- | ---------- | ------------- | ---------- |
| Free plan           | 10k monthly sessions | https://www.heap.io/pricing | 2026-11-14 | Verified      | High       |
| Price               | Custom quote         | https://www.heap.io/pricing | 2026-11-14 | Undisclosed   | —          |
| Customers / revenue | Not published        | https://www.heap.io/        | 2026-11-14 | Undisclosed   | —          |

**Reading:** enterprise sales motion, no self-serve price. Not directly
comparable to an indie SaaS plan.

---

## 13. DataFast

- **Official site:** https://datafa.st/ — loaded (200).
- **Pricing:** https://datafa.st/#pricing (same page) — loaded (200).
- **Docs / install:** https://datafa.st/docs — loaded (200); install guide is
  titled "Install DataFast in 2 minutes".
- **Payment-provider docs:** https://datafa.st/docs/connect-payment-provider —
  loaded (200).
- **Changelog:** https://datafa.st/changelog — loaded (200).
- **Positioning:** "Revenue-first analytics" — find which marketing channels
  drive revenue; "from first click to customer".
- **Target audience:** indie entrepreneurs, solo founders, small SaaS; explicitly
  anti-dashboard-bloat, founder-led brand.
- **Free tier / trial:** 14-day free trial, **$0.00 due today, no card
  required**. No free forever tier.
- **Lowest paid tier:** Starter **$9/month at the 10k monthly events** setting;
  Growth **$19/month** at the same setting (Growth adds 30 websites, 30 team
  members, longer retention, social mentions and X link attribution). Prices
  scale with the events slider. _Confidence note:_ the page animates prices with
  a JS counter, which renders duplicated digits; $9 is cross-checked against
  getopen.so's comparison table ("DataFast $9 · 10,000 events"), Growth $19 is
  from the duplicate-digit read — re-verify visually before quoting.
- **Revenue capability:** yes — provider integrations documented for Stripe,
  Lemon Squeezy, Polar, Paddle and Dodo Payments, plus a generic Payments API.
  This is the closest direct analogue to the product we are building.
- **Notable integrations:** Stripe, Lemon Squeezy, Polar, Paddle, Dodo, Payments
  API, MCP server, CLI, GitHub integration, React Native SDK.
- **Onboarding flow (public):** sign up (no card) → install script ("2 minutes")
  → connect payment provider → revenue attribution report. The payment step is
  part of the first-run path, not a hidden settings page. The home page also
  advertises "Connect DataFast to Cursor, Claude Code, or Codex with MCP".

### Traction

| Metric                 | Value                               | Source URL                                      | Date       | Evidence type                              | Confidence |
| ---------------------- | ----------------------------------- | ----------------------------------------------- | ---------- | ------------------------------------------ | ---------- |
| Users                  | 28,285                              | https://datafa.st/                              | 2026-11-14 | Company-reported ("Loved by 28,285 users") | Medium     |
| Paying customers       | Not published                       | https://datafa.st/                              | 2026-11-14 | Undisclosed                                | —          |
| Founder audience claim | "24 startups", "$2M+ earned online" | https://datafa.st/                              | 2026-11-14 | Company-reported (founder bio)             | Medium     |
| Lowest price           | $9/month at 10k events              | https://datafa.st/ + https://getopen.so/pricing | 2026-11-14 | Verified / cross-checked                   | Medium     |
| Free trial             | 14 days, no card                    | https://datafa.st/                              | 2026-11-14 | Verified                                   | High       |

**Reading:** "28,285 users" is a top-of-funnel count on the marketing page and is
not a paying-customer number. DataFast is nonetheless the strongest _positioning_
match for a revenue-first indie product.

---

## 14. Baremetrics

- **Official site:** https://baremetrics.com/ — loaded (200).
- **Pricing:** https://baremetrics.com/pricing — loaded (200).
- **Docs/help:** https://help.baremetrics.com/ — loaded (200).
- **Changelog:** no public changelog at `/changelog` (404).
- **Positioning:** "Subscription Analytics for your Business" — MRR, churn, LTV,
  failed-payment recovery for Stripe-type subscription businesses.
- **Target audience:** Stripe/subscription SaaS founders and finance/ops.
- **Free tier / trial:** free trial offered; no free forever tier stated.
- **Lowest paid tier:** **$75/month** for the $0–360K ARR band (page renders
  animated digits; re-verify). Higher bands $255/month ($360K–3.6M ARR) and
  $1,152/month ($3.6M+ ARR). Add-ons: Payment Recovery +$129/month, Cancellation
  Insights +$129/month. Annual discount up to 35%.
- **Revenue capability:** this _is_ revenue analytics — but on the subscription
  side, not web-traffic attribution. It tells you MRR/churn, not which channel
  produced the customer.
- **Notable integrations:** Stripe, payment recovery, cancellation insights,
  daily/weekly reports.
- **Onboarding flow (public):** trial → connect Stripe → metrics populate.

### Traction

| Metric                     | Value                   | Source URL                      | Date       | Evidence type                          | Confidence |
| -------------------------- | ----------------------- | ------------------------------- | ---------- | -------------------------------------- | ---------- |
| Entry price                | $75/month ($0–360K ARR) | https://baremetrics.com/pricing | 2026-11-14 | Verified (animated digits; Low-Medium) | Low        |
| Add-on price               | $129/month each         | https://baremetrics.com/pricing | 2026-11-14 | Verified                               | Medium     |
| Paying customers / revenue | Not published           | https://baremetrics.com/        | 2026-11-14 | Undisclosed                            | —          |

**Reading:** adjacent category. It proves founders pay for revenue visibility,
but its price band ($75+) is far above the web-analytics buyer we target.

---

## 15. ChartMogul

- **Official site:** https://chartmogul.com/ — loaded (200).
- **Pricing:** https://chartmogul.com/pricing/ — loaded (200).
- **API docs:** https://dev.chartmogul.com/ — loaded (200).
- **Changelog:** no public changelog at `/changelog/` (404).
- **Positioning:** "The AI-native stack for subscription intelligence" — "The
  Bloomberg of SaaS".
- **Target audience:** SaaS finance/revops and founders; free up to $10K MRR,
  enterprise above $10M ARR.
- **Free tier / trial:** **free up to $10K MRR**; paid tiers beyond that; free
  trial offered on paid plans.
- **Lowest paid tier:** **$69/month** (monthly billing) / $57/month (annual) for
  the first paid band above $10K MRR; matrix runs to $849/month and enterprise
  $19,900/year. _Confidence note:_ pricing is a multi-column matrix; the $69
  figure is the first paid column, re-verify the band mapping before quoting.
- **Revenue capability:** subscription/revenue analytics (MRR, cohorts, churn);
  no web-traffic-to-payment attribution.
- **Notable integrations:** Stripe, Chargebee, Recurly, Segment, warehouses,
  exports.
- **Onboarding flow (public):** start free → connect billing system → metrics;
  upgrade when MRR passes $10K.

### Traction

| Metric              | Value               | Source URL                      | Date       | Evidence type             | Confidence |
| ------------------- | ------------------- | ------------------------------- | ---------- | ------------------------- | ---------- |
| Free tier           | Up to $10K MRR      | https://chartmogul.com/pricing/ | 2026-11-14 | Verified                  | High       |
| Entry paid price    | $69/month (monthly) | https://chartmogul.com/pricing/ | 2026-11-14 | Verified (matrix; Medium) | Medium     |
| Customers / revenue | Not published       | https://chartmogul.com/         | 2026-11-14 | Undisclosed               | —          |

**Reading:** the free-to-$10K-MRR tier is a smart wedge for early SaaS, but the
product answers "how is my MRR?" not "which channel sold it?".

---

# Reference products (local repositories)

## 16. Talivia (this fork's upstream)

- **Live product:** https://talivia.com/ — loaded (200).
- **Docs:** https://talivia.com/docs — loaded (200); install page
  https://talivia.com/docs/installation — loaded (200); integrations
  https://talivia.com/docs/integrations — loaded (200).
- **Pricing:** no `/pricing` route (404). Pricing is embedded on the home page.
- **Changelog:** no public changelog (`/changelog` → 404).
- **Positioning:** "Find which traffic turns into paying customers" — revenue
  attribution analytics for SaaS founders.
- **Target audience:** SaaS founders; connects website sessions with payments.
- **Free tier / trial:** 14-day free trial; "Start free and claim my price";
  founding customers pay **$9.99/month for the first year**, then presumably list
  price. One account-wide subscription, "unlimited" websites. The trial does not
  reserve the founding price; the place is claimed after the first successful
  payment (their wording).
- **Lowest paid tier:** $9.99/month (founding, first year).
- **Revenue capability:** yes — Stripe, Lemon Squeezy, Polar, Dodo, Yolfi and a
  Manual Payment API (repository README); attribution by source, source detail,
  campaign, landing page and individual paid session. Session Replay is included
  in the self-hosted edition.
- **Notable integrations:** the payment providers above, Google Search Console
  (directional revenue), Bing Webmaster Tools, GitHub activity, social mentions
  (X/Reddit/TikTok) in Talivia Cloud.
- **Onboarding flow (public, from home page):** add the site → choose where
  revenue comes from → open the attribution report. The marketing page shows a
  real dashboard with a $59 Stripe payment flowing into a referrer row.
- **Repository:** https://github.com/talivia-group/talivia — MIT.

### Traction

| Metric           | Value                   | Source URL                                         | Date       | Evidence type | Confidence |
| ---------------- | ----------------------- | -------------------------------------------------- | ---------- | ------------- | ---------- |
| Paying customers | Not published           | https://talivia.com/                               | 2026-11-14 | Undisclosed   | —          |
| Founding price   | $9.99/month, first year | https://talivia.com/                               | 2026-11-14 | Verified      | High       |
| Trial            | 14 days                 | https://talivia.com/                               | 2026-11-14 | Verified      | High       |
| GitHub stars     | 2,289                   | https://api.github.com/repos/talivia-group/talivia | 2026-11-14 | Verified      | High       |

**Reading:** a founding-customer price and no published customer count are
consistent with an early-stage launch. That is an inference, not a verified
statement about revenue. Talivia is both upstream and our closest live
positioning analogue.

## 17. Open Analytics (openanalytics / getopen.so)

- **Live product:** https://getopen.so/ — loaded (200).
- **Pricing:** https://getopen.so/pricing — loaded (200).
- **Docs:** https://getopen.so/docs — loaded (200); revenue docs
  https://getopen.so/docs/revenue — loaded (200).
- **Changelog:** https://getopen.so/changelog — loaded (200).
- **Positioning:** "A simple, easy-to-use Google Analytics alternative" —
  privacy-first, cookieless, realtime visitors, funnels and revenue attribution.
- **Target audience:** developers and small teams; AGPL self-host or managed
  cloud; sponsored by Neon's open-source program.
- **Free tier / trial:** **no free plan**; 7-day free trial, **card taken** and
  charged on day 7. Yearly = 10 months' price ($90/$190/$490).
- **Lowest paid tier:** Starter **$9/month**, 1 site, 50,000 events; Growth $19
  (5 sites, 200k events); Pro $49 (10 sites, 500k events). No overage charges —
  collection pauses at the limit.
- **Revenue capability:** Stripe and Polar connected per site; attribution by
  page, channel and campaign.
- **Notable integrations:** Stripe, Polar, MCP server, REST API, self-host via
  Docker/Neon.
- **Onboarding flow (public):** pick a size → start 7-day trial (card) → install
  tracker → Settings → Integrations → connect Stripe/Polar → revenue report.
  Limits, day-7 charge date and cancellation are spelled out before signup.
- **Repository:** https://github.com/OpenLabs-so/openanalytics — AGPL-3.0.

### Traction

| Metric           | Value                 | Source URL                                             | Date       | Evidence type | Confidence |
| ---------------- | --------------------- | ------------------------------------------------------ | ---------- | ------------- | ---------- |
| Paying customers | Not published         | https://getopen.so/                                    | 2026-11-14 | Undisclosed   | —          |
| GitHub stars     | 652                   | https://api.github.com/repos/OpenLabs-so/openanalytics | 2026-11-14 | Verified      | High       |
| Lowest price     | $9/month, 50k events  | https://getopen.so/pricing                             | 2026-11-14 | Verified      | High       |
| Trial            | 7 days, card required | https://getopen.so/pricing                             | 2026-11-14 | Verified      | High       |

**Reading:** the most transparent trial mechanics in the set (day-7 charge date,
no overage, collection pauses). It also publishes a competitor price table,
which was used as a cross-check.

## 18. trckable

- **Live product:** https://trckable.com/ — loaded (200).
- **Pricing:** on the home page (no separate pricing route returned).
- **Docs:** https://docs.trckable.com/ — loaded (200); revenue docs
  https://docs.trckable.com/revenue/ — loaded (200); self-host
  https://docs.trckable.com/self-host/ — loaded (200).
- **Changelog:** no public changelog (`/changelog` → 404).
- **Positioning:** "The only analytics you need. Private, free and open source."
- **Target audience:** indie founders and small teams; free cloud plan or
  self-host.
- **Free tier / trial:** Free cloud plan (1 site, unlimited pageviews, 10 "Peek"
  questions/week, no card, no time limit); self-host free forever (AGPL).
  **No trial on paid plans — the free plan is the trial.**
- **Lowest paid tier:** Solo **$5/month** (5 sites, 200k pageviews) as a
  founder/early price, "later $16/mo · your price stays"; Founder **$29/month**
  (unlimited sites/pageviews), "later $49/mo". Yearly $60/$190/$348 (≈$12/$38/$120
  saved). Prices verified on the home page.
- **Revenue capability:** yes — Stripe, Paddle, Lemon Squeezy, Polar, Dodo, plus
  Gumroad and PayPal; one key per provider; renewals included.
- **Notable integrations:** payment providers above, live visitors, AI-assistant
  traffic, mentions (HN/Reddit/PH), alerts, "Ask your data".
- **Onboarding flow (public):** start free (no card) → install script → connect a
  payment provider under Settings → Payments → revenue appears. Upgrade only when
  more sites/features are needed.
- **Repository:** https://github.com/trckable/trckable — AGPL-3.0.

### Traction

| Metric           | Value                             | Source URL                                     | Date       | Evidence type | Confidence |
| ---------------- | --------------------------------- | ---------------------------------------------- | ---------- | ------------- | ---------- |
| Paying customers | Not published                     | https://trckable.com/                          | 2026-11-14 | Undisclosed   | —          |
| GitHub stars     | 2                                 | https://api.github.com/repos/trckable/trckable | 2026-11-14 | Verified      | High       |
| Free plan        | 1 site, unlimited pageviews       | https://trckable.com/                          | 2026-11-14 | Verified      | High       |
| Entry paid price | $5/month (early price, later $16) | https://trckable.com/                          | 2026-11-14 | Verified      | High       |

**Reading:** the most aggressive free-to-paid design in the set: no trial cliff,
no card, unlimited pageviews on free, price lock for early customers. Star count
(2) says the project is very new; that is not a demand signal either way.

## 19. DataGoat

- **Live product:** none. Pre-release; deployed into the user's own Cloudflare
  account via a Deploy button.
- **Repository:** https://github.com/sarequl/datagoat — loaded (200), MIT.
- **Positioning:** "Open-source, revenue-first web analytics on your own
  Cloudflare account" — "a drop-in DataFast alternative".
- **Revenue capability:** DataFast-compatible tracker and payment providers, but
  integrations are explicitly beta (README: tested against mocked APIs only).
- **Onboarding:** Deploy to Cloudflare → one Worker + D1 + script tag.

### Traction

| Metric           | Value                    | Source URL                                    | Date       | Evidence type | Confidence |
| ---------------- | ------------------------ | --------------------------------------------- | ---------- | ------------- | ---------- |
| GitHub stars     | 3                        | https://api.github.com/repos/sarequl/datagoat | 2026-11-14 | Verified      | High       |
| Paying customers | None — no hosted product | https://github.com/sarequl/datagoat           | 2026-11-14 | Inferred      | High       |

## 20. Minilytics

- **Live product:** none; self-hosted on Cloudflare Workers + D1.
- **Repository:** https://github.com/surendrapandar/minilytics — loaded (200), MIT.
- **Positioning:** "Revenue-first web analytics for your own websites, inspired by
  DataFast"; shows which source made you money.
- **Revenue capability:** payment attribution (Cloudflare-hosted), but
  self-hosted only.
- **Onboarding:** clone/deploy → D1 migrations → tracker.

### Traction

| Metric           | Value                    | Source URL                                             | Date       | Evidence type | Confidence |
| ---------------- | ------------------------ | ------------------------------------------------------ | ---------- | ------------- | ---------- |
| GitHub stars     | 836                      | https://api.github.com/repos/surendrapandar/minilytics | 2026-11-14 | Verified      | High       |
| Paying customers | None — no hosted product | https://github.com/surendrapandar/minilytics           | 2026-11-14 | Inferred      | High       |

## 21. Pixelmoth

- **Live product:** none; self-hosted on Cloudflare Workers + D1.
- **Repository:** https://github.com/iKislay/pixelmoth — loaded (200), MIT.
- **Positioning:** "Web analytics that follows the money" — source-to-payment
  attribution, journey timeline, Dodo Payments built in.
- **Revenue capability:** Dodo Payments built in; self-hosted only.
- **Onboarding:** deploy (~10 minutes) → install script → connect Dodo.

### Traction

| Metric           | Value                    | Source URL                                     | Date       | Evidence type | Confidence |
| ---------------- | ------------------------ | ---------------------------------------------- | ---------- | ------------- | ---------- |
| GitHub stars     | 5                        | https://api.github.com/repos/iKislay/pixelmoth | 2026-11-14 | Verified      | High       |
| Paying customers | None — no hosted product | https://github.com/iKislay/pixelmoth           | 2026-11-14 | Inferred      | High       |

## 22. Open Web Analytics (OWA)

- **Official site:** https://www.openwebanalytics.com/ — loaded (200).
- **Repository:** https://github.com/Open-Web-Analytics/Open-Web-Analytics —
  loaded (200), GPL-2.0.
- **Positioning:** open-source alternative to Google Analytics; self-hosted PHP
  server with heatmaps and DOM stream recordings.
- **Revenue capability:** e-commerce transaction tracking (not provider-level
  attribution).
- **Onboarding:** install PHP server, create database, add JS tracker. Highest
  setup friction in the set.

### Traction

| Metric           | Value                        | Source URL                                                         | Date       | Evidence type | Confidence |
| ---------------- | ---------------------------- | ------------------------------------------------------------------ | ---------- | ------------- | ---------- |
| GitHub stars     | 2,696                        | https://api.github.com/repos/Open-Web-Analytics/Open-Web-Analytics | 2026-11-14 | Verified      | High       |
| Paying customers | None — no commercial product | https://www.openwebanalytics.com/                                  | 2026-11-14 | Inferred      | High       |

## 23. analytics.js / Segment

- **Live product:** https://segment.com/ → Twilio Segment CDP, loaded (200);
  pricing redirects to https://www.twilio.com/en-us/pricing/customer-data.
- **Repository:** https://github.com/segmentio/analytics.js — loaded (200), MIT,
  last push 2022-02-24 (archived-era code).
- **Positioning:** customer data platform — collect, unify and enrich customer
  data; the analytics.js library is the legacy browser SDK.
- **Revenue capability:** CDP plumbing, not analytics attribution; downstream
  tools own reporting.
- **Onboarding:** sales-led for Twilio Segment; SDK install for developers.

### Traction

| Metric                            | Value         | Source URL                                          | Date       | Evidence type | Confidence |
| --------------------------------- | ------------- | --------------------------------------------------- | ---------- | ------------- | ---------- |
| GitHub stars (analytics.js)       | 4,741         | https://api.github.com/repos/segmentio/analytics.js | 2026-11-14 | Verified      | High       |
| Last repository push              | 2022-02-24    | https://api.github.com/repos/segmentio/analytics.js | 2026-11-14 | Verified      | High       |
| Paying customers (Twilio Segment) | Not published | https://www.twilio.com/en-us/pricing/customer-data  | 2026-11-14 | Undisclosed   | —          |

**Reading:** a different category (CDP), useful only as a pattern source for the
tracker API, not as a commercial comparable.

## 24. ActivateIQ (local reference)

- **Live product:** none found. `https://activateiq.com/` and
  `https://www.activateiq.com/` both timed out on 2026-11-14.
- **Local reference:** a Vite/React prototype (activation-focused churn/retention
  for small SaaS), not a deployed product.
- **Note:** the name collides with an existing commission-management vendor. Flag
  for legal/trademark review before any public use; this document draws no legal
  conclusion.
- **Revenue capability:** N/A.

### Traction

| Metric           | Value                 | Source URL              | Date       | Evidence type         | Confidence |
| ---------------- | --------------------- | ----------------------- | ---------- | --------------------- | ---------- |
| Live product     | None found            | https://activateiq.com/ | 2026-11-14 | Unreachable (timeout) | —          |
| Paying customers | None (prototype only) | Local repository        | 2026-11-14 | Inferred              | High       |

---

# Cross-product analysis

## A. Strongest verified commercial traction vs strongest user base

These are deliberately separated.

| Question                                                                         | Answer                                                                                           | Evidence                                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Largest verified revenue                                                         | **Amplitude** — FY26 guidance $415.8M–$418.2M                                                    | Company guidance via stockanalysis.com (Medium); IR site 403 |
| Strongest verified _paid-customer_ signal in the self-serve privacy/revenue band | **Plausible** — 22,000+ paying subscribers, $1M ARR crossed in 2022, profitable                  | Company-reported, High                                       |
| Strongest _user-base_ signal                                                     | **Umami** — 40,141 GitHub stars, 8,548 forks, 30M+ downloads                                     | Stars Verified; downloads Company-reported                   |
| Second user-base signal                                                          | **PostHog** — 40,781 GitHub stars                                                                | Verified                                                     |
| Most transparent commercial signal among indies                                  | **Plausible** (subscriber count + ARR milestone) and **Fathom** ("thousands" paying, profitable) | Company-reported                                             |
| Most top-of-funnel marketing numbers                                             | **DataFast** 28,285 users; **Simple Analytics** 31k+ users; **Matomo** 1M organisations          | Company-reported; none are paying customers                  |

**Conclusion:** do not use stars, downloads or "users" as proof of a paying
market. The only indie product in this set that publishes a precise
paid-subscriber number is Plausible; Fathom publishes only "thousands". The only
hard revenue figure is Amplitude's public guidance, and it belongs to a
different buyer.

## B. Best onboarding and free-to-paid mechanics

Ranked by observed friction and conversion design (public pages/docs only):

1. **trckable — free plan instead of a trial.** No card, no time limit, 1 site,
   unlimited pageviews. Paid plans unlock sites/features and lock the early
   price ("your price stays"). This removes the day-7 cliff entirely and is the
   strongest indie-friendly mechanic seen.
2. **Plausible — 30-day no-card trial + public live demo.** A visitor can open a
   real dashboard (`plausible.io/plausible.io`) before registering, then start a
   month-long trial without a card. Docs are structured as "add script → verify
   integration", which reduces the most common failure point (no data appearing).
3. **DataFast — revenue in the first run.** 14-day no-card trial, "$0.00 due
   today", "Install in 2 minutes", then the docs push straight into "connect
   payment provider". The first-run path ends at the value proposition
   (revenue per channel), not at a traffic chart. MCP/CLI adds an AI-agent
   on-ramp.
4. **Umami — free tier as the trial.** 100k events/month free forever, then $20
   for 1M events. Price is metered and predictable; upgrade is triggered by
   volume, not by a countdown.
5. **Talivia — founding-price claim.** 14-day trial; the founding $9.99/year-one
   price is claimed only after the first successful payment (their wording),
   which creates a real reason to convert before the trial ends.
6. **getopen.so — radical trial transparency.** 7 days with a card, but the
   day-7 charge date, the exact amount, the no-overage rule and "collection
   pauses at the limit" are stated before signup. Higher friction, better
   qualified trials.
7. **Simple Analytics / Pirsch / Matomo — long no-card trials** (14/30 days and a
   Cloud trial respectively). Conventional, low-friction, but no distinctive
   conversion hook.
8. **Fathom — 7-day trial with card.** The shortest trial plus a card gate is the
   highest-friction flow among the self-serve peers.

Concrete flow pattern shared by all script-based tools:

```
sign up → add site/domain → copy script → install → verify data → (for revenue
tools) connect payment provider → revenue-by-channel report → upgrade prompt
```

The differentiator is **where the flow ends**. Traffic tools end at pageviews;
revenue tools (DataFast, trckable, Talivia, getopen) end at "this channel made
you money", which is a stronger upgrade trigger.

## C. Underserved segments and where a small competitor can win

1. **Sub-$10 revenue attribution.** Only DataFast ($9), getopen ($9), Talivia
   ($9.99) and trckable ($5 early price) sit below $10 with payment-provider
   attribution. Plausible, Fathom, Simple Analytics and Pirsch have no
   provider-level attribution; Umami requires manual revenue events. This is the
   clearest wedge.
2. **Agencies that need many sites cheaply.** Fathom gives 50 sites at $15 but
   without attribution; Plausible gives 3 sites at $14; DataFast 30 sites at $19;
   getopen 5 sites at $19. A $14.99 plan with 20 sites _and_ attribution would be
   the only sub-$15 combination of breadth + attribution in this set.
3. **Founders who will not connect a card for a trial.** Plausible, Umami,
   DataFast, Pirsch and Simple Analytics run no-card trials and trckable runs a
   no-card free plan; Matomo Cloud also trials without a card;
   Fathom and getopen require a card. A no-card trial (or free plan) is table
   stakes for the indie segment, not a differentiator.
4. **Non-technical founders.** Every self-serve tool still asks for a script tag.
   Cloudflare is the only zero-code path and has no revenue data. Guided install
   (framework snippets, WordPress/Shopify plugins, install verification) is a
   real onboarding gap.
5. **Session replay at an indie price.** Umami charges $0.005/replay and Talivia
   includes replay in the self-hosted edition; no replay feature was found on
   Plausible's or DataFast's public pages. Replay + revenue attribution is a
   defensible combination for the fork we are building.
6. **Self-host → managed graduation.** Umami, Plausible, trckable, getopen and
   Talivia all publish open-source editions. The hosted price band ($9–$20) is
   where that audience converts. Reusing the same tracker keeps migration
   friction low.

## D. Price band and what the two-plan model should be tested against

Full normalized table: `COMPETITOR_PRICING.md`. Summary of the _entry_ band:

| Band                           | Products                                                                                                                                                      | Observed price |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Free                           | Cloudflare, Umami (100k events), PostHog, Mixpanel (1M events), Amplitude (2M events), trckable free, Simple Analytics free (badge)                           | $0             |
| Cheapest paid                  | Pirsch $6 (10k), trckable $5 early (200k), Plausible $9 (10k), DataFast $9 (10k), getopen $9 (50k), Talivia $9.99, Fathom $15 (100k), Simple Analytics $15–20 | $5–$20         |
| Growth                         | Umami $20 (1M), DataFast $19, getopen $19, Plausible $14 (3 sites), Fathom $15 (50 sites)                                                                     | $14–$20        |
| Product analytics              | Mixpanel $100 at 1.5M events; Amplitude usage-based; Heap/June quote                                                                                          | $100+          |
| Revenue/subscription analytics | ChartMogul $69; Baremetrics $75 (+$129 add-ons)                                                                                                               | $69–$204       |

What our fixed $7.99 / $14.99 model should be tested against (prices are the
owner's; this section only supplies anchors):

- **$7.99 Starter (1 site)** undercuts Plausible $9, DataFast $9, Fathom $15 and
  Simple Analytics $15–20, and sits just above Pirsch $6 and the trckable $5
  early price. It is only defensible if revenue attribution is included, because
  Pirsch at $6 has no attribution.
- **$14.99 Pro (up to 20 sites)** matches Plausible Growth $14 (3 sites),
  undercuts DataFast Growth $19 (30 sites) and getopen Growth $19 (5 sites), and
  beats Fathom $15 (50 sites) on capability rather than site count. It is the
  only sub-$15 plan in this set that could pair 20 sites with attribution.
- **Missing variable: the traffic allowance.** Every paid competitor meters
  events, pageviews or sessions. Our plan config must publish an explicit
  monthly allowance and an over-limit behaviour (pause vs overage). Without it,
  the price comparison is not like-for-like, and a 20-site Pro plan could be
  arbitraged by a high-traffic agency. Validate margin in
  `docs/PRICING_ECONOMICS.md` (owned elsewhere).
- **Annual:** the market norm is two months free (Plausible, Fathom, Matomo,
  DataFast) or 10× the monthly price (Simple Analytics, getopen: $90/$190/$490).
  Both equal roughly a 17% discount. Any annual option should match that, subject
  to the margin proof above.

## E. What this means for our positioning

(Full version in `MARKET_OPPORTUNITY.md`.)

1. The promise "connect your site, connect your payments, see which channels
   make money" is already the live positioning of DataFast, Talivia, trckable and
   getopen. It is validated, not novel. Differentiation must come from price,
   onboarding speed, site count and replay.
2. The sub-$15 revenue-attribution band is thin and mostly early-stage products
   (DataFast, Talivia founding price, trckable early price, getopen $9). The
   incumbents with real paid scale (Plausible, Fathom) do **not** do
   provider-level attribution.
3. "Strongest user base" (Umami, PostHog) is open-source community scale, not
   paid conversion. It proves distribution via open source works, not that a
   paid tier will convert.
4. The two-plan model is priced correctly against the market _if_ it includes a
   defensible traffic allowance and payment attribution at the Starter tier. The
   risk is not price; it is being mistaken for a cheaper clone of DataFast.
5. Do not market on star counts or "users". The only credible proof points we can
   eventually publish are paid subscribers and attributed revenue, and neither
   exists yet for this product (Undisclosed).
