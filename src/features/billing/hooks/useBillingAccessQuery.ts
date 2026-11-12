'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/components/hooks';
import type { WorkspaceBillingAccessResponse } from '@/features/billing/lib/access';

export function useBillingAccessQuery(
  workspaceId: string | null,
  options: { refetchInterval?: number | false } = {},
) {
  const { get } = useApi();

  return useQuery({
    queryKey: ['billing-access', workspaceId],
    queryFn: () =>
      get('/billing/access', { workspaceId }) as Promise<WorkspaceBillingAccessResponse>,
    enabled: Boolean(workspaceId),
    staleTime: 15_000,
    refetchInterval: options.refetchInterval ?? 60_000,
    refetchOnWindowFocus: true,
  });
}
