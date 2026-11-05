import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function useBoardsQuery(params?: Record<string, any>, options?: ReactQueryOptions) {
  const { modified } = useModified('boards');
  const { get } = useApi();
  const pageParams = { page: params?.page ?? 1, search: params?.search ?? '' };

  return usePagedQuery({
    queryKey: ['boards', { modified, ...params }],
    pageParams,
    queryFn: pageParams => {
      return get('/boards', {
        ...pageParams,
        ...params,
      });
    },
    ...options,
  });
}
