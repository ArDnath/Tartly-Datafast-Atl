# Source Register — Live Product, Pricing and Traction Research

**Access date:** 2026-11-14 (single pass).
**Client:** plain HTTPS fetch from a Linux host, Chrome user-agent, no
authentication, no cookies, no accounts. Firecrawl was used only to render
DataFast's client-side pricing animation.

**Status key**

| Status      | Meaning                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Loaded      | HTTP 200 with readable content.                                                                                |
| Redirected  | 3xx to the final URL shown.                                                                                    |
| Not found   | 404. Recorded so a later pass does not cite it.                                                                |
| Blocked     | 403 or bot challenge. Content not usable.                                                                      |
| Unreachable | DNS failure, TLS failure or timeout.                                                                           |
| JS-only     | 200, but the page requires JavaScript to show the numbers; a rendered fetch was used or the number is flagged. |

No auth-gated or paywalled page was accessed. No private dashboards, no
invoices, no checkout flows. `investors.amplitude.com` returned 403 and is
recorded as blocked.

---

## 1. Plausible

| URL                                                  | Status | Used for                                                       |
| ---------------------------------------------------- | ------ | -------------------------------------------------------------- |
| https://plausible.io/                                | Loaded | Positioning, team size, trial CTA                              |
| https://plausible.io/#pricing                        | Loaded | Plans, prices, trial terms                                     |
| https://plausible.io/about                           | Loaded | 22,000+ paying subscribers, $1M ARR, self-funded               |
| https://plausible.io/docs                            | Loaded | Install/verify onboarding steps                                |
| https://plausible.io/docs/plausible-script           | Loaded | Tracking script docs                                           |
| https://plausible.io/docs/ecommerce-revenue-tracking | Loaded | Revenue is event-based; webhooks cannot be linked to the visit |
| https://plausible.io/changelog                       | Loaded | Changelog exists                                               |
| https://api.github.com/repos/plausible/analytics     | Loaded | 29,845 stars (2026-11-14)                                      |

## 2. Fathom

| URL                               | Status          | Used for                                               |
| --------------------------------- | --------------- | ------------------------------------------------------ |
| https://usefathom.com/            | Loaded          | Positioning                                            |
| https://usefathom.com/pricing     | Loaded          | $15/100k, 50 sites, 7-day card-required trial          |
| https://usefathom.com/about       | Loaded          | "Thousands" paying, "millions" of websites, profitable |
| https://usefathom.com/docs        | Loaded          | Install docs                                           |
| https://usefathom.com/docs/script | Not found (404) | Not cited                                              |
| https://usefathom.com/blog        | Loaded          | Company activity (Gauges acquisition, AWS cost post)   |
| https://usefathom.com/changelog   | Loaded          | Changelog exists                                       |

## 3. Umami

| URL                                               | Status                                           | Used for                                               |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| https://umami.is/                                 | Loaded                                           | Positioning, 30M+ downloads, 39K+ stars                |
| https://umami.is/pricing                          | Loaded                                           | $0/100k, $20/1M, $200/10M, $0.005/replay, 14-day trial |
| https://umami.is/changelog                        | Not found (404)                                  | Not cited; GitHub releases used instead                |
| https://umami.is/docs                             | Redirected → https://docs.umami.is/docs (Loaded) | Quickstart, add website, install script                |
| https://docs.umami.is/docs/revenue                | Loaded                                           | Revenue is sent as event data, not provider keys       |
| https://docs.umami.is/docs/quickstart             | Not found (404)                                  | Not cited                                              |
| https://github.com/umami-software/umami/releases  | Loaded                                           | Changelog equivalent                                   |
| https://api.github.com/repos/umami-software/umami | Loaded                                           | 40,141 stars, 8,548 forks (2026-11-14)                 |

## 4. Simple Analytics

