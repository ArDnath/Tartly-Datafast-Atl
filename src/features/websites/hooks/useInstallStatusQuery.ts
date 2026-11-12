'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import type { WebsiteInstallStatus } from '../server/queries/installStatus';

interface InstallStatusResponse {
  data: WebsiteInstallStatus[];
}

/**
 * Polls only while a website in the active workspace still has no event. Once
 * every site is connected the interval stops, so a healthy workspace makes no
 * background requests.
 */
export function useInstallStatusQuery(workspaceId: string | null | undefined) {
  const { get } = useApi();

  return useQuery({
    queryKey: ['website-install-status', workspaceId],
    enabled: Boolean(workspaceId),
    staleTime: 20_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: query => {
      const response = query.state.data as InstallStatusResponse | undefined;

      return response?.data.some(website => !website.connected) ? 30_000 : false;
    },
    queryFn: () =>
      get('/websites/install-status', {
        workspaceId,
      }) as Promise<InstallStatusResponse>,
  });
}
