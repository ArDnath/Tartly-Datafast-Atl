import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import type { ReactQueryOptions } from '@/lib/types';

export function useEventDataValuesQuery(
  websiteId: string,
  event: string,
  propertyName: string,
  options?: ReactQueryOptions,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<any>({
    queryKey: [
      'websites:event-data:values',
      { websiteId, startAt, endAt, unit, timezone, ...filters, event, propertyName },
    ],
    queryFn: () =>
      get(`/websites/${websiteId}/event-data/values`, {
        startAt,
        endAt,
        unit,
        timezone,
        ...filters,
        event,
        propertyName,
      }),
    enabled: !!(websiteId && propertyName),
    ...options,
  });
}
