import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import type { ReactQueryOptions } from '@/lib/types';

export function useWebsiteSegmentQuery(
  websiteId: string,
  segmentId: string,
  options?: ReactQueryOptions,
) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`segments`);

  return useQuery({
    queryKey: ['website:segments', { websiteId, segmentId, modified }],
    queryFn: () => get(`/websites/${websiteId}/segments/${segmentId}`),
    enabled: !!(websiteId && segmentId),
    placeholderData: keepPreviousData,
    ...options,
  });
}
