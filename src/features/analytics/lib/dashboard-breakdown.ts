import {
  EMAIL_DOMAINS,
  PAID_AD_PARAMS,
  SEARCH_DOMAINS,
  SHOPPING_DOMAINS,
  SOCIAL_DOMAINS,
  VIDEO_DOMAINS,
} from '@/lib/constants';

export const REVENUE_CHANNELS = [
  'paidAds',
  'paidSearch',
  'paidSocial',
  'paidShopping',
  'paidVideo',
  'organicSearch',
  'organicSocial',
  'organicShopping',
  'organicVideo',
  'email',
  'affiliate',
  'sms',
  'referral',
  'direct',
  'unattributed',
] as const;

export type RevenueChannel = (typeof REVENUE_CHANNELS)[number];

export const REVENUE_CHANNEL_LABELS: Record<RevenueChannel, string> = {
  paidAds: 'Paid ads',
  paidSearch: 'Paid search',
  paidSocial: 'Paid social',
  paidShopping: 'Paid shopping',
  paidVideo: 'Paid video',
  organicSearch: 'Organic search',
  organicSocial: 'Organic social',
  organicShopping: 'Organic shopping',
  organicVideo: 'Organic video',
  email: 'Email',
  affiliate: 'Affiliate',
  sms: 'SMS',
  referral: 'Referral',
  direct: 'Direct',
  unattributed: 'Unattributed',
};

export interface RevenueChannelInput {
  source?: string | null;
  medium?: string | null;
  referrerDomain?: string | null;
  urlQuery?: string | null;
}

const PAID_MEDIUM_TOKENS = ['ppc', 'cpc', 'cpm', 'paid', 'retargeting', 'display', 'adwords'];

function normalize(value?: string | null) {
  return (value || '').toLowerCase().trim();
}

function matchesDomain(value: string, domains: string[]) {
  const tokens = value.split(/[\s./]+/).filter(Boolean);

  return domains.some(domain => {
    const base = domain.replace(/\.+$/, '');

    return value.includes(base) || tokens.includes(base.split('.')[0]);
  });
}

/**
 * First-touch channel classification used by the portfolio MRR panel. It mirrors
 * the ordering of the SQL channel expression in the per-website breakdown, but
 * reads the visitor's stored first-touch fields instead of joining events.
 */
export function classifyRevenueChannel({
  source,
  medium,
  referrerDomain,
  urlQuery,
}: RevenueChannelInput): RevenueChannel {
  const sourceValue = normalize(source);
  const mediumValue = normalize(medium);
  const referrerValue = normalize(referrerDomain);
  const queryValue = normalize(urlQuery);
  const combined = `${sourceValue} ${referrerValue}`.trim();
  const hasPaidMedium = PAID_MEDIUM_TOKENS.some(token => mediumValue.includes(token));
  const hasPaidQuery = PAID_AD_PARAMS.some(param => queryValue.includes(param.toLowerCase()));
  const isPaid = hasPaidMedium || hasPaidQuery;

  if (!sourceValue && !referrerValue) {
    return 'direct';
  }

  if (isPaid) {
    if (matchesDomain(combined, SEARCH_DOMAINS) || mediumValue.includes('search')) {
      return 'paidSearch';
    }

    if (matchesDomain(combined, SOCIAL_DOMAINS)) {
      return 'paidSocial';
    }

    if (matchesDomain(combined, SHOPPING_DOMAINS)) {
      return 'paidShopping';
    }

    if (matchesDomain(combined, VIDEO_DOMAINS)) {
      return 'paidVideo';
    }

    return 'paidAds';
  }

  if (mediumValue.includes('affiliate')) {
    return 'affiliate';
  }

  if (mediumValue.includes('sms') || sourceValue.includes('sms')) {
    return 'sms';
  }

  if (matchesDomain(combined, SEARCH_DOMAINS) || mediumValue.includes('organic')) {
    return 'organicSearch';
  }

  if (matchesDomain(combined, SOCIAL_DOMAINS)) {
    return 'organicSocial';
  }

  if (
    matchesDomain(combined, EMAIL_DOMAINS) ||
    mediumValue.includes('mail') ||
    mediumValue.includes('email')
  ) {
    return 'email';
  }

  if (matchesDomain(combined, SHOPPING_DOMAINS) || mediumValue.includes('shop')) {
    return 'organicShopping';
  }

  if (matchesDomain(combined, VIDEO_DOMAINS) || mediumValue.includes('video')) {
    return 'organicVideo';
  }

  if (referrerValue) {
    return 'referral';
  }

  return sourceValue ? 'referral' : 'unattributed';
}

