import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function useUserWebsitesQuery(
  { userId }: { userId?: string },
  params?: Record<string, any>,
  options?: ReactQueryOptions,
) {
  const { get } = useApi();
  const { modified } = useModified(`websites`);
  const pageParams = { page: params?.page ?? 1, search: params?.search ?? '' };

  return usePagedQuery({
    queryKey: ['websites', { userId, modified, ...params }],
    pageParams,
    queryFn: pageParams => {
      return get(userId ? `/users/${userId}/websites` : '/me/websites', {
        ...pageParams,
        ...params,
      });
    },
    ...options,
  });
}
