import { useApi } from '@/components/hooks/useApi';
import { useTimezone } from '@/components/hooks/useTimezone';

export function useWebsiteSessionQuery(websiteId: string, sessionId: string | undefined) {
  const { get, useQuery } = useApi();
  const { timezone, canonicalizeTimezone } = useTimezone();
  const canonicalTimezone = canonicalizeTimezone(timezone);

  return useQuery({
    queryKey: ['session', { websiteId, sessionId, timezone: canonicalTimezone }],
    queryFn: () => {
      return get(`/websites/${websiteId}/sessions/${sessionId}`, {
        timezone: canonicalTimezone,
      });
    },
    enabled: Boolean(websiteId && sessionId),
  });
}
