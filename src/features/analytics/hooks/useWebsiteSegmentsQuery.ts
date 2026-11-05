import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function useWebsiteSegmentsQuery(
  websiteId: string,
  params?: Record<string, string | number>,
  options?: ReactQueryOptions,
) {
  const { get } = useApi();
  const { modified } = useModified(`segments`);
  const pageParams = { page: params?.page ?? 1, search: params?.search ?? '' };

  return usePagedQuery({
    queryKey: ['website:segments', { websiteId, modified, ...params }],
    pageParams,
    queryFn: pageParams => get(`/websites/${websiteId}/segments`, { ...pageParams, ...params }),
    enabled: !!websiteId,
    placeholderData: keepPreviousData,
    ...options,
  });
}
