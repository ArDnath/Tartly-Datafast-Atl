'use client';
import { Column } from '@talivia/react-zen';
import { Panel } from '@/components/common/Panel';
import { CohortsDataTable } from './CohortsDataTable';

export function CohortsPage({ websiteId }) {
  return (
    <Column gap="3">
      <Panel>
        <CohortsDataTable websiteId={websiteId} />
      </Panel>
    </Column>
  );
}
