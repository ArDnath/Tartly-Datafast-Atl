import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useMessages } from '@/components/hooks';
import { MetricCard } from '@/features/analytics/components/metrics/MetricCard';
import { MetricsBar } from '@/features/analytics/components/metrics/MetricsBar';
import { useWebsiteSessionStatsQuery } from '@/features/analytics/hooks/useWebsiteSessionStatsQuery';
import { formatLongNumber } from '@/lib/format';

export function EventsMetricsBar({ websiteId }: { websiteId: string }) {
  const { t, labels } = useMessages();
  const { data, isLoading, isFetching, error } = useWebsiteSessionStatsQuery(websiteId);

  return (
    <LoadingPanel data={data} isLoading={isLoading} isFetching={isFetching} error={error}>
      {data && (
        <MetricsBar>
          <MetricCard
            value={data?.visitors?.value}
            label={t(labels.visitors)}
            formatValue={formatLongNumber}
          />
          <MetricCard
            value={data?.visits?.value}
            label={t(labels.visits)}
            formatValue={formatLongNumber}
          />
          <MetricCard
            value={data?.pageviews?.value}
            label={t(labels.views)}
            formatValue={formatLongNumber}
          />
          <MetricCard
            value={data?.events?.value}
            label={t(labels.events)}
            formatValue={formatLongNumber}
          />
        </MetricsBar>
      )}
    </LoadingPanel>
  );
}
