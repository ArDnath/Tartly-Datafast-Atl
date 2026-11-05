'use client';

import { Column, Grid, Heading, Row, Text } from '@talivia/react-zen';
import { useQueries } from '@tanstack/react-query';
import Link from '@/components/common/Link';
import { Favicon } from '@/components/common/Favicon';
import { useActiveWorkspace, useApi, useNavigation, useWebsiteOverviewQuery } from '@/components/hooks';
import { WebsiteAddButton } from '@/features/websites/WebsiteAddButton';

interface WebsiteRow {
  id: string;
  name: string;
  domain?: string | null;
  access?: { canUpdate?: boolean };
}

interface ProviderConnection {
  id: string;
  providerName: string;
  connectionStatus: string;
  webhookStatus: string;
  hasCredentials: boolean;
  hasWebhookSecret: boolean;
  lastSyncAt?: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  dodo: 'Dodo Payments',
  lemonsqueezy: 'Lemon Squeezy',
  polar: 'Polar',
  yolfi: 'Yolfi',
  manual: 'Manual payment API',
};

const CARD_STYLE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

function isConnected(connection: ProviderConnection) {
  return (
    connection.hasCredentials &&
    connection.connectionStatus === 'active' &&
    connection.webhookStatus === 'configured'
  );
}

function ConnectionList({ connections }: { connections: ProviderConnection[] }) {
  if (!connections.length) {
    return (
      <Text size="sm" color="muted">
        No analytics payment provider connected yet.
      </Text>
    );
  }

  return (
    <Column gap="1">
      {connections.map(connection => {
        const connected = isConnected(connection);
        const label = PROVIDER_LABELS[connection.providerName] || connection.providerName;

        return (
          <Row key={connection.id} alignItems="center" justifyContent="space-between" gap="3">
            <Text size="sm">{label}</Text>
            <Text
              size="sm"
              style={{ color: connected ? '#2dbf72' : '#f8b84e' }}
            >
              {connected ? 'Connected' : `Needs review (${connection.connectionStatus})`}
            </Text>
          </Row>
        );
      })}
    </Column>
  );
}

export function IntegrationsSettingsPage() {
  const { get } = useApi();
  const { renderUrl } = useNavigation();
  const { activeWorkspace, workspaceId, isLoading: workspaceLoading } = useActiveWorkspace();
  const { data, isLoading } = useWebsiteOverviewQuery();
  const websites = (data?.data || []) as WebsiteRow[];

  const connectionQueries = useQueries({
    queries: websites.map(website => ({
      queryKey: ['payment-provider-connections', website.id],
      queryFn: () =>
        get(`/websites/${website.id}/payment-provider-connections`) as Promise<{
          data: ProviderConnection[];
        }>,
      enabled: Boolean(workspaceId),
    })),
  });

  if (workspaceLoading) {
    return <Text color="muted">Loading integrations…</Text>;
  }

  if (!workspaceId || !activeWorkspace) {
    return (
      <Column gap="3">
        <Heading size="lg">Integrations</Heading>
        <Text color="muted">
          Create or select a workspace to review its analytics payment connections.
        </Text>
      </Column>
    );
  }

  const connectedCount = connectionQueries.reduce(
    (total, query) =>
      total + (query.data?.data || []).filter(connection => isConnected(connection)).length,
    0,
  );

  return (
    <Column gap="5">
      <Row justifyContent="space-between" alignItems="flex-start" gap="3" wrap="wrap">
        <Column gap="1">
          <Heading size="lg">Integrations</Heading>
          <Text color="muted">
            These are analytics integrations: customer payment providers that let RevenueLens
            measure their revenue. Platform billing for your RevenueLens subscription is separate
            and lives under Plan and usage.
          </Text>
        </Column>
        <WebsiteAddButton />
      </Row>

      <Column border padding="4" gap="1" style={CARD_STYLE}>
        <Text weight="bold">Analytics payment connections</Text>
        <Text size="sm" color="muted">
          {connectedCount} connected provider{connectedCount === 1 ? '' : 's'} across{' '}
          {websites.length} website{websites.length === 1 ? '' : 's'}.
        </Text>
        <Text size="sm" color="muted">
          Provider credentials are encrypted at rest and never returned to the browser. Webhook
          secrets are created by RevenueLens where the provider supports it.
        </Text>
      </Column>

      {isLoading ? (
        <Text color="muted">Loading websites…</Text>
      ) : websites.length ? (
        <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
          {websites.map((website, index) => {
            const query = connectionQueries[index];
            const connections = query?.data?.data || [];

            return (
              <Column key={website.id} border padding="4" gap="3" style={CARD_STYLE}>
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

                {query?.isLoading ? (
                  <Text size="sm" color="muted">
                    Checking provider connections…
                  </Text>
                ) : query?.error ? (
                  <Text size="sm" color="muted">
                    Could not read provider connections.
                  </Text>
                ) : (
                  <ConnectionList connections={connections} />
                )}

                {website.access?.canUpdate && (
                  <Link
                    href={renderUrl(`/app/${website.id}/settings#payments`, false)}
                    style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
                  >
                    Manage payment connections
                  </Link>
                )}
              </Column>
            );
          })}
        </Grid>
      ) : (
        <Column border padding="4" gap="2" style={CARD_STYLE}>
          <Text weight="bold">No websites in this workspace yet</Text>
          <Text size="sm" color="muted">
            Add a website first. Payment providers connect per website so revenue stays inside its
            tenant boundary.
          </Text>
          <Row>
            <WebsiteAddButton />
          </Row>
        </Column>
      )}

      <Column gap="1">
        <Text weight="bold">Provider guides</Text>
        <Text size="sm" color="muted">
          Setup steps, attribution fields, and official provider links live in the{' '}
          <Link href="/docs" style={{ color: '#f2b4cb' }}>
            documentation
          </Link>
          .
        </Text>
      </Column>
    </Column>
  );
}
