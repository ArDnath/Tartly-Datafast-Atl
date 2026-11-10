# SEO and content plan

## 20 keywords with intent

| #   | Keyword                               | Intent        | Page                                         |
| --- | ------------------------------------- | ------------- | -------------------------------------------- |
| 1   | revenue attribution analytics         | commercial    | `/revenue-attribution`                       |
| 2   | Stripe revenue attribution            | commercial    | `/docs/revenue-guides/stripe`                |
| 3   | Dodo Payments analytics               | commercial    | `/docs/revenue-guides/dodo-payments`         |
| 4   | Lemon Squeezy analytics               | commercial    | `/docs/revenue-guides/lemon-squeezy`         |
| 5   | Polar analytics integration           | commercial    | `/docs/revenue-guides/polar`                 |
| 6   | which marketing channel makes money   | informational | `/docs/revenue-guides`                       |
| 7   | web analytics for indie hackers       | commercial    | `/`                                          |
| 8   | affordable Plausible alternative      | comparison    | `/alternatives/plausible`                    |
| 9   | Fathom analytics alternative          | comparison    | `/alternatives/fathom`                       |
| 10  | Umami cloud alternative               | comparison    | `/alternatives/umami`                        |
| 11  | Simple Analytics alternative          | comparison    | `/alternatives/simple-analytics`             |
| 12  | DataFast alternative                  | comparison    | `/alternatives/datafast`                     |
| 13  | revenue per visitor                   | informational | `/docs/revenue-guides/revenue-per-visitor`   |
| 14  | first touch vs last touch attribution | informational | `/docs/revenue-guides/attribution-models`    |
| 15  | SaaS conversion rate by channel       | informational | `/docs/revenue-guides/conversion-by-channel` |
| 16  | track Stripe payments without GA4     | informational | `/docs/revenue-guides/stripe`                |
| 17  | cookieless analytics with revenue     | commercial    | `/`                                          |
| 18  | analytics for micro SaaS              | commercial    | `/`                                          |
| 19  | session replay with privacy masking   | commercial    | `/pricing`                                   |
| 20  | how to install analytics on Next.js   | informational | `/docs/install`                              |

## 10 content outlines

1. **Which channel actually pays you?** Define first/last touch, show a
   worked example with organic, paid, referral, direct, and recurring revenue.
2. **Stripe revenue attribution without GA4.** Server webhook, customer match,
   visitor link, limitations, privacy.
3. **Dodo Payments revenue attribution.** Same shape, Dodo-specific events.
4. **First touch vs last touch.** When each lies; how to read both.
5. **Revenue per visitor is the only metric your ad budget needs.** Formula,
   examples, common mistakes.
6. **A 15-minute install for Next.js, React, Vite, Astro, and Remix.** Use the
   generated install guides; label anything not runtime-tested.
7. **Why the trial is 7 days and 2,000 events.** Unit economics, abuse,
   support, and the $7.99 promise. Link `docs/PRICING_ECONOMICS.md` numbers
   only where public.
8. **Plausible vs Tartly.** Traffic analytics vs revenue attribution;
   source-dated price table.
9. **Fathom vs Tartly.** Simplicity vs revenue loop; source-dated.
10. **What a founder should do in the first 7 days after install.** Verify,
    connect payments, tag one campaign, read the first revenue report.

## Technical SEO

- One canonical URL per page; no duplicate `/websites/*` and `/app/*` indexing
  (legacy routes redirect).
- `sitemap.xml` and `robots.txt` generated from the real public routes.
- Marketing pages indexable; `/app`, `/api`, `/share`, and `/legal` drafts set
  `noindex` where appropriate.
- Structured data: `SoftwareApplication` with the two real offers; no aggregate
  rating until real reviews exist.
- Core Web Vitals: tracker is small, marketing pages are server-rendered, fonts
  are local/optimized.
- Internal links: every comparison page links to `/pricing` and `/docs/install`.

## Publishing cadence

Two posts per week for eight weeks, then one per week. Each post must contain
one original worked example from the product, not a rewritten competitor page.
No AI-generated statistics, no invented case studies.
