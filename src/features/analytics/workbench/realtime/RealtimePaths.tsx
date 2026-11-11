import { firstBy } from 'thenby';
import { useMessages } from '@/components/hooks';
import { ListTable } from '@/features/analytics/components/metrics/ListTable';
import { useWebsite } from '@/features/websites/hooks/useWebsite';
import { percentFilter } from '@/features/analytics/lib/filters';

export function RealtimePaths({ data }: { data: any }) {
  const website = useWebsite();
  const { t, labels } = useMessages();
  const { urls } = data || {};
  const limit = 15;

  const renderLink = ({ label: x }) => {
    const domain = x.startsWith('/') ? website?.domain : '';
    return (
      <a href={`//${domain}${x}`} target="_blank" rel="noreferrer noopener">
        {x}
      </a>
    );
  };

  const pages = percentFilter(
    Object.keys(urls)
      .map(key => {
        return {
          x: key,
          y: urls[key],
        };
      })
      .sort(firstBy('y', -1))
      .slice(0, limit),
  );

  return (
    <ListTable
      title={t(labels.pages)}
      metric={t(labels.views)}
      renderLabel={renderLink}
      data={pages.map(({ x, y, z }: { x: string; y: number; z: number }) => ({
        label: x,
        count: y,
        percent: z,
      }))}
    />
  );
}
