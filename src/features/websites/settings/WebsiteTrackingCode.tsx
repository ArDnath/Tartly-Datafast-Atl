import { Column, Label, Text, TextField } from '@talivia/react-zen';
import { useMessages } from '@/components/hooks';
import { useWebsiteAttributionSettingsQuery } from '@/features/websites/hooks/useWebsiteAttributionSettingsQuery';
import { useWebsiteQuery } from '@/features/websites/hooks/useWebsiteQuery';
import { normalizeWebsiteDomainInput } from '@/features/websites/lib/website-domain';

const SCRIPT_NAME = 'script.js';

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

  const url = `${hostUrl || window?.location?.origin || ''}/${SCRIPT_NAME}`;

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
  const attributes = [
    `data-website-id="${websiteId}"`,
    primaryDomain && `data-domain="${primaryDomain}"`,
    attribution?.enableCrossDomainTracking &&
      hasCrossRootDomain &&
      `data-cross-domain-domains="${ownedDomains.join(',')}"`,
  ].filter(Boolean);
  const code = `<script defer src="${url}" ${attributes.join(' ')}></script>`;

  return (
    <Column gap>
      <Label>{t(labels.trackingCode)}</Label>
      <Text color="muted">{t(messages.trackingCode)}</Text>
      <TextField
        value={code}
        isReadOnly
        allowCopy
        asTextArea
        resize="none"
        className="code-textarea"
      />
    </Column>
  );
}
