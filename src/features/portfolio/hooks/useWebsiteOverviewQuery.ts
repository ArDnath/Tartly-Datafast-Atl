import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import type { ReactQueryOptions } from '@/lib/types';

export function useWebsiteOverviewQuery(params?: Record<string, any>, options?: ReactQueryOptions) {
  const { get } = useApi();
  const { modified } = useModified('websites');
  const { workspaceId } = useActiveWorkspace();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const queryParams = {
    startAt,
    endAt,
    unit,
    timezone,
    ...(workspaceId ? { workspaceId } : {}),
    ...params,
  };

  return usePagedQuery({
    queryKey: ['website-overview', { modified, ...queryParams }],
    pageParams: { page: 1, search: '' },
    queryFn: pageParams => {
      return get('/me/websites/overview', {
        ...pageParams,
        ...queryParams,
      });
    },
    placeholderData: keepPreviousData,
    ...options,
  });
}
