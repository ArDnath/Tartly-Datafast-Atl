'use client';

import { Column, Grid, Heading, Row, Text } from '@talivia/react-zen';
import Link from '@/components/common/Link';
import { Favicon } from '@/components/common/Favicon';
import { useActiveWorkspace, useNavigation, useWebsiteOverviewQuery } from '@/components/hooks';
import { WebsiteAddButton } from '@/features/websites/WebsiteAddButton';

const SURFACE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

interface WebsiteRow {
  id: string;
  name: string;
  domain?: string | null;
  access?: { canUpdate?: boolean };
}

export function WebsitesSettingsPage() {
  const { activeWorkspace, workspaceId, isLoading: workspaceLoading } = useActiveWorkspace();
  const { renderUrl } = useNavigation();
  const { data, isLoading } = useWebsiteOverviewQuery();

  if (workspaceLoading) {
    return <Text color="muted">Loading websites…</Text>;
  }

  if (!workspaceId || !activeWorkspace) {
    return (
      <Column gap="3">
        <Heading size="lg">Websites</Heading>
        <Text color="muted">Create or select a workspace to manage its websites.</Text>
      </Column>
    );
  }

  const websites = (data?.data || []) as WebsiteRow[];

  return (
    <Column gap="5">
      <Row justifyContent="space-between" alignItems="flex-start" gap="3" wrap="wrap">
        <Column gap="1">
          <Heading size="lg">Websites</Heading>
          <Text color="muted">
            Every website belongs to {activeWorkspace.name}. Open a site to manage its tracking,
            attribution, API keys, and payment connections.
          </Text>
        </Column>
        <WebsiteAddButton />
      </Row>

      {isLoading ? (
        <Text color="muted">Loading websites…</Text>
      ) : websites.length ? (
        <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
          {websites.map(website => (
            <Column key={website.id} border padding="4" gap="2" style={SURFACE}>
              <Row alignItems="center" gap="2" minWidth="0">
                {website.domain && (
                  <Favicon
                    domain={website.domain}
                    style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                  />
                )}
                <Text weight="bold" truncate title={website.name}>
                  {website.name}
                </Text>
              </Row>
              <Text size="sm" color="muted" truncate>
                {website.domain || 'No domain yet'}
              </Text>
              <Row gap="3" alignItems="center" style={{ marginTop: 4 }}>
                <Link
                  href={renderUrl(`/app/${website.id}`, false)}
                  style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
                >
                  Open dashboard
                </Link>
                {website.access?.canUpdate && (
                  <Link
                    href={renderUrl(`/app/${website.id}/settings`, false)}
                    style={{ color: '#ffffff99', fontSize: 13 }}
                  >
                    Website settings
                  </Link>
                )}
              </Row>
            </Column>
          ))}
        </Grid>
      ) : (
        <Column border padding="4" gap="2" style={SURFACE}>
          <Text weight="bold">No websites in this workspace yet</Text>
          <Text size="sm" color="muted">
            Add a website to install the tracker and start attributing revenue. Your plan's
            website allowance is shown on Plan and usage.
          </Text>
          <Row>
            <WebsiteAddButton />
          </Row>
        </Column>
      )}
    </Column>
  );
}
