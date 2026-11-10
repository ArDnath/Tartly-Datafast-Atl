'use client';
import { Column } from '@talivia/react-zen';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { PageBody } from '@/components/common/PageBody';
import { WebsiteProvider } from '@/features/websites/WebsiteProvider';
import { LAST_WEBSITE_CONFIG, WEBSITE_LAYOUT_MAX_WIDTH } from '@/lib/constants';
import { setItem } from '@/lib/storage';
import { AnalyticsOverlayProvider } from './AnalyticsOverlayProvider';
import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteSectionNav } from './WebsiteSectionNav';

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
            <Column gap="3" minWidth="0" className="site-workbench">
              <WebsiteSectionNav websiteId={websiteId} />
              <Column minWidth="0">{children}</Column>
            </Column>
          )}
        </PageBody>
      </AnalyticsOverlayProvider>
    </WebsiteProvider>
  );
}
