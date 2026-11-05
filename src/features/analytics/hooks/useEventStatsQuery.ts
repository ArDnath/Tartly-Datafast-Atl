import type { UseQueryOptions } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';

export interface EventStatsData {
  events: number;
  visitors: number;
  visits: number;
  uniqueEvents: number;
  comparison: {
    events: number;
    visitors: number;
    visits: number;
    uniqueEvents: number;
  };
}

type EventStatsApiResponse = {
  data: EventStatsData;
};

export function useEventStatsQuery(
  { websiteId }: { websiteId: string },
  options?: UseQueryOptions<EventStatsApiResponse, Error, EventStatsData>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<EventStatsApiResponse, Error, EventStatsData>({
    queryKey: ['websites:events:stats', { websiteId, startAt, endAt, ...filters }],
    queryFn: () =>
      get(`/websites/${websiteId}/events/stats`, {
        startAt,
        endAt,
        ...filters,
      }),
    select: response => response.data,
    enabled: !!websiteId,
    placeholderData: keepPreviousData,
    ...options,
  });
}
