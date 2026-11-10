'use client';
import { Column } from '@talivia/react-zen';
import { WebsiteChart } from '@/features/analytics/workbench/WebsiteChart';
import { WebsiteMetricsBar } from '@/features/analytics/workbench/WebsiteMetricsBar';
import { Panel } from '@/components/common/Panel';
import { CompareTables } from './CompareTables';

export function ComparePage({ websiteId }: { websiteId: string }) {
  return (
    <Column gap>
      <WebsiteMetricsBar websiteId={websiteId} compareMode={true} showChange={true} />
      <Panel minHeight="520px">
        <WebsiteChart websiteId={websiteId} compareMode={true} />
      </Panel>
      <CompareTables websiteId={websiteId} />
    </Column>
  );
}
