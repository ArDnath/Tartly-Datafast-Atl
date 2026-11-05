'use client';
import { Column } from '@talivia/react-zen';
import { WebsiteControls } from '@/features/websites/workbench/WebsiteControls';
import { Panel } from '@/components/common/Panel';
import { SegmentsDataTable } from './SegmentsDataTable';

export function SegmentsPage({ websiteId }) {
  return (
    <Column gap="3">
      <WebsiteControls websiteId={websiteId} allowFilter={false} allowDateFilter={false} />
      <Panel>
        <SegmentsDataTable websiteId={websiteId} />
      </Panel>
    </Column>
  );
}
