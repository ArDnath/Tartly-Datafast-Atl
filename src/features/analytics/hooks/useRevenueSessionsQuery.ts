import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';

export function useRevenueSessionsQuery(
  websiteId: string,
  currency: string,
  params?: Record<string, string | number>,
) {
  const { get } = useApi();
  const { modified } = useModified(`revenue-sessions`);
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return usePagedQuery({
    queryKey: [
      'revenue-sessions',
      { websiteId, currency, modified, startAt, endAt, unit, timezone, ...params, ...filters },
    ],
    pageParams: { page: params?.page ?? 1, search: params?.search ?? '' },
    queryFn: pageParams => {
      return get(`/websites/${websiteId}/revenue/sessions`, {
        currency,
        startAt,
        endAt,
        unit,
        timezone,
        ...filters,
        ...pageParams,
        ...params,
        pageSize: 20,
      });
    },
  });
}
