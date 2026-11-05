import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import type { ReactQueryOptions } from '@/lib/types';

export function useWebsiteEventsSeriesQuery(
  websiteId: string,
  params?: { limit?: number },
  options?: ReactQueryOptions,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery({
    queryKey: [
      'websites:events:series',
      { websiteId, startAt, endAt, unit, timezone, ...filters, ...params },
    ],
    queryFn: () =>
      get(`/websites/${websiteId}/events/series`, {
        startAt,
        endAt,
        unit,
        timezone,
        ...filters,
        ...params,
      }),
    enabled: !!websiteId,
    placeholderData: keepPreviousData,
    ...options,
  });
}
