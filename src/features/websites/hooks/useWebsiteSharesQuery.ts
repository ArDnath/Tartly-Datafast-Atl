import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function useWebsiteSharesQuery(
  { websiteId }: { websiteId: string },
  options?: ReactQueryOptions,
) {
  const { modified } = useModified('shares');
  const { get } = useApi();

  return usePagedQuery({
    queryKey: ['websiteShares', { websiteId, modified }],
    pageParams: { page: 1, search: '' },
    queryFn: pageParams => {
      return get(`/websites/${websiteId}/shares`, pageParams);
    },
    ...options,
  });
}
