'use client';
import { Column, Tab, TabList, TabPanel, Tabs } from '@talivia/react-zen';
import type { Key } from 'react';
import { Panel } from '@/components/common/Panel';
import { useMessages, useStoredState } from '@/components/hooks';
import { useAnalyticsOverlays } from '@/features/analytics/components/AnalyticsOverlayContext';
import { ReplaysDataTable } from './ReplaysDataTable';
import { SavedReplaysDataTable } from './SavedReplaysDataTable';

const KEY_NAME = 'talivia.replays.tab';

export function ReplaysPage({ websiteId }: { websiteId: string }) {
  const [tab, setTab] = useStoredState(KEY_NAME, 'replays');
  const { openReplay } = useAnalyticsOverlays();
  const { t, labels } = useMessages();

  const handleSelect = (value: Key) => {
    setTab(value.toString());
  };

  return (
    <Column gap="3">
      <Panel>
        <Tabs selectedKey={tab} onSelectionChange={handleSelect}>
          <TabList>
            <Tab id="replays">{t(labels.replays)}</Tab>
            <Tab id="saved">{t(labels.saved)}</Tab>
          </TabList>
          <TabPanel id="replays">
            <ReplaysDataTable websiteId={websiteId} onReplayOpen={openReplay} />
          </TabPanel>
          <TabPanel id="saved">
            <SavedReplaysDataTable websiteId={websiteId} onReplayOpen={openReplay} />
          </TabPanel>
        </Tabs>
      </Panel>
    </Column>
  );
}
