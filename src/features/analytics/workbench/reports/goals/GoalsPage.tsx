'use client';
import { Column, Grid } from '@talivia/react-zen';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useDateRange, useNavigation } from '@/components/hooks';
import { useReportsQuery } from '@/features/analytics/hooks/useReportsQuery';
import { Goal } from './Goal';
import { GoalAddButton } from './GoalAddButton';

export function GoalsPage({ websiteId }: { websiteId: string }) {
  const { data, isLoading, error } = useReportsQuery({ websiteId, type: 'goal' });
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const { pathname } = useNavigation();
  const isSharePage = pathname.includes('/share/');

  return (
    <Column gap>
      {!isSharePage && (
        <SectionHeader>
          <GoalAddButton websiteId={websiteId} />
        </SectionHeader>
      )}
      <LoadingPanel data={data} isLoading={isLoading} error={error}>
        {data && (
          <Grid columns={{ base: '1fr', md: '1fr 1fr' }} gap>
            {data.data.map((report: any) => (
              <Panel key={report.id}>
                <Goal {...report} startDate={startDate} endDate={endDate} />
              </Panel>
            ))}
          </Grid>
        )}
      </LoadingPanel>
    </Column>
  );
}