| URL                                        | Status                                                      | Used for                                           |
| ------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------- |
| https://www.simpleanalytics.com/           | Loaded                                                      | Positioning ("traffic Google Analytics misses")    |
| https://www.simpleanalytics.com/pricing    | Loaded                                                      | Plans, prices, free plan, trial                    |
| https://www.simpleanalytics.com/pricing.md | Loaded                                                      | Machine-readable plan table used for exact numbers |
| https://www.simpleanalytics.com/about      | Loaded                                                      | 31k+ users, 3-person team, self-funded             |
| https://www.simpleanalytics.com/open       | Redirected → https://www.simpleanalytics.com/about (Loaded) | No public open-startup revenue page                |
| https://www.simpleanalytics.com/changelog  | Loaded                                                      | Changelog exists                                   |
| https://www.simpleanalytics.com/llms.txt   | Loaded                                                      | Site map; confirms free plan + 14-day trial        |
| https://docs.simpleanalytics.com/          | Loaded                                                      | Docs root                                          |

## 5. Pirsch

| URL                         | Status          | Used for                                    |
| --------------------------- | --------------- | ------------------------------------------- |
| https://pirsch.io/          | Loaded          | Positioning, 500+ customers, pageview claim |
| https://pirsch.io/pricing   | Loaded          | $6/10k, 30-day no-card trial                |
| https://pirsch.io/changelog | Not found (404) | No public changelog found                   |
| https://docs.pirsch.io/     | Loaded          | Docs root                                   |

## 6. Matomo

| URL                                            | Status                                           | Used for                                               |
| ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| https://matomo.org/                            | Loaded                                           | Positioning, "1 million organisations"                 |
| https://matomo.org/pricing/                    | Loaded                                           | Cloud from $26/50k hits, free trial, free on-prem tier |
| https://matomo.org/matomo-cloud/               | Loaded                                           | Cloud product page                                     |
| https://matomo.org/docs/                       | Redirected → https://matomo.org/guides/ (Loaded) | Docs                                                   |
| https://matomo.org/changelog/                  | Loaded                                           | Changelog exists                                       |
| https://api.github.com/repos/matomo-org/matomo | Loaded                                           | 22,026 stars (2026-11-14)                              |

## 7. Cloudflare Web Analytics

| URL                                                                     | Status          | Used for                                              |
| ----------------------------------------------------------------------- | --------------- | ----------------------------------------------------- |
| https://www.cloudflare.com/web-analytics/                               | Loaded          | Free product, proxy/account requirement, no-code path |
| https://developers.cloudflare.com/web-analytics/                        | Loaded          | Technical docs                                        |
| https://www.cloudflare.com/plans/developer-platform/                    | Loaded          | Plans context (no separate analytics SKU)             |
| https://www.cloudflare.com/application-services/products/web-analytics/ | Not found (404) | Not cited                                             |

## 8. PostHog

| URL                                          | Status | Used for                                |
| -------------------------------------------- | ------ | --------------------------------------- |
| https://posthog.com/                         | Loaded | Positioning                             |
| https://posthog.com/pricing                  | Loaded | Free tier, no-card terms, usage pricing |
| https://posthog.com/docs                     | Loaded | Docs root                               |
| https://posthog.com/changelog                | Loaded | Changelog exists                        |
| https://posthog.com/about                    | Loaded | Company philosophy                      |
| https://posthog.com/blog                     | Loaded | Blog index                              |
| https://api.github.com/repos/PostHog/posthog | Loaded | 40,781 stars (2026-11-14)               |

## 9. Mixpanel

| URL                             | Status                                                                | Used for                                         |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| https://mixpanel.com/           | Loaded                                                                | Positioning                                      |
| https://mixpanel.com/pricing/   | Loaded                                                                | Free 1M events, $100/mo at 1.5M, startup program |
| https://mixpanel.com/changelog/ | Not found (404)                                                       | No public changelog found                        |
| https://docs.mixpanel.com/      | Redirected → https://docs.mixpanel.com/docs/what-is-mixpanel (Loaded) | Docs                                             |

