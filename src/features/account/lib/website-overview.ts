import { DEFAULT_CURRENCY, EVENT_TYPE } from '@/lib/constants';
import {
  classifyRevenueChannel,
  REVENUE_CHANNELS,
  REVENUE_CHANNEL_LABELS,
  type RevenueChannel,
} from '@/features/analytics/lib/dashboard-breakdown';

export const WEBSITE_OVERVIEW_EXCLUDED_EVENT_TYPES = [
  EVENT_TYPE.customEvent,
  EVENT_TYPE.performance,
];

export interface WebsiteOverviewMetrics {
  pageviews: number;
  visitors: number;
  visits: number;
  payments: number;
  revenue: number;
  currency: string;
}

export interface WebsiteOverviewChartPoint {
  date: string;
  visitors: number;
  revenue: number;
  payments: number;
}

export interface WebsiteOverviewMetricRow {
  websiteId: string;
  date?: unknown;
  pageviews?: unknown;
  visitors?: unknown;
  visits?: unknown;
  payments?: unknown;
  revenue?: unknown;
  currency?: string | null;
}

export type WebsiteOverviewItem<TWebsite extends { id: string }> = TWebsite & {
  metrics: WebsiteOverviewMetrics;
  chart: WebsiteOverviewChartPoint[];
};

export function createSqlInList(name: string, values: unknown[], type?: string) {
  const params: Record<string, unknown> = {};
  const sql = values
    .map((value, index) => {
      const key = `${name}${index}`;

      params[key] = value;

      return `{{${key}${type ? `::${type}` : ''}}}`;
    })
    .join(', ');

  return {
    sql: sql || 'null',
    params,
  };
}

function toNumber(value: unknown) {
  return Number(value || 0);
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function createMetrics(currency = DEFAULT_CURRENCY): WebsiteOverviewMetrics {
  return {
    pageviews: 0,
    visitors: 0,
    visits: 0,
    payments: 0,
    revenue: 0,
    currency,
  };
}

function createEmptyChart(days: string[]): WebsiteOverviewChartPoint[] {
  return days.map(date => ({
    date,
    visitors: 0,
    revenue: 0,
    payments: 0,
  }));
}

export function createWebsiteOverviewChart(
  days: string[],
  visitorRows: WebsiteOverviewMetricRow[],
  revenueRows: WebsiteOverviewMetricRow[],
) {
  const chart = new Map<string, WebsiteOverviewChartPoint[]>();

  for (const row of [...visitorRows, ...revenueRows]) {
    const websiteId = row.websiteId;
    const date = normalizeDate((row as any).date);
    const points = chart.get(websiteId) ?? createEmptyChart(days);
    const point = points.find(item => item.date === date);

    if (point) {
      point.visitors += toNumber(row.visitors);
      point.revenue += toNumber(row.revenue);
      point.payments += toNumber(row.payments);
    }

    chart.set(websiteId, points);
  }

  return chart;
}

export function mergeWebsiteOverview<TWebsite extends { id: string }>(
  websites: TWebsite[],
  rows: WebsiteOverviewMetricRow[],
  defaultCurrency = DEFAULT_CURRENCY,
  charts?: Map<string, WebsiteOverviewChartPoint[]>,
): WebsiteOverviewItem<TWebsite>[] {
  const metrics = new Map<string, WebsiteOverviewMetrics>();

  for (const row of rows) {
    const existing = metrics.get(row.websiteId) ?? createMetrics(defaultCurrency);

    metrics.set(row.websiteId, {
      pageviews: existing.pageviews + toNumber(row.pageviews),
      visitors: existing.visitors + toNumber(row.visitors),
      visits: existing.visits + toNumber(row.visits),
      payments: existing.payments + toNumber(row.payments),
      revenue: existing.revenue + toNumber(row.revenue),
      currency: row.currency || existing.currency || defaultCurrency,
    });
  }

  return websites.map(website => ({
    ...website,
    metrics: metrics.get(website.id) ?? createMetrics(defaultCurrency),
    chart: charts?.get(website.id) ?? [],
  }));
}

export interface PortfolioMrrRow {
  source?: string | null;
  medium?: string | null;
  referrerDomain?: string | null;
  mrr: number | string;
  subscriptions: number | string;
  currency?: string | null;
}

export interface PortfolioMrrChannel {
  channel: RevenueChannel;
  label: string;
  mrr: number;
  subscriptions: number;
  currency: string | null;
}

export interface PortfolioMrrByChannel {
  totalMrr: number | null;
  currency: string | null;
  channels: PortfolioMrrChannel[];
}

function normalizeCurrency(value?: string | null) {
  return value ? value.toUpperCase() : null;
}

function pickSingleCurrency(currencies: Set<string>) {
  return currencies.size === 1 ? [...currencies][0] : null;
}

/**
 * Groups current subscription MRR by the subscriber's first-touch channel.
 * Amounts are only totalled when every subscription shares one currency; a
 * mixed-currency workspace returns `null` totals rather than an invented sum.
 */
export function mergePortfolioMrrRows(rows: PortfolioMrrRow[]): PortfolioMrrByChannel {
  if (!rows.length) {
    return { totalMrr: 0, currency: null, channels: [] };
  }

  const channels = new Map<
    RevenueChannel,
    { mrr: number; subscriptions: number; currencies: Set<string> }
  >();
  const allCurrencies = new Set<string>();

  for (const row of rows) {
    const channel = classifyRevenueChannel({
      source: row.source,
      medium: row.medium,
      referrerDomain: row.referrerDomain,
    });
    const entry = channels.get(channel) ?? {
      mrr: 0,
      subscriptions: 0,
      currencies: new Set<string>(),
    };
    const currency = normalizeCurrency(row.currency);

    entry.mrr += toNumber(row.mrr);
    entry.subscriptions += toNumber(row.subscriptions);

    if (currency) {
      entry.currencies.add(currency);
      allCurrencies.add(currency);
    }

    channels.set(channel, entry);
  }

  const channelRows = REVENUE_CHANNELS.flatMap(channel => {
    const entry = channels.get(channel);

    if (!entry) {
      return [];
    }

    return [
      {
        channel,
        label: REVENUE_CHANNEL_LABELS[channel],
        mrr: entry.mrr,
        subscriptions: entry.subscriptions,
        currency: pickSingleCurrency(entry.currencies),
      },
    ];
  }).sort((a, b) => b.mrr - a.mrr || a.label.localeCompare(b.label));

  return {
    totalMrr: allCurrencies.size <= 1 ? channelRows.reduce((sum, row) => sum + row.mrr, 0) : null,
    currency: pickSingleCurrency(allCurrencies),
    channels: channelRows,
  };
}
