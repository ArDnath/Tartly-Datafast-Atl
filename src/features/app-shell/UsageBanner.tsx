'use client';

import { Row, Text } from '@talivia/react-zen';
import { useQuery } from '@tanstack/react-query';
import Link from '@/components/common/Link';
import { useApi, useNavigation } from '@/components/hooks';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import type { UsageMeter } from '@/lib/usage';

interface UsageResponse {
  events: UsageMeter;
  replays: UsageMeter;
}

const ORDER: Record<UsageMeter['status'], number> = {
  ok: 0,
  warning: 1,
  grace: 2,
  limit: 3,
};

/**
 * In-app 80%/100% notice. The collector pauses independently; this banner only
 * explains why and links to the plan page.
 */
export function UsageBanner() {
  const { get } = useApi();
  const { renderUrl } = useNavigation();
  const { workspaceId } = useActiveWorkspace();

  const { data } = useQuery({
    queryKey: ['workspace-usage-banner', workspaceId],
    queryFn: () => get(`/workspaces/${workspaceId}/usage`) as Promise<UsageResponse>,
    enabled: Boolean(workspaceId),
    refetchInterval: 5 * 60 * 1000,
  });

  if (!data) {
    return null;
  }

  const meters = [
    { key: 'events', label: 'events', meter: data.events },
    { key: 'replays', label: 'replay sessions', meter: data.replays },
  ].filter(item => item.meter.included && item.meter.status !== 'ok');

  if (!meters.length) {
    return null;
  }

  meters.sort((a, b) => ORDER[b.meter.status] - ORDER[a.meter.status]);
  const worst = meters[0];
  const isPaused = worst.meter.status === 'limit';
  const color = isPaused ? '#ff6b6b' : '#f2b4cb';

  return (
    <Row
      justifyContent="center"
      paddingX={{ base: '3', md: '6' }}
      paddingY="2"
      style={{
        background: isPaused ? 'rgba(255, 107, 107, 0.1)' : 'rgba(242, 180, 203, 0.08)',
        borderBottom: `1px solid ${isPaused ? 'rgba(255, 107, 107, 0.3)' : 'rgba(242, 180, 203, 0.22)'}`,
      }}
    >
      <Row alignItems="center" gap="2" maxWidth="1080px" width="100%" wrap="wrap">
        <Text size="sm" style={{ color }}>
          {isPaused
            ? `Billable ${worst.label} ingestion is paused. Your dashboard is still available.`
            : `${worst.meter.percent.toFixed(0)}% of this month's ${worst.label} used` +
              (worst.meter.status === 'grace' ? ' — grace period active.' : '.')}
        </Text>
        <Link
          href={renderUrl('/app/settings/billing', false)}
          style={{ color, fontSize: 12, fontWeight: 600, marginLeft: 'auto' }}
        >
          View plan and usage
        </Link>
      </Row>
    </Row>
  );
}
