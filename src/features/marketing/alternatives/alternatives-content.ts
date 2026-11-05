import { BRAND } from '@/lib/brand';
import { PLANS, formatMonthlyPrice } from '@/lib/plans';

/**
 * Comparison copy. Every competitor price below was fetched on 2026-11-06 and
 * is cited in `docs/gtm/COMPETITORS.md`. A price that could not be verified in
 * server-rendered HTML is labelled, never guessed.
 */

export interface Alternative {
  slug: string;
  name: string;
  summary: string;
  price: string;
  sourceUrl: string;
  facts: string[];
  caveats: string[];
}

export const ALTERNATIVES: Alternative[] = [
  {
    slug: 'plausible',
    name: 'Plausible',
    summary:
      'A privacy-first, lightweight web analytics product with a strong EU-hosted story and a mature dashboard.',
    price: 'Starter $9/month for up to 10k monthly pageviews and one site.',
    sourceUrl: 'https://plausible.io/#pricing',
    facts: [
      'Growth is $14/month for up to 3 sites; Business is $19/month and lists ecommerce revenue attribution and funnels.',
      'No free tier on the public pricing page; a 30-day trial is offered.',
      'A strong choice if traffic analytics and EU hosting are the priority.',
    ],
    caveats: [
      'Revenue attribution is listed on the Business plan, not the entry plan.',
      `${BRAND.name} is newer and smaller; it does not yet match Plausible's ecosystem, agency features, or enterprise procurement.`,
    ],
  },
  {
    slug: 'fathom',
    name: 'Fathom Analytics',
    summary:
      'A simple, privacy-focused analytics product with a single dashboard, email reports, and a generous site count.',
    price: '$15/month for up to 100,000 monthly pageviews and 50 sites.',
    sourceUrl: 'https://usefathom.com/pricing',
    facts: [
      '$25/month covers 200,000 pageviews; $45/month covers 500,000.',
      'Every plan lists event and revenue tracking, UTM, saved views, and an API.',
      'A 7-day trial; card required.',
    ],
    caveats: [
      `${BRAND.name} focuses on first/last-touch attribution by channel and journey rather than general-purpose analytics breadth.`,
      `${BRAND.name} does not include a free plan.`,
    ],
  },
  {
    slug: 'umami',
    name: 'Umami Cloud',
    summary:
      'An open-source analytics platform with a free hobby tier and usage-based cloud plans.',
    price:
      'Hobby $0 for 100k events/month and one site; Pro $20/month for 1M events and up to 20 sites.',
    sourceUrl: 'https://umami.is/pricing',
    facts: [
      'Pro includes 10 team members, API access, MCP access, integrations, and 2-year retention.',
      'Business is $200/month for 10M events, unlimited sites, session replay, and heatmaps.',
      'Self-hosting the open-source core is an option.',
    ],
    caveats: [
      `A free tier is a real advantage for hobby projects; ${BRAND.name} deliberately does not have one.`,
      `${BRAND.name} competes on revenue attribution and a lower entry price, not on unlimited free usage.`,
    ],
  },
  {
    slug: 'simple-analytics',
    name: 'Simple Analytics',
    summary:
      'A privacy-friendly, EU-hosted analytics product with a one-page dashboard and a free hobby plan.',
    price: '$20/month for 100k pageviews and one user; extra users +$20/month.',
    sourceUrl: 'https://www.simpleanalytics.com/pricing',
    facts: [
      'A free hobby plan covers one user, five websites, and one month of history with a badge.',
      'Enterprise pricing is custom and includes API/BI access and proof-of-concept support.',
      'No cookies, consent banners, or personal data according to the pricing page.',
    ],
    caveats: [
      `${BRAND.name} is cheaper at entry and includes revenue attribution on both plans.`,
      `${BRAND.name} does not match Simple Analytics' enterprise compliance and agency positioning yet.`,
    ],
  },
  {
    slug: 'datafast',
    name: 'DataFast',
    summary:
      'A revenue-first analytics product for founders, with payment integrations, goals, funnels, and an agent/MCP surface.',
    price:
      'Public price not present in the server-rendered page on 2026-11-06; verify before comparing.',
    sourceUrl: 'https://datafa.st/',
    facts: [
      'The homepage positions DataFast around revenue-first analytics and supported payment integrations.',
      'The public page lists an AI bot-traffic add-on at $9/month per additional 1M requests; that is not the base plan price.',
      'The closest competitor on product positioning.',
    ],
    caveats: [
      'Do not quote a DataFast base price until it is captured with a date.',
      `${BRAND.name} competes on a transparent two-plan price; DataFast has a broader feature surface and more integrations.`,
    ],
  },
  {
    slug: 'talivia',
    name: 'Talivia',
    summary:
      'The MIT-licensed upstream this product was forked from, positioned as revenue attribution for SaaS founders.',
    price:
      '$9.99/month for the first year with unlimited websites (homepage wording); regular price not verified.',
    sourceUrl: 'https://talivia.com/',
    facts: [
      `Talivia is the upstream project; ${BRAND.name} keeps the MIT license and attribution.`,
      'The homepage advertises unlimited websites on the first-year price.',
      `${BRAND.name} is a hosted, multi-tenant product with its own billing and operations layer.`,
    ],
    caveats: [
      'Do not claim the regular (non-first-year) Talivia price without verifying it.',
      `If you want to self-host, evaluate Talivia directly; ${BRAND.name} is a managed service.`,
    ],
  },
];

export function getAlternative(slug: string) {
  return ALTERNATIVES.find(item => item.slug === slug) ?? null;
}

export const PRICE_COMPARISON = [
  {
    name: `${BRAND.name} Starter`,
    price: `${formatMonthlyPrice(PLANS[0])}/mo`,
    note: '1 website',
  },
  {
    name: `${BRAND.name} Pro`,
    price: `${formatMonthlyPrice(PLANS[1])}/mo`,
    note: `up to ${PLANS[1].websiteLimit} websites`,
  },
  { name: 'Plausible Starter', price: '$9/mo', note: '10k pageviews, 1 site' },
  { name: 'Fathom', price: '$15/mo', note: '100k pageviews, 50 sites' },
  { name: 'Umami Pro', price: '$20/mo', note: '1M events, 20 sites' },
  { name: 'Simple Analytics', price: '$20/mo', note: '100k pageviews, 1 user' },
];
