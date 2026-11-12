'use client';

import { Column, Label, Text } from '@talivia/react-zen';
import { useMessages } from '@/components/hooks';
import { InstallExperience } from '@/features/websites/components/InstallExperience';
import { useWebsiteAttributionSettingsQuery } from '@/features/websites/hooks/useWebsiteAttributionSettingsQuery';
import { useWebsiteQuery } from '@/features/websites/hooks/useWebsiteQuery';
import { normalizeWebsiteDomainInput } from '@/features/websites/lib/website-domain';
import { BRAND } from '@/lib/brand';

export function WebsiteTrackingCode({
  websiteId,
  hostUrl,
}: {
  websiteId: string;
  hostUrl?: string;
}) {
  const { t, messages, labels } = useMessages();
  const { data: website } = useWebsiteQuery(websiteId);
  const { data: attribution } = useWebsiteAttributionSettingsQuery(websiteId);

  const primaryDomain = normalizeWebsiteDomainInput(website?.domain);
  const ownedDomains = [
    ...new Set(
      [primaryDomain, ...(attribution?.domains || []).map(item => item.hostname)].filter(Boolean),
    ),
  ];
  const hasCrossRootDomain = Boolean(
    primaryDomain &&
      ownedDomains.some(
        domain => domain !== primaryDomain && !domain.endsWith(`.${primaryDomain}`),
      ),
  );
  const crossDomainDomains =
    attribution?.enableCrossDomainTracking && hasCrossRootDomain ? ownedDomains : undefined;
  const origin = hostUrl || (typeof window !== 'undefined' ? window.location.origin : BRAND.url);

  return (
    <Column gap>
      <Label>{t(labels.trackingCode)}</Label>
      <Text color="muted">{t(messages.trackingCode)}</Text>
      <InstallExperience
        websiteId={websiteId}
        domain={primaryDomain || website?.domain || undefined}
        hostUrl={origin}
        variant="settings"
        crossDomainDomains={crossDomainDomains}
      />
    </Column>
  );
}
