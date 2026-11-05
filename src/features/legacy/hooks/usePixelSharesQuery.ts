import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function usePixelSharesQuery({ pixelId }: { pixelId: string }, options?: ReactQueryOptions) {
  const { modified } = useModified('shares');
  const { get } = useApi();

  return usePagedQuery({
    queryKey: ['pixelShares', { pixelId, modified }],
    pageParams: { page: 1, search: '' },
    queryFn: pageParams => {
      return get(`/pixels/${pixelId}/shares`, pageParams);
    },
    ...options,
  });
}
