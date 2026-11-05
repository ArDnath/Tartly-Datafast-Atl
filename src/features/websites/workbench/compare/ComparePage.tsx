'use client';
import { Column } from '@talivia/react-zen';
import { WebsiteChart } from '@/features/websites/workbench/WebsiteChart';
import { WebsiteControls } from '@/features/websites/workbench/WebsiteControls';
import { WebsiteMetricsBar } from '@/features/websites/workbench/WebsiteMetricsBar';
import { Panel } from '@/components/common/Panel';
import { CompareTables } from './CompareTables';

export function ComparePage({ websiteId }: { websiteId: string }) {
  return (
    <Column gap>
      <WebsiteControls websiteId={websiteId} allowCompare={true} />
      <WebsiteMetricsBar websiteId={websiteId} compareMode={true} showChange={true} />
      <Panel minHeight="520px">
        <WebsiteChart websiteId={websiteId} compareMode={true} />
      </Panel>
      <CompareTables websiteId={websiteId} />
    </Column>
  );
}
