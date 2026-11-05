import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function usePixelsQuery(params?: Record<string, any>, options?: ReactQueryOptions) {
  const { modified } = useModified('pixels');
  const { get } = useApi();
  const pageParams = { page: params?.page ?? 1, search: params?.search ?? '' };

  return usePagedQuery({
    queryKey: ['pixels', { modified, ...params }],
    pageParams,
    queryFn: pageParams => {
      return get('/pixels', {
        ...pageParams,
        ...params,
      });
    },
    ...options,
  });
}
