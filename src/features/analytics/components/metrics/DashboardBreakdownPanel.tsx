'use client';

import { Button, Icon, Row, Tab, TabList, TabPanel, Tabs } from '@talivia/react-zen';
import { useState } from 'react';
import { Panel } from '@/components/common/Panel';
import { useMessages } from '@/components/hooks';
import { Sort as ArrowUpDown, Maximize } from '@/components/icons';
import { DualMetricTable } from '@/features/analytics/components/metrics/DualMetricTable';

export interface DashboardBreakdownTab {
  id: string;
  label: string;
  type: string;
}

/**
 * The four quiet breakdown cards under the hero chart. They mirror the
 * DataFast dashboard: one tab row, one sort control, and rows that grow only
 * as far as the data needs.
 */
export function DashboardBreakdownPanel({
  websiteId,
  tabs,
  onOpen,
  defaultSort = 'visitors',
}: {
  websiteId: string;
  tabs: DashboardBreakdownTab[];
  onOpen: (view: string) => void;
  defaultSort?: 'visitors' | 'revenue';
}) {
  const { t, labels } = useMessages();
  const [sort, setSort] = useState<'visitors' | 'revenue'>(defaultSort);
  const [selectedTab, setSelectedTab] = useState(tabs[0]?.id || '');

  const activeTab = tabs.find(tab => tab.id === selectedTab) || tabs[0];

  const handleSort = () => {
    setSort(value => (value === 'visitors' ? 'revenue' : 'visitors'));
  };

  const handleViewAll = () => {
    if (activeTab) {
      onOpen(activeTab.type);
    }
  };
  const sortTrafficLabel = activeTab?.type === 'keywords' ? 'Traffic' : t(labels.visitors);

  return (
    <Panel className="dashboard-panel" paddingX="0" paddingY="0" gap="0">
      <Tabs
        className="breakdown-tabs"
        selectedKey={selectedTab}
        onSelectionChange={key => setSelectedTab(String(key))}
      >
        <Row
          className="talivia-dashboard-panel-header"
          justifyContent="space-between"
          alignItems="center"
          gap="2"
          wrap="wrap"
          paddingX="4"
          style={{ borderBottom: '1px solid var(--talivia-card-border)' }}
        >
          <TabList className="talivia-dashboard-panel-tabs">
            {tabs.map(tab => (
              <Tab key={tab.id} id={tab.id}>
                {tab.label}
              </Tab>
            ))}
          </TabList>
          <Row className="talivia-dashboard-panel-actions" alignItems="center" gap="1">
            <Button
              className="breakdown-sort-button talivia-dashboard-sort"
              variant="quiet"
              onPress={handleSort}
              aria-label={sort === 'revenue' ? 'Revenue' : sortTrafficLabel}
              title={sort === 'revenue' ? 'Revenue' : sortTrafficLabel}
              data-sort={sort}
            >
              <Row alignItems="center" gap="1">
                <Icon size="sm">
                  <ArrowUpDown />
                </Icon>
                <span className="talivia-dashboard-sort-label">
                  {sort === 'revenue' ? 'Revenue' : sortTrafficLabel}
                </span>
              </Row>
            </Button>
            <Button
              className="breakdown-sort-button talivia-dashboard-expand"
              variant="quiet"
              onPress={handleViewAll}
              aria-label="View all"
              title="View all"
            >
              <Icon size="sm">
                <Maximize />
              </Icon>
            </Button>
          </Row>
        </Row>
        {tabs.map(tab => (
          <TabPanel key={tab.id} id={tab.id}>
            <DualMetricTable websiteId={websiteId} type={tab.type} sort={sort} />
          </TabPanel>
        ))}
      </Tabs>
    </Panel>
  );
}
