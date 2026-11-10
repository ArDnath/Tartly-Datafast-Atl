'use client';
import { Column, Tab, TabList, TabPanel, Tabs } from '@talivia/react-zen';
import type { Key } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';
import { useDateRange, useMessages, useStoredState } from '@/components/hooks';
import { EventsChart } from '@/features/analytics/components/metrics/EventsChart';
import { MetricCard } from '@/features/analytics/components/metrics/MetricCard';
import { MetricsBar } from '@/features/analytics/components/metrics/MetricsBar';
import { MetricsTable } from '@/features/analytics/components/metrics/MetricsTable';
import { useEventStatsQuery } from '@/features/analytics/hooks/useEventStatsQuery';
import { formatLongNumber } from '@/lib/format';
import { EventProperties } from './EventProperties';
import { EventsDataTable } from './EventsDataTable';

const KEY_NAME = 'talivia.events.tab';

export function EventsPage({ websiteId }) {
  const [tab, setTab] = useStoredState(KEY_NAME, 'chart');
  const { isAllTime } = useDateRange();
  const { t, labels, getErrorMessage } = useMessages();
  const { data, isLoading, isFetching, error } = useEventStatsQuery({
    websiteId,
  });

  const handleSelect = (value: Key) => {
    setTab(value.toString());
  };

  const { events, visitors, visits, uniqueEvents, comparison } = data || {};

  const metrics = data
    ? [
        {
          value: visitors,
          label: t(labels.visitors),
          change: visitors - comparison.visitors,
          formatValue: formatLongNumber,
        },
        {
          value: visits,
          label: t(labels.visits),
          change: visits - comparison.visits,
          formatValue: formatLongNumber,
        },
        {
          value: events,
          label: t(labels.events),
          change: events - comparison.events,
          formatValue: formatLongNumber,
        },
        {
          value: uniqueEvents,
          label: t(labels.uniqueEvents),
          change: uniqueEvents - comparison.uniqueEvents,
          formatValue: formatLongNumber,
        },
      ]
    : null;

  return (
    <Column gap="3">
      <LoadingPanel
        data={metrics}
        isLoading={isLoading}
        isFetching={isFetching}
        error={getErrorMessage(error)}
        minHeight="136px"
      >
        <MetricsBar>
          {metrics?.map(({ label, value, change, formatValue }) => {
            return (
              <MetricCard
                key={label}
                value={value}
                label={label}
                change={change}
                formatValue={formatValue}
                showChange={!isAllTime}
              />
            );
          })}
        </MetricsBar>
      </LoadingPanel>
      <Panel>
        <Tabs selectedKey={tab} onSelectionChange={key => handleSelect(key)}>
          <TabList>
            <Tab id="chart">{t(labels.chart)}</Tab>
            <Tab id="activity">{t(labels.activity)}</Tab>
            <Tab id="properties">{t(labels.properties)}</Tab>
          </TabList>
          <TabPanel id="activity">
            <EventsDataTable websiteId={websiteId} />
          </TabPanel>
          <TabPanel id="chart">
            <Column gap="6">
              <Column border="bottom" paddingBottom="6">
                <EventsChart websiteId={websiteId} limit={50} />
              </Column>
              <MetricsTable
                websiteId={websiteId}
                type="event"
                title={t(labels.event)}
                metric={t(labels.count)}
                limit={50}
              />
            </Column>
          </TabPanel>
          <TabPanel id="properties">
            <EventProperties websiteId={websiteId} />
          </TabPanel>
        </Tabs>
      </Panel>
    </Column>
  );
}
