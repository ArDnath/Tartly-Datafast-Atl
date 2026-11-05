'use client';
import { Column, Grid } from '@talivia/react-zen';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { WebsiteProvider } from '@/app/(main)/websites/WebsiteProvider';
import { PageBody } from '@/components/common/PageBody';
import { LAST_WEBSITE_CONFIG, WEBSITE_LAYOUT_MAX_WIDTH } from '@/lib/constants';
import { setItem } from '@/lib/storage';
import { AnalyticsOverlayProvider } from './AnalyticsOverlayProvider';
import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteSectionNav, WebsiteSectionTabs } from './WebsiteSectionNav';

export function WebsiteLayout({ websiteId, children }: { websiteId: string; children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.endsWith('/settings');

  useEffect(() => {
    setItem(LAST_WEBSITE_CONFIG, websiteId);
  }, [websiteId]);

  return (
    <WebsiteProvider websiteId={websiteId}>
      <AnalyticsOverlayProvider resourceId={websiteId}>
        <PageBody gap maxWidth={WEBSITE_LAYOUT_MAX_WIDTH}>
          <WebsiteHeader showActions />
          {isSettings ? (
            <Column minWidth="0">{children}</Column>
          ) : (
            <Column gap="3" minWidth="0">
              <WebsiteSectionTabs websiteId={websiteId} />
              <Grid
                columns={{ base: '1fr', lg: '216px minmax(0, 1fr)' }}
                gap={{ base: '3', lg: '6' }}
                alignItems="start"
              >
                <WebsiteSectionNav websiteId={websiteId} />
                <Column minWidth="0">{children}</Column>
              </Grid>
            </Column>
          )}
        </PageBody>
      </AnalyticsOverlayProvider>
    </WebsiteProvider>
  );
}
