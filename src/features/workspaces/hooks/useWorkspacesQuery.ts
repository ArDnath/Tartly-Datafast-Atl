'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  planId: string | null;
  subscriptionStatus: string;
  createdAt?: string;
  onboardingCompletedAt?: string | null;
}

export interface WorkspaceMembershipSummary {
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  workspace: WorkspaceSummary;
}

export function useWorkspacesQuery() {
  const { get } = useApi();

  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const items = (await get('/workspaces')) as WorkspaceMembershipSummary[];

      return items.map(item => ({ ...item.workspace, role: item.role }));
    },
  });
}
