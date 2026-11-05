import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';
import type { ReactQueryOptions } from '@/lib/types';

export function useBoardQuery(boardId: string, options?: ReactQueryOptions) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`board:${boardId}`);

  return useQuery({
    queryKey: ['boards', { boardId, modified }],
    queryFn: () => get(`/boards/${boardId}`),
    enabled: !!boardId && boardId !== 'create',
    placeholderData: keepPreviousData,
    ...options,
  });
}
