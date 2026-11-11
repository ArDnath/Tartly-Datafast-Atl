'use client';

import { Column, Loading, Row, Text } from '@talivia/react-zen';
import { useMemo } from 'react';
import {
  CHART_PALETTE,
  ComposedTrendChart,
  formatCompactNumber,
  SankeyFlowChart,
  useChartColors,
} from '@/components/charts/echarts';
import { useLocale } from '@/components/hooks';
import { useDashboardBreakdownQuery } from '@/features/analytics/hooks/useDashboardBreakdownQuery';
import { useWebsiteStatsQuery } from '@/features/analytics/hooks/useWebsiteStatsQuery';
import { REVENUE_CHANNEL_LABELS } from '@/features/analytics/lib/dashboard-breakdown';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { formatLongCurrency, formatLongNumber } from '@/lib/format';
import { buildRevenueFlowSankey, formatStatsBucketLabel } from '../lib/revenue-flow';
import styles from './WebsiteCharts.module.css';

function ChartCard({
  eyebrow,
  title,
  meta,
  loading,
  empty,
  children,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <Column gap="0">
          <span className={styles.eyebrow}>{eyebrow}</span>
          <Text weight="bold">{title}</Text>
        </Column>
        <span className={styles.meta}>{meta}</span>
      </div>
      <div className={styles.body}>
        {loading ? (
          <Row alignItems="center" justifyContent="center" minHeight="200px">
            <Loading icon="dots" placement="inline" />
          </Row>
        ) : empty ? (
          <Row alignItems="center" justifyContent="center" minHeight="200px">
            <Text color="muted">No data for this period</Text>
          </Row>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/**
 * Revenue-focused ECharts blocks for the website workbench: the composed card
 * carries the money series, and the sankey answers where the traffic that made
 * it came from. Both read the tenant-scoped stats endpoints already used by the
 * rest of the page.
 */
export function WebsiteCharts({ websiteId }: { websiteId: string }) {
  const { locale } = useLocale();
  const colors = useChartColors();
  const { data: stats, isLoading: statsLoading } = useWebsiteStatsQuery({ websiteId });
  const { data: channels, isLoading: channelsLoading } = useDashboardBreakdownQuery(websiteId, {
    type: 'channel',
    sort: 'visitors',
    limit: 8,
  });

  const currency =
    stats?.currency ||
    stats?.latestPayments?.find(row => row.currency)?.currency ||
    DEFAULT_CURRENCY;

  const composedRows = useMemo(
    () =>
      (stats?.revenueChart ?? [])
        .filter(point => point?.x)
        .map(point => ({
          label: formatStatsBucketLabel(point.t || point.x),
          bar: Number(point.y) || 0,
          line: Number(point.count) || 0,
        })),
    [stats?.revenueChart],
  );

  const sankey = useMemo(
    () =>
      buildRevenueFlowSankey(
        (channels?.rows ?? []).map(row => ({
          label:
            REVENUE_CHANNEL_LABELS[row.x as keyof typeof REVENUE_CHANNEL_LABELS] ??
            row.label ??
            row.x,
          visitors: Number(row.visitors) || 0,
        })),
        Number(stats?.payments) || 0,
      ),
    [channels?.rows, stats?.payments],
  );

  const formatCurrency = (value: number) => formatLongCurrency(value, currency, locale);
  const formatCurrencyCompact = (value: number) => formatCompactNumber(value, currency);

  return (
    <div className={styles.grid}>
      <ChartCard
        eyebrow="Revenue"
        title="Revenue and payments"
        meta="This period"
        loading={statsLoading && !stats}
        empty={composedRows.length === 0}
      >
        <ComposedTrendChart
          rows={composedRows}
          barLabel="Revenue"
          lineLabel="Payments"
          barColors={CHART_PALETTE}
          barColor={colors.accent}
          lineColor={colors.positive}
          colors={colors}
          formatBar={formatCurrency}
          formatLine={value => formatLongNumber(value)}
          formatAxis={formatCurrencyCompact}
          lineAxis="right"
          height={214}
          ariaLabel="Revenue bars with the payment count line for the selected period."
        />
      </ChartCard>

      <ChartCard
        eyebrow="Flow"
        title="Channel to conversion"
        meta="Visitors"
        loading={channelsLoading && !channels}
        empty={sankey.nodes.length === 0}
      >
        <SankeyFlowChart
          nodes={sankey.nodes}
          links={sankey.links}
          colors={colors}
          formatValue={value => formatLongNumber(value)}
          labelPadding={112}
          height={214}
          ariaLabel="Sankey flow from acquisition channels into website visitors, then into converted and unconverted visitors."
        />
      </ChartCard>
    </div>
  );
}
