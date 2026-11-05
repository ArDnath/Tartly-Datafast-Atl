'use client';
import { Column, Grid } from '@talivia/react-zen';
import { LinkControls } from '@/features/legacy/links/[linkId]/LinkControls';
import { LinkHeader } from '@/features/legacy/links/[linkId]/LinkHeader';
import { LinkMetricsBar } from '@/features/legacy/links/[linkId]/LinkMetricsBar';
import { LinkPanels } from '@/features/legacy/links/[linkId]/LinkPanels';
import { LinkProvider } from '@/features/legacy/links/LinkProvider';
import { AnalyticsOverlayProvider } from '@/features/websites/workbench/AnalyticsOverlayProvider';
import { WebsiteChart } from '@/features/websites/workbench/WebsiteChart';
import { PageBody } from '@/components/common/PageBody';
import { Panel } from '@/components/common/Panel';
import { useAnalyticsOverlays } from '@/components/overlays/AnalyticsOverlayContext';

const excludedIds = ['path', 'entry', 'exit', 'title', 'language', 'screen', 'event'];

export function LinkPage({
  linkId,
  showHeaderActions = true,
}: {
  linkId: string;
  showHeaderActions?: boolean;
}) {
  return (
    <LinkProvider linkId={linkId}>
      <AnalyticsOverlayProvider resourceId={linkId}>
        <LinkPageContent linkId={linkId} showHeaderActions={showHeaderActions} />
      </AnalyticsOverlayProvider>
    </LinkProvider>
  );
}

function LinkPageContent({
  linkId,
  showHeaderActions,
}: {
  linkId: string;
  showHeaderActions: boolean;
}) {
  const { openBreakdown } = useAnalyticsOverlays();

  return (
    <Grid width="100%" height="100%">
      <Column margin="2">
        <PageBody gap>
          <LinkHeader showActions={showHeaderActions} />
          <LinkControls linkId={linkId} />
          <LinkMetricsBar linkId={linkId} showChange={true} />
          <Panel>
            <WebsiteChart websiteId={linkId} />
          </Panel>
          <LinkPanels linkId={linkId} onOpen={view => openBreakdown(view, excludedIds)} />
        </PageBody>
      </Column>
    </Grid>
  );
}
