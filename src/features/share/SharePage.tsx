'use client';
import { Column } from '@talivia/react-zen';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { PageBody } from '@/components/common/PageBody';
import { LinkPage } from '@/features/legacy/links/[linkId]/LinkPage';
import { PixelPage } from '@/features/legacy/pixels/[pixelId]/PixelPage';
import { useShare } from '@/features/share/hooks/useShare';
import { WebsiteProvider } from '@/features/websites/WebsiteProvider';
import { AnalyticsOverlayProvider } from '@/features/analytics/workbench/AnalyticsOverlayProvider';
import { ComparePage } from '@/features/analytics/workbench/compare/ComparePage';
import { EventsPage } from '@/features/analytics/workbench/events/EventsPage';
import { RealtimePage } from '@/features/analytics/workbench/realtime/RealtimePage';
import { AttributionPage } from '@/features/analytics/workbench/reports/attribution/AttributionPage';
import { BreakdownPage } from '@/features/analytics/workbench/reports/breakdown/BreakdownPage';
import { FunnelsPage } from '@/features/analytics/workbench/reports/funnels/FunnelsPage';
import { GoalsPage } from '@/features/analytics/workbench/reports/goals/GoalsPage';
import { JourneysPage } from '@/features/analytics/workbench/reports/journeys/JourneysPage';
import { PerformancePage } from '@/features/analytics/workbench/reports/performance/PerformancePage';
import { RetentionPage } from '@/features/analytics/workbench/reports/retention/RetentionPage';
import { RevenuePage } from '@/features/analytics/workbench/reports/revenue/RevenuePage';
import { UTMPage } from '@/features/analytics/workbench/reports/utm/UTMPage';
import { SessionsPage } from '@/features/analytics/workbench/sessions/SessionsPage';
import { WebsiteHeader } from '@/features/analytics/workbench/WebsiteHeader';
import { WebsitePage } from '@/features/analytics/workbench/WebsitePage';
import { ENTITY_TYPE } from '@/lib/constants';
import { getAllowedShareSections, isShareSectionId } from '@/lib/share-sections';
import { ShareFooter } from './ShareFooter';

const PAGE_COMPONENTS: Record<string, React.ComponentType<{ websiteId: string }>> = {
  '': WebsitePage,
  overview: WebsitePage,
  events: EventsPage,
  sessions: SessionsPage,
  realtime: RealtimePage,
  performance: PerformancePage,
  compare: ComparePage,
  breakdown: BreakdownPage,
  goals: GoalsPage,
  funnels: FunnelsPage,
  journeys: JourneysPage,
  retention: RetentionPage,
  utm: UTMPage,
  revenue: RevenuePage,
  attribution: AttributionPage,
};

function getSharePath(pathname: string) {
  const segments = pathname.split('/');
  const firstSegment = segments[3];

  // If first segment looks like a domain name, skip it
  if (firstSegment?.includes('.')) {
    return segments[4];
  }

  return firstSegment;
}

export function SharePage() {
  const share = useShare();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = getSharePath(pathname);
  const isEmbed = searchParams.get('embed') === '1';
  const { slug, websiteId, pixelId, linkId, parameters = {}, shareType } = share;

  // Check if the requested path is allowed
  const pageKey = path || 'overview';
  const isAllowed =
    isShareSectionId(pageKey) && getAllowedShareSections(parameters).includes(pageKey);

  const entityPage =
    shareType === ENTITY_TYPE.pixel && pixelId ? (
      <PixelPage pixelId={pixelId} showHeaderActions={false} />
    ) : shareType === ENTITY_TYPE.link && linkId ? (
      <LinkPage linkId={linkId} showHeaderActions={false} />
    ) : null;

  useEffect(() => {
    if (!isAllowed) {
      router.replace(`/share/${slug}`);
    }
  }, [isAllowed, slug, router]);

  if (entityPage) {
    return (
      <Column>
        {entityPage}
        {!isEmbed && <ShareFooter />}
      </Column>
    );
  }

  if (!isAllowed) {
    return null;
  }

  const PageComponent = PAGE_COMPONENTS[pageKey] || WebsitePage;
  const getSessionHref = (sessionId: string) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('session', sessionId);

    return `${pathname}?${query.toString()}`;
  };
  const websitePage = (
    <div data-talivia-share-embed={isEmbed ? 'true' : undefined}>
      <PageBody maxWidth={isEmbed ? '1440px' : undefined}>
        <Column gap className={isEmbed ? 'talivia-share-embed-content' : undefined}>
          <WebsiteProvider websiteId={websiteId}>
            <AnalyticsOverlayProvider resourceId={websiteId} getSessionHref={getSessionHref}>
              <WebsiteHeader showActions={false} allowLink={false} readOnly />
              <Column>
                <PageComponent websiteId={websiteId} />
              </Column>
            </AnalyticsOverlayProvider>
          </WebsiteProvider>
        </Column>
      </PageBody>
    </div>
  );

  return websitePage;
}
