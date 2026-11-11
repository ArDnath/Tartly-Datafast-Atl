import { Column, Icon, Row } from '@talivia/react-zen';
import { Favicon } from '@/components/common/Favicon';
import { LinkButton } from '@/components/common/LinkButton';
import { useMessages, useNavigation } from '@/components/hooks';
import { Edit } from '@/components/icons';
import { FilterBar } from '@/features/analytics/components/input/FilterBar';
import { UnitFilter } from '@/features/analytics/components/input/UnitFilter';
import { WebsiteDateFilter } from '@/features/analytics/components/input/WebsiteDateFilter';
import { WebsiteFilterButton } from '@/features/analytics/components/input/WebsiteFilterButton';
import { WebsiteSelect } from '@/features/websites/components/WebsiteSelect';
import { useWebsite } from '@/features/websites/hooks/useWebsite';

export function WebsiteHeader({
  showActions,
  readOnly = false,
}: {
  showActions?: boolean;
  allowLink?: boolean;
  readOnly?: boolean;
}) {
  const website = useWebsite();
  const canUpdateWebsite = (website as any)?.access?.canUpdate ?? true;
  const canShowSettings = !!showActions && canUpdateWebsite;
  const { renderUrl, pathname, router } = useNavigation();
  const isSettings = pathname.endsWith('/settings');
  const isCompare = pathname.endsWith('/compare');

  const { t, labels } = useMessages();

  const handleWebsiteChange = (value: string) => {
    router.push(renderUrl(`/app/${value}`, false));
  };

  if (isSettings) {
    return null;
  }

  const websiteControl = readOnly ? (
    <Row
      className="talivia-control site-switcher"
      alignItems="center"
      gap="2"
      minWidth="0"
      title={website.name}
    >
      <Favicon
        domain={website.domain}
        style={{ width: 18, height: 18, flex: '0 0 auto', borderRadius: 4 }}
      />
      <span className="site-switcher-name" title={website.name}>
        {website.name}
      </span>
    </Row>
  ) : (
    <WebsiteSelect
      websiteId={website.id}
      onChange={handleWebsiteChange}
      buttonProps={{
        className: 'talivia-control site-switcher',
        variant: 'outline',
      }}
      popoverProps={{ className: 'talivia-popover' }}
    />
  );

  return (
    <Column gap="2" className="site-toolbar-wrap">
      <Row
        className="site-toolbar"
        alignItems="center"
        justifyContent="flex-start"
        gap="2"
        wrap="wrap"
      >
        {websiteControl}
        {canShowSettings && (
          <LinkButton
            className="talivia-control site-settings-button"
            href={renderUrl(`/app/${website.id}/settings`, false)}
            size="sm"
            variant="outline"
            aria-label={t(labels.settings)}
            title={t(labels.settings)}
          >
            <Icon size="sm">
              <Edit />
            </Icon>
          </LinkButton>
        )}

        <Row className="site-toolbar-controls" alignItems="center" gap="2" wrap="wrap">
          <WebsiteFilterButton websiteId={website.id} allowBounceFilter={true} />
          <WebsiteDateFilter websiteId={website.id} allowCompare={isCompare} />
          <UnitFilter />
        </Row>
      </Row>
      <FilterBar websiteId={website.id} />
    </Column>
  );
}