## 10. Amplitude

| URL                                                                                 | Status          | Used for                                           |
| ----------------------------------------------------------------------------------- | --------------- | -------------------------------------------------- |
| https://amplitude.com/                                                              | Loaded          | Positioning                                        |
| https://amplitude.com/pricing                                                       | Loaded          | Free 2M events, Plus starts at $0, startup program |
| https://amplitude.com/docs                                                          | Loaded          | Docs root                                          |
| https://amplitude.com/changelog                                                     | Not found (404) | No public changelog found                          |
| https://investors.amplitude.com/                                                    | Blocked (403)   | Primary filings not readable by this client        |
| https://stockanalysis.com/stocks/ampl/                                              | Loaded          | FY26 and Q4 revenue guidance quoted                |
| https://stockanalysis.com/stocks/ampl/financials/                                   | JS-only (200)   | Detailed statements require JS; not used           |
| https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001673927&type=10-Q | Blocked (403)   | Not used                                           |

## 11. June

| URL                       | Status                                            | Used for                                   |
| ------------------------- | ------------------------------------------------- | ------------------------------------------ |
| https://june.so/          | Loaded                                            | B2B SaaS positioning                       |
| https://june.so/pricing   | Redirected → https://www.june.so/pricing (Loaded) | "$1M ARR" fit statement, sales-led pricing |
| https://www.june.so/docs  | Loaded                                            | Docs root                                  |
| https://docs.june.so      | Unreachable (DNS)                                 | Not cited                                  |
| https://june.so/changelog | Redirected → https://changelog.june.so/ (Loaded)  | Changelog exists                           |

## 12. Heap

| URL                           | Status                                              | Used for                        |
| ----------------------------- | --------------------------------------------------- | ------------------------------- |
| https://www.heap.io/          | Loaded                                              | Contentsquare positioning       |
| https://www.heap.io/pricing   | Loaded                                              | Free 10k sessions, custom quote |
| https://www.heap.io/changelog | Not found (404)                                     | No public changelog found       |
| https://docs.heap.io          | Redirected → https://help.heap.io/hc/en-us (Loaded) | Docs                            |

## 13. DataFast

| URL                                              | Status           | Used for                                                     |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------ |
| https://datafa.st/                               | Loaded / JS-only | Positioning, 28,285 users, plan features, trial              |
| https://datafa.st/pricing                        | Not found (404)  | Pricing is on the home page                                  |
| https://datafa.st/pricing.md                     | Not found (404)  | Not available                                                |
| https://datafa.st/docs                           | Loaded           | "Install DataFast in 2 minutes"                              |
| https://datafa.st/docs/connect-payment-provider  | Loaded           | Payment-provider integration flow                            |
| https://datafa.st/docs/revenue-attribution-guide | Loaded           | Attribution docs                                             |
| https://datafa.st/changelog                      | Loaded           | Changelog exists                                             |
| https://datafa.st/llms.txt                       | Loaded           | Site/CLI index                                               |
| https://datafa.st/llms-full.txt                  | Not found (404)  | Not available                                                |
| https://datafa.st/ (Firecrawl render)            | Loaded           | Rendered prices; counter duplicates digits (confidence note) |

DataFast plan features read from the page: Starter 1 website / 1 team member /
3-year retention; Growth 30 websites / 30 team members / 5+ years. Exact price
digits were unstable because the counter animates and duplicates nodes; $9 is
cross-checked against getopen.so's comparison table, $19 is Medium confidence.

## 14. Baremetrics

| URL                               | Status                                                 | Used for                                                               |
| --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| https://baremetrics.com/          | Loaded                                                 | Subscription analytics positioning                                     |
| https://baremetrics.com/pricing   | Loaded                                                 | $75/$255/$1,152 bands (animated digits, Low confidence), +$129 add-ons |
| https://help.baremetrics.com/     | Redirected → https://help.baremetrics.com/en/ (Loaded) | Help docs                                                              |
| https://docs.baremetrics.com      | Unreachable (TLS certificate error)                    | Not cited                                                              |
| https://baremetrics.com/changelog | Not found (404)                                        | No public changelog found                                              |