export interface DashboardBreakdownTrafficRow {
  x: string | null;
  y: number | string;
  country?: string | null;
}

export interface DashboardBreakdownRevenueRow {
  x: string | null;
  revenue: number | string;
  payments: number | string;
  currency?: string | null;
  country?: string | null;
}

export interface DashboardBreakdownMergeInput {
  trafficRows: DashboardBreakdownTrafficRow[];
  revenueRows: DashboardBreakdownRevenueRow[];
  currency: string;
  sort?: 'visitors' | 'revenue';
}

export interface DashboardBreakdownRow {
  x: string;
  label: string;
  visitors: number;
  revenue: number;
  payments: number;
  visitorPercent: number;
  revenuePercent: number;
  revenuePerVisitor: number;
  conversionRate: number;
  currency: string;
  country?: string | null;
  source?: string;
  sourceLabel?: string;
  isEstimatedRevenue?: boolean;
  impressions?: number;
  ctr?: number;
  position?: number;
  pages?: number;
}

function toNumber(value: unknown) {
  return Number(value || 0);
}

function label(value?: string | null) {
  return value || 'Unattributed';
}

function percent(value: number, max: number) {
  return max > 0 ? (value / max) * 100 : 0;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export function mergeDashboardBreakdownRows({
  trafficRows,
  revenueRows,
  currency,
  sort = 'visitors',
}: DashboardBreakdownMergeInput): DashboardBreakdownRow[] {
  const rows = new Map<string, DashboardBreakdownRow>();

  for (const row of trafficRows) {
    const key = label(row.x);
    const existing = rows.get(key);

    rows.set(key, {
      x: key,
      label: key,
      visitors: (existing?.visitors || 0) + toNumber(row.y),
      revenue: existing?.revenue || 0,
      payments: existing?.payments || 0,
      visitorPercent: 0,
      revenuePercent: 0,
      revenuePerVisitor: 0,
      conversionRate: 0,
      currency: existing?.currency || currency,
      country: row.country || existing?.country,
    });
  }

  for (const row of revenueRows) {
    const key = label(row.x);
    const existing = rows.get(key);

    rows.set(key, {
      x: key,
      label: key,
      visitors: existing?.visitors || 0,
      revenue: (existing?.revenue || 0) + toNumber(row.revenue),
      payments: (existing?.payments || 0) + toNumber(row.payments),
      visitorPercent: 0,
      revenuePercent: 0,
      revenuePerVisitor: 0,
      conversionRate: 0,
      currency: row.currency || existing?.currency || currency,
      country: row.country || existing?.country,
    });
  }

  const items = [...rows.values()];
  const maxVisitors = Math.max(...items.map(row => row.visitors), 0);
  const maxRevenue = Math.max(...items.map(row => row.revenue), 0);

  return items
    .map(row => ({
      ...row,
      visitorPercent: percent(row.visitors, maxVisitors),
      revenuePercent: percent(row.revenue, maxRevenue),
      revenuePerVisitor: ratio(row.revenue, row.visitors),
      conversionRate: ratio(row.payments, row.visitors) * 100,
    }))
    .sort((a, b) => {
      const primary =
        sort === 'revenue'
          ? b.revenue - a.revenue || b.visitors - a.visitors
          : b.visitors - a.visitors || b.revenue - a.revenue;

      return primary || a.label.localeCompare(b.label);
    });
}
