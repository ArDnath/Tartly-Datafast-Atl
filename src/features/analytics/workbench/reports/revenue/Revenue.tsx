'use client';

import { Column, Grid, Row, Text } from '@talivia/react-zen';
import { DataGrid } from '@/components/common/DataGrid';
import { Panel } from '@/components/common/Panel';
import { useGridState, useMessages } from '@/components/hooks';
import { useAnalyticsOverlays } from '@/features/analytics/components/AnalyticsOverlayContext';
import { DashboardBreakdownPanel } from '@/features/analytics/components/metrics/DashboardBreakdownPanel';
import { useRevenueSessionsQuery } from '@/features/analytics/hooks/useRevenueSessionsQuery';
import { useWebsiteAttributionSettingsQuery } from '@/features/websites/hooks/useWebsiteAttributionSettingsQuery';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { SessionsTable } from '../../sessions/SessionsTable';
import { WebsiteChart } from '../../WebsiteChart';
import { WebsiteChartMetricStrip } from '../../WebsiteChartMetricStrip';

function RevenueSessionsDataTable({
  websiteId,
  currency,
}: {
  websiteId: string;
  currency: string;
}) {
  const grid = useGridState({ source: 'url' });
  const queryResult = useRevenueSessionsQuery(websiteId, currency, grid.query);

  return (
    <DataGrid query={queryResult} state={grid} allowPaging allowSearch>
      {({ data }) => <SessionsTable data={data} entity="session" />}
    </DataGrid>
  );
}

export function Revenue({ websiteId }: { websiteId: string }) {
  const { t, labels } = useMessages();
  const { openBreakdown } = useAnalyticsOverlays();
  const settingsQuery = useWebsiteAttributionSettingsQuery(websiteId);
  const currency =
    settingsQuery.data?.defaultCurrency || process.env.defaultCurrency || DEFAULT_CURRENCY;

  return (
    <Column gap="3">
      <Panel
        className="dashboard-hero-panel"
        minHeight="471px"
        paddingX="0"
        paddingY="0"
        gap="0"
        style={{ overflow: 'visible', position: 'relative' }}
      >
        <WebsiteChartMetricStrip websiteId={websiteId} />
        <WebsiteChart websiteId={websiteId} />
      </Panel>

      <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
        <DashboardBreakdownPanel
          websiteId={websiteId}
          defaultSort="visitors"
          onOpen={openBreakdown}
          tabs={[
            { id: 'channel', label: t(labels.channels), type: 'channel' },
            { id: 'referrer', label: t(labels.referrers), type: 'referrer' },
            { id: 'campaign', label: 'Campaign', type: 'utmCampaign' },
            { id: 'keyword', label: 'Keywords', type: 'keywords' },
          ]}
        />

        <DashboardBreakdownPanel
          websiteId={websiteId}
          defaultSort="visitors"
          onOpen={openBreakdown}
          tabs={[
            { id: 'country', label: t(labels.countries), type: 'country' },
            { id: 'region', label: t(labels.regions), type: 'region' },
            { id: 'city', label: t(labels.cities), type: 'city' },
          ]}
        />

        <DashboardBreakdownPanel
          websiteId={websiteId}
          defaultSort="visitors"
          onOpen={openBreakdown}
          tabs={[
            { id: 'hostname', label: 'Hostname', type: 'hostname' },
            { id: 'path', label: t(labels.page), type: 'path' },
            { id: 'entry', label: t(labels.entry), type: 'entry' },
          ]}
        />

        <DashboardBreakdownPanel
          websiteId={websiteId}
          defaultSort="visitors"
          onOpen={openBreakdown}
          tabs={[
            { id: 'browser', label: t(labels.browsers), type: 'browser' },
            { id: 'os', label: t(labels.os), type: 'os' },
            { id: 'device', label: t(labels.devices), type: 'device' },
          ]}
        />
      </Grid>

      <Panel className="dashboard-panel" paddingX="0" paddingY="0" gap="0">
        <Row
          alignItems="center"
          justifyContent="space-between"
          paddingX="4"
          paddingY="2"
          style={{ borderBottom: '1px solid var(--talivia-card-border)' }}
        >
          <Text weight="bold">{t(labels.customers)}</Text>
        </Row>
        <RevenueSessionsDataTable websiteId={websiteId} currency={currency} />
      </Panel>
    </Column>
  );
}
