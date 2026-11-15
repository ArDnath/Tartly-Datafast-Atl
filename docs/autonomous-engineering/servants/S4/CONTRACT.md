# S4 — Live market, traction and pricing verification

## Objective

Verify on the live web which analytics products have real commercial traction
and the best onboarding/conversion mechanics, so the master can weight which
reference patterns to adopt and how to position the product.

## Integrity rules

- Every number needs a source URL and access date and one label: Verified,
  Company-reported, Founder-reported, Third-party estimate, Inferred, Undisclosed.
- Never equate traffic, GitHub stars, total users, or funding with paying
  customers or revenue.
- Do not invent URLs, demos, or numbers. If a page is auth-gated or unreachable,
  say so. If web access fails, write BLOCKED and stop after documenting it.
- No legal-compliance conclusions. Flag legal questions for review.

## Owned write scope

- `docs/market-intelligence/LIVE_PRODUCT_RESEARCH.md`
- `docs/market-intelligence/COMPETITOR_PRICING.md`
- `docs/market-intelligence/MARKET_OPPORTUNITY.md`
- `docs/market-intelligence/SOURCE_REGISTER.md`

## Coverage

Minimum: Plausible, Fathom, Umami, Simple Analytics, Pirsch, Matomo,
Cloudflare Web Analytics, PostHog, Mixpanel, Amplitude, June, Heap, DataFast,
Baremetrics, ChartMogul, and the live products of the local references
(talivia, openanalytics, umami, datagoat, minilytics, pixelmoth, trckable,
Open-Web-Analytics, analytics.js/Segment, ActivateIQ). Add others only with a
real URL.

## Per product

Official site (verify it loads), pricing page, docs/install guide, changelog,
positioning, target audience, free tier/trial, pricing at the lowest paid tier,
notable integrations, onboarding flow notes, and a traction table row:
`| Metric | Value | Source URL | Date | Evidence type | Confidence |`.

## Required analysis

- Strongest _verified_ commercial traction vs strongest user base (separate).
- Best onboarding and free-to-paid mechanics, with concrete screens/flows.
- Underserved segments and where a small competitor can win.
- Price band for indie/SaaS/agency buyers; what the two-plan model should be
  tested against (do not invent final prices; the repo owner fixes them).

## Acceptance criteria

Source register lists every URL used with date and status (loaded / blocked /
auth-gated). Claims about revenue or customers are labelled. A clear
"what this means for our positioning" section with no fabricated data.

## Budget

One pass. Prefer official pricing pages, founder posts, public revenue
dashboards, and GitHub API data. Do not crawl hundreds of pages.
