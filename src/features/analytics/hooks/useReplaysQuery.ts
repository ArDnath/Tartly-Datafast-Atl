import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';

export function useReplaysQuery(websiteId: string, params?: Record<string, string | number>) {
  const { get } = useApi();
  const { modified } = useModified('replays');
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return usePagedQuery({
    queryKey: [
      'replays',
      { websiteId, modified, startAt, endAt, unit, timezone, ...filters, ...params },
    ],
    pageParams: { page: params?.page ?? 1, search: params?.search ?? '' },
    queryFn: pageParams => {
      return get(`/websites/${websiteId}/replays`, {
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
    placeholderData: keepPreviousData,
  });
}