## 15. ChartMogul

| URL                               | Status                                                              | Used for                                                            |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| https://chartmogul.com/           | Loaded                                                              | Subscription intelligence positioning                               |
| https://chartmogul.com/pricing/   | Loaded                                                              | Free ≤$10K MRR; $69/$57 first paid band (matrix, Medium confidence) |
| https://dev.chartmogul.com/       | Redirected → https://dev.chartmogul.com/docs/introduction/ (Loaded) | API docs                                                            |
| https://chartmogul.com/changelog/ | Not found (404)                                                     | No public changelog found                                           |

## 16. Talivia (upstream / live product)

| URL                                                | Status            | Used for                                                                       |
| -------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| https://talivia.com/                               | Loaded            | Live product, positioning, $9.99 founding price, 14-day trial, unlimited sites |
| https://talivia.com/pricing                        | Not found (404)   | Pricing is on the home page                                                    |
| https://talivia.com/changelog                      | Not found (404)   | No public changelog found                                                      |
| https://talivia.com/docs                           | Loaded            | Docs root                                                                      |
| https://talivia.com/docs/installation              | Loaded            | Install guide                                                                  |
| https://talivia.com/docs/integrations              | Loaded            | Integrations; revenue/social context                                           |
| https://docs.talivia.com                           | Unreachable (DNS) | Not cited                                                                      |
| https://github.com/talivia-group/talivia           | Loaded            | MIT repository                                                                 |
| https://api.github.com/repos/talivia-group/talivia | Loaded            | 2,289 stars (2026-11-14)                                                       |

## 17. Open Analytics / getopen.so

| URL                                                    | Status            | Used for                                                     |
| ------------------------------------------------------ | ----------------- | ------------------------------------------------------------ |
| https://getopen.so/                                    | Loaded            | Positioning, hosted instance                                 |
| https://getopen.so/pricing                             | Loaded            | $9/$19/$49 sizes, 7-day card trial, no free plan, no overage |
| https://getopen.so/docs                                | Loaded            | Docs root                                                    |
| https://getopen.so/docs/revenue                        | Loaded            | Stripe + Polar connection flow                               |
| https://getopen.so/changelog                           | Loaded            | Changelog exists                                             |
| https://docs.getopen.so                                | Unreachable (DNS) | Not cited                                                    |
| https://github.com/OpenLabs-so/openanalytics           | Loaded            | AGPL repository, Neon sponsorship                            |
| https://api.github.com/repos/OpenLabs-so/openanalytics | Loaded            | 652 stars (2026-11-14)                                       |

## 18. trckable

| URL                                            | Status                                           | Used for                                                               |
| ---------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| https://trckable.com/                          | Loaded                                           | Positioning, free/paid plans, price lock, payment providers            |
| https://trckable.com/docs                      | Redirected → https://docs.trckable.com/ (Loaded) | Docs root                                                              |
| https://docs.trckable.com/                     | Loaded                                           | Docs root                                                              |
| https://docs.trckable.com/revenue/             | Loaded                                           | Stripe, Paddle, Lemon Squeezy, Polar, Dodo, Gumroad/PayPal attribution |
| https://docs.trckable.com/self-host/           | Loaded                                           | Self-host guide                                                        |
| https://cloud.trckable.com/pricing             | Not found (404)                                  | Pricing is on the home page                                            |
| https://trckable.com/changelog                 | Not found (404)                                  | No public changelog found                                              |
| https://github.com/trckable/trckable           | Loaded                                           | AGPL repository                                                        |
| https://api.github.com/repos/trckable/trckable | Loaded                                           | 2 stars (2026-11-14)                                                   |

## 19–23. Other reference repositories

