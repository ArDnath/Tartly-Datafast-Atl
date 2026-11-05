import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import { usePagedQuery } from '@/components/hooks/usePagedQuery';
import type { ReactQueryOptions } from '@/lib/types';

export function useReportsQuery(
  { websiteId, type }: { websiteId: string; type?: string },
  options?: ReactQueryOptions,
) {
  const { modified } = useModified(`reports:${type}`);
  const { get } = useApi();

  return usePagedQuery({
    queryKey: ['reports', { websiteId, type, modified }],
    pageParams: { page: 1, search: '' },
    queryFn: async pageParams => get('/reports', { websiteId, type, ...pageParams }),
    enabled: !!websiteId && !!type,
    ...options,
  });
}
