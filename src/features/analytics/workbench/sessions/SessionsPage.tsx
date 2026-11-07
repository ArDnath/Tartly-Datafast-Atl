'use client';
import { Column, Tab, TabList, TabPanel, Tabs } from '@talivia/react-zen';
import type { Key } from 'react';
import { Panel } from '@/components/common/Panel';
import { useMessages, useStoredState } from '@/components/hooks';
import { WebsiteControls } from '@/features/analytics/workbench/WebsiteControls';
import { SessionProperties } from './SessionProperties';
import { SessionsDataTable } from './SessionsDataTable';

const KEY_NAME = 'talivia.sessions.tab';

export function SessionsPage({ websiteId }) {
  const [tab, setTab] = useStoredState(KEY_NAME, 'activity');
  const { t, labels } = useMessages();

  const handleSelect = (value: Key) => {
    setTab(value.toString());
  };

  return (
    <Column gap="3">
      <WebsiteControls websiteId={websiteId} />
      <Panel>
        <Tabs selectedKey={tab} onSelectionChange={handleSelect}>
          <TabList>
            <Tab id="activity">{t(labels.activity)}</Tab>
            <Tab id="properties">{t(labels.properties)}</Tab>
          </TabList>
          <TabPanel id="activity">
            <SessionsDataTable websiteId={websiteId} />
          </TabPanel>
          <TabPanel id="properties">
            <SessionProperties websiteId={websiteId} />
          </TabPanel>
        </Tabs>
      </Panel>
    </Column>
  );
}
