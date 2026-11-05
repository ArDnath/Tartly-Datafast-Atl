import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import { useModified } from '@/components/hooks/useModified';

export function useWeeklyTrafficQuery(websiteId: string, params?: Record<string, string | number>) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`sessions`);
  const { startAt, endAt, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery({
    queryKey: [
      'sessions',
      { websiteId, modified, startAt, endAt, timezone, ...params, ...filters },
    ],
    queryFn: () => {
      return get(`/websites/${websiteId}/sessions/weekly`, {
        startAt,
        endAt,
        timezone,
        ...params,
        ...filters,
      });
    },
  });
}
