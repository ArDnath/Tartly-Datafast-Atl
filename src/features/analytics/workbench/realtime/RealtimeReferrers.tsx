import thenby from 'thenby';
import { useMessages } from '@/components/hooks';
import { ListTable } from '@/features/analytics/components/metrics/ListTable';
import { useWebsite } from '@/features/websites/hooks/useWebsite';
import { percentFilter } from '@/features/analytics/lib/filters';

export function RealtimeReferrers({ data }: { data: any }) {
  const website = useWebsite();
  const { t, labels } = useMessages();
  const { referrers } = data || {};
  const limit = 15;

  const renderLink = ({ label: x }) => {
    const domain = x.startsWith('/') ? website?.domain : '';
    return (
      <a href={`//${domain}${x}`} target="_blank" rel="noreferrer noopener">
        {x}
      </a>
    );
  };

  const domains = percentFilter(
    Object.keys(referrers)
      .map(key => {
        return {
          x: key,
          y: referrers[key],
        };
      })
      .sort(thenby.firstBy('y', -1))
      .slice(0, limit),
  );

  return (
    <ListTable
      title={t(labels.referrers)}
      metric={t(labels.views)}
      renderLabel={renderLink}
      data={domains.map(({ x, y, z }: { x: string; y: number; z: number }) => ({
        label: x,
        count: y,
        percent: z,
      }))}
    />
  );
}
