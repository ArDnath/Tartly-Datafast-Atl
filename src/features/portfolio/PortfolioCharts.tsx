'use client';

import { Column, Grid, Row, Text } from '@talivia/react-zen';
import { useMemo } from 'react';
import {
  CHART_PALETTE,
  ComposedTrendChart,
  formatCompactNumber,
  SankeyFlowChart,
  useChartColors,
} from '@/components/charts/echarts';
import { useLocale } from '@/components/hooks';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { formatLongCurrency, formatLongNumber } from '@/lib/format';
import {
  buildPortfolioSankey,
  buildWebsiteRevenueRows,
  formatPortfolioChartDate,
  mergePortfolioCharts,
  type PortfolioSite,
} from './lib/portfolioCharts';
import styles from './PortfolioCharts.module.css';

function ChartCard({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  meta: string;
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
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function EmptyChart() {
  return (
    <Row alignItems="center" justifyContent="center" minHeight="180px">
      <Text color="muted">No data for this period</Text>
    </Row>
  );
}

/**
 * The EvilCharts-inspired blocks on the portfolio home: a mixed revenue/visitor
 * chart, a per-site revenue/visitor composed card, and a sankey that shows where
 * each site's traffic ends up. All figures come from the real
 * `GET /websites/overview` payload; nothing here is mocked.
 */
export function PortfolioCharts({
  sites,
  currency = DEFAULT_CURRENCY,
}: {
  sites: PortfolioSite[];
  currency?: string;
}) {
  const { locale } = useLocale();
  const colors = useChartColors();
  const points = useMemo(() => mergePortfolioCharts(sites), [sites]);
  const revenueRows = useMemo(() => buildWebsiteRevenueRows(sites), [sites]);
  const sankey = useMemo(() => buildPortfolioSankey(sites), [sites]);

  const composedRows = useMemo(
    () =>
      points.map(point => ({
        label: formatPortfolioChartDate(point.date),
        bar: point.revenue,
        line: point.visitors,
      })),
    [points],
  );

  const formatCurrency = (value: number) => formatLongCurrency(value, currency, locale);

  if (sites.length === 0) {
    return null;
  }

  return (
    <Column gap="3">
      <ChartCard
        eyebrow="Revenue"
        title="Portfolio revenue trend"
        meta={`${points.length} ${points.length === 1 ? 'bucket' : 'buckets'}`}
      >
        {points.length === 0 ? (
          <EmptyChart />
        ) : (
          <ComposedTrendChart
            rows={composedRows}
            barLabel="Revenue"
            lineLabel="Visitors"
            barColors={CHART_PALETTE}
            colors={colors}
            formatBar={formatCurrency}
            formatLine={value => formatLongNumber(value)}
            formatAxis={value => formatCompactNumber(value)}
            lineAxis="right"
            height={196}
            ariaLabel={`Portfolio revenue bars with a visitor line across ${points.length} buckets. Total ${formatCurrency(
              composedRows.reduce((sum, row) => sum + row.bar, 0),
            )}.`}
          />
        )}
      </ChartCard>

      <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
        <ChartCard eyebrow="Sites" title="Revenue and audience" meta="This period">
          {revenueRows.length === 0 ? (
            <EmptyChart />
          ) : (
            <ComposedTrendChart
              rows={revenueRows}
              barLabel="Revenue"
              lineLabel="Visitors"
              barColors={CHART_PALETTE}
              colors={colors}
              formatBar={formatCurrency}
              formatLine={value => formatLongNumber(value)}
              formatAxis={value => formatCompactNumber(value)}
              lineAxis="right"
              height={206}
              ariaLabel="Revenue bars with visitor line for each website in the portfolio."
            />
          )}
        </ChartCard>

        <ChartCard eyebrow="Flow" title="Where visitors end up" meta="Visitors">
          {sankey.nodes.length === 0 ? (
            <EmptyChart />
          ) : (
            <SankeyFlowChart
              nodes={sankey.nodes}
              links={sankey.links}
              colors={colors}
              formatValue={value => formatLongNumber(value)}
              labelPadding={112}
              height={206}
              ariaLabel="Sankey flow from all visitors into each website, then into converted and unconverted visitors."
            />
          )}
        </ChartCard>
      </Grid>
    </Column>
  );
}