| URL                                                                | Status                | Used for                                         |
| ------------------------------------------------------------------ | --------------------- | ------------------------------------------------ |
| https://github.com/sarequl/datagoat                                | Loaded                | Pre-release, self-deploy, "DataFast alternative" |
| https://api.github.com/repos/sarequl/datagoat                      | Loaded                | 3 stars (2026-11-14)                             |
| https://github.com/surendrapandar/minilytics                       | Loaded                | Self-host only, 836 stars                        |
| https://api.github.com/repos/surendrapandar/minilytics             | Loaded                | 836 stars (2026-11-14)                           |
| https://github.com/iKislay/pixelmoth                               | Loaded                | Self-host only, Dodo built in                    |
| https://api.github.com/repos/iKislay/pixelmoth                     | Loaded                | 5 stars (2026-11-14)                             |
| https://www.openwebanalytics.com/                                  | Loaded                | Self-host PHP analytics                          |
| https://github.com/Open-Web-Analytics/Open-Web-Analytics           | Loaded                | GPL-2.0 repository                               |
| https://api.github.com/repos/Open-Web-Analytics/Open-Web-Analytics | Loaded                | 2,696 stars (2026-11-14)                         |
| https://github.com/segmentio/analytics.js                          | Loaded                | Legacy MIT SDK                                   |
| https://api.github.com/repos/segmentio/analytics.js                | Loaded                | 4,741 stars, last push 2022-02-24                |
| https://segment.com/                                               | Loaded                | Twilio Segment CDP                               |
| https://www.twilio.com/en-us/pricing/customer-data                 | Loaded                | Sales-led CDP pricing                            |
| https://activateiq.com/                                            | Unreachable (timeout) | No live product verified                         |
| https://www.activateiq.com/                                        | Unreachable (timeout) | No live product verified                         |

## 24. Cross-check sources

| URL                                                              | Status | Used for                                                                                                                                                 |
| ---------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| https://getopen.so/pricing                                       | Loaded | Competitor starting-tier comparison table ("DataFast $9 · 10,000 events", Plausible $9/10k, Fathom $15/100k, Simple Analytics $20/100k, Umami free/100k) |
| https://stockanalysis.com/stocks/ampl/                           | Loaded | Amplitude FY26/Q4 revenue guidance (company-reported via aggregator)                                                                                     |
| https://api.github.com/search/repositories?q=trckable            | Loaded | Locating the trckable repository                                                                                                                         |
| https://api.github.com/search/repositories?q=talivia%20analytics | Loaded | Locating the Talivia repository                                                                                                                          |

---

## Failed, blocked and missing (recorded, not used as evidence)

| URL                                                                     | Status                | Note                                                                     |
| ----------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| https://investors.amplitude.com/                                        | 403                   | Bot-blocked. Use primary filings manually if a precise figure is needed. |
| https://www.sec.gov/cgi-bin/browse-edgar?...                            | 403                   | SEC blocked this client.                                                 |
| https://docs.june.so                                                    | DNS failure           | June uses `/docs` on the marketing domain.                               |
| https://docs.talivia.com                                                | DNS failure           | Talivia uses `talivia.com/docs`.                                         |
| https://docs.getopen.so                                                 | DNS failure           | Open Analytics uses `getopen.so/docs`.                                   |
| https://docs.baremetrics.com                                            | TLS certificate error | Help centre is at `help.baremetrics.com`.                                |
| https://activateiq.com/                                                 | Timeout               | No live product verified.                                                |
| https://www.activateiq.com/                                             | Timeout               | No live product verified.                                                |
| https://plausible.io/... (all)                                          | —                     | No auth-gated content accessed.                                          |
| https://umami.is/changelog                                              | 404                   | Use GitHub releases.                                                     |
| https://pirsch.io/changelog                                             | 404                   | No public changelog found.                                               |
| https://mixpanel.com/changelog/                                         | 404                   | No public changelog found.                                               |
| https://amplitude.com/changelog                                         | 404                   | No public changelog found.                                               |
| https://www.heap.io/changelog                                           | 404                   | No public changelog found.                                               |
| https://baremetrics.com/changelog                                       | 404                   | No public changelog found.                                               |
| https://chartmogul.com/changelog/                                       | 404                   | No public changelog found.                                               |
| https://talivia.com/changelog                                           | 404                   | No public changelog found.                                               |
| https://trckable.com/changelog                                          | 404                   | No public changelog found.                                               |
| https://cloud.trckable.com/pricing                                      | 404                   | Pricing is on the home page.                                             |
| https://datafa.st/pricing                                               | 404                   | Pricing is on the home page.                                             |
| https://www.cloudflare.com/application-services/products/web-analytics/ | 404                   | Use `/web-analytics/`.                                                   |
| https://usefathom.com/docs/script                                       | 404                   | Use `/docs` root.                                                        |
| https://docs.umami.is/docs/quickstart                                   | 404                   | Quickstart is under `docs.umami.is/docs`.                                |

