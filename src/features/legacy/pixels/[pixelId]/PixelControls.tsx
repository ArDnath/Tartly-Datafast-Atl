import { Column, Row } from '@talivia/react-zen';
import { ExportButton } from '@/features/analytics/components/input/ExportButton';
import { FilterBar } from '@/features/analytics/components/input/FilterBar';
import { MonthFilter } from '@/features/analytics/components/input/MonthFilter';
import { WebsiteDateFilter } from '@/features/analytics/components/input/WebsiteDateFilter';
import { WebsiteFilterButton } from '@/features/analytics/components/input/WebsiteFilterButton';

export function PixelControls({
  pixelId: websiteId,
  allowFilter = true,
  allowDateFilter = true,
  allowMonthFilter,
  allowDownload = false,
}: {
  pixelId: string;
  allowFilter?: boolean;
  allowDateFilter?: boolean;
  allowMonthFilter?: boolean;
  allowDownload?: boolean;
}) {
  return (
    <Column gap>
      <Row alignItems="center" justifyContent="space-between" gap="3">
        {allowFilter ? <WebsiteFilterButton websiteId={websiteId} /> : <div />}
        {allowDateFilter && <WebsiteDateFilter websiteId={websiteId} showAllTime={false} />}
        {allowDownload && <ExportButton websiteId={websiteId} />}
        {allowMonthFilter && <MonthFilter />}
      </Row>
      {allowFilter && <FilterBar websiteId={websiteId} />}
    </Column>
  );
}
