'use client';
import { Column } from '@talivia/react-zen';
import { endOfMonth, startOfMonth } from 'date-fns';
import { WebsiteControls } from '@/features/analytics/workbench/WebsiteControls';
import { useDateRange } from '@/components/hooks';
import { Retention } from './Retention';

export function RetentionPage({ websiteId }: { websiteId: string }) {
  const {
    dateRange: { startDate },
  } = useDateRange();

  const monthStartDate = startOfMonth(startDate);
  const monthEndDate = endOfMonth(startDate);

  return (
    <Column gap>
      <WebsiteControls
        websiteId={websiteId}
        allowFilter={false}
        allowDateFilter={false}
        allowMonthFilter
      />
      <Retention websiteId={websiteId} startDate={monthStartDate} endDate={monthEndDate} />
    </Column>
  );
}
