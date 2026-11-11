'use client';
import { Column } from '@talivia/react-zen';
import { useDateRange } from '@/components/hooks';
import { UTM } from './UTM';

export function UTMPage({ websiteId }: { websiteId: string }) {
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();

  return (
    <Column gap>
      <UTM websiteId={websiteId} startDate={startDate} endDate={endDate} />
    </Column>
  );
}
