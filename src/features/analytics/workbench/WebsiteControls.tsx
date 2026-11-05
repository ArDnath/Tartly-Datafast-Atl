import { Column, Grid, Row } from '@talivia/react-zen';
import { ExportButton } from '@/features/analytics/components/input/ExportButton';
import { FilterBar } from '@/features/analytics/components/input/FilterBar';
import { MonthFilter } from '@/features/analytics/components/input/MonthFilter';
import { WebsiteDateFilter } from '@/features/analytics/components/input/WebsiteDateFilter';
import { WebsiteFilterButton } from '@/features/analytics/components/input/WebsiteFilterButton';

export function WebsiteControls({
  websiteId,
  allowFilter = true,
  allowBounceFilter = false,
  allowDateFilter = true,
  allowMonthFilter,
  allowDownload = false,
  allowCompare = false,
}: {
  websiteId?: string;
  allowFilter?: boolean;
  allowBounceFilter?: boolean;
  allowDateFilter?: boolean;
  allowMonthFilter?: boolean;
  allowDownload?: boolean;
  allowCompare?: boolean;
}) {
  return (
    <Column gap>
      <Grid columns={{ base: '1fr', md: 'auto 1fr' }} gap>
        <Row alignItems="center" justifyContent="flex-start" gap="4">
          {allowFilter && (
            <WebsiteFilterButton websiteId={websiteId} allowBounceFilter={allowBounceFilter} />
          )}
        </Row>
        <Row alignItems="center" justifyContent={{ base: 'flex-start', md: 'flex-end' }}>
          {allowDateFilter && (
            <WebsiteDateFilter websiteId={websiteId} allowCompare={allowCompare} />
          )}
          {allowDownload && <ExportButton websiteId={websiteId} />}
          {allowMonthFilter && <MonthFilter />}
        </Row>
      </Grid>
      {allowFilter && <FilterBar websiteId={websiteId} />}
    </Column>
  );
}
