'use client';
import { Column, Grid } from '@talivia/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { Panel } from '@/components/common/Panel';
import { useAnalyticsOverlays } from '@/features/analytics/components/AnalyticsOverlayContext';
import { PixelControls } from '@/features/legacy/pixels/[pixelId]/PixelControls';
import { PixelHeader } from '@/features/legacy/pixels/[pixelId]/PixelHeader';
import { PixelMetricsBar } from '@/features/legacy/pixels/[pixelId]/PixelMetricsBar';
import { PixelPanels } from '@/features/legacy/pixels/[pixelId]/PixelPanels';
import { PixelProvider } from '@/features/legacy/pixels/PixelProvider';
import { AnalyticsOverlayProvider } from '@/features/websites/workbench/AnalyticsOverlayProvider';
import { WebsiteChart } from '@/features/websites/workbench/WebsiteChart';

const excludedIds = ['path', 'entry', 'exit', 'title', 'language', 'screen', 'event'];

export function PixelPage({
  pixelId,
  showHeaderActions = true,
}: {
  pixelId: string;
  showHeaderActions?: boolean;
}) {
  return (
    <PixelProvider pixelId={pixelId}>
      <AnalyticsOverlayProvider resourceId={pixelId}>
        <PixelPageContent pixelId={pixelId} showHeaderActions={showHeaderActions} />
      </AnalyticsOverlayProvider>
    </PixelProvider>
  );
}

function PixelPageContent({
  pixelId,
  showHeaderActions,
}: {
  pixelId: string;
  showHeaderActions: boolean;
}) {
  const { openBreakdown } = useAnalyticsOverlays();

  return (
    <Grid width="100%" height="100%">
      <Column margin="2">
        <PageBody gap>
          <PixelHeader showActions={showHeaderActions} />
          <PixelControls pixelId={pixelId} />
          <PixelMetricsBar pixelId={pixelId} showChange={true} />
          <Panel>
            <WebsiteChart websiteId={pixelId} />
          </Panel>
          <PixelPanels pixelId={pixelId} onOpen={view => openBreakdown(view, excludedIds)} />
        </PageBody>
      </Column>
    </Grid>
  );
}