---

## Source-quality notes

1. **Point-in-time data.** Star counts and prices were captured on 2026-11-14.
   Star counts move daily; prices move less often but several pages animate
   them.
2. **Animated counters.** DataFast, Baremetrics and ChartMogul render prices
   through JS counters. The digit strings can duplicate during animation
   (`$99` for `$9`, `$1919` for `$19`). Those rows are flagged Medium/Low and
   must be re-checked visually before any external comparison.
3. **Company-reported vs verified.** A vendor's own "22,000 customers" is
   Company-reported. A price on that vendor's pricing page is Verified. A GitHub
   star count from the API is Verified as a star count, not as demand.
4. **No independent traffic or revenue estimates were purchased or scraped.**
   Similarweb, Crunchbase, G2 and app-store data were deliberately not used, so
   no third-party traffic estimate appears in these documents.
5. **No conversion data exists publicly.** None of the revenue-first products
   publishes trial-to-paid conversion, churn or ARPU. Statements about
   "best onboarding" are qualitative comparisons of public flows, not measured
   conversion rates.
6. **No legal conclusions.** Items that need counsel are listed in
   `MARKET_OPPORTUNITY.md` §9.

## Coverage check against the contract

| Required product         | Covered | Live URL verified                           |
| ------------------------ | ------- | ------------------------------------------- |
| Plausible                | Yes     | Yes                                         |
| Fathom                   | Yes     | Yes                                         |
| Umami                    | Yes     | Yes                                         |
| Simple Analytics         | Yes     | Yes                                         |
| Pirsch                   | Yes     | Yes                                         |
| Matomo                   | Yes     | Yes                                         |
| Cloudflare Web Analytics | Yes     | Yes                                         |
| PostHog                  | Yes     | Yes                                         |
| Mixpanel                 | Yes     | Yes                                         |
| Amplitude                | Yes     | Yes (IR blocked, pricing loaded)            |
| June                     | Yes     | Yes                                         |
| Heap                     | Yes     | Yes                                         |
| DataFast                 | Yes     | Yes                                         |
| Baremetrics              | Yes     | Yes                                         |
| ChartMogul               | Yes     | Yes                                         |
| talivia                  | Yes     | Yes                                         |
| openanalytics            | Yes     | Yes (getopen.so)                            |
| umami (reference)        | Yes     | Yes                                         |
| datagoat                 | Yes     | Repository only — no hosted product         |
| minilytics               | Yes     | Repository only — no hosted product         |
| pixelmoth                | Yes     | Repository only — no hosted product         |
| trckable                 | Yes     | Yes                                         |
| Open-Web-Analytics       | Yes     | Yes (self-host only)                        |
| analytics.js / Segment   | Yes     | Yes (Twilio Segment)                        |
| ActivateIQ               | Yes     | No — domain timed out; local prototype only |
