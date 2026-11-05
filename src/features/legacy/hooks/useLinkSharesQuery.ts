import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function useLinkSharesQuery({ linkId }: { linkId: string }, options?: ReactQueryOptions) {
  const { modified } = useModified('shares');
  const { get } = useApi();

  return usePagedQuery({
    queryKey: ['linkShares', { linkId, modified }],
    pageParams: { page: 1, search: '' },
    queryFn: pageParams => {
      return get(`/links/${linkId}/shares`, pageParams);
    },
    ...options,
  });
}
