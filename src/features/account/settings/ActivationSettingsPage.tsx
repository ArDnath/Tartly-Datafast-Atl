'use client';

import { Column, Grid, Heading, Row, Text } from '@talivia/react-zen';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/components/hooks';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';

interface ActivationStage {
  key: string;
  label: string;
  description: string;
  count: number;
  fromStartPercent: number;
  stepPercent: number;
}

interface ActivationFunnelResponse {
  generatedAt: string;
  stages: ActivationStage[];
  totals: { events: number; payments: number };
}

const CARD_STYLE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

function formatCount(value: number) {
  return value.toLocaleString('en-US');
}

export function ActivationSettingsPage() {
  const { get } = useApi();
  const { user, isLoading: authLoading } = useLoginQuery();
  const funnelQuery = useQuery({
    queryKey: ['platform-activation'],
    queryFn: () => get('/admin/activation') as Promise<ActivationFunnelResponse>,
    refetchOnWindowFocus: true,
    enabled: Boolean(user?.isPlatformAdmin),
  });

  return (
    <SettingsPageLayout
      activeKey="activation"
      subtitle="Internal activation funnel for platform operators. Aggregate counts only."
    >
      <Column gap="5">
        <Column gap="1">
          <Heading size="lg">Activation funnel</Heading>
          <Text color="muted">
            Derived from durable records: accounts, workspaces, websites, the first real event, an
            active payment connection, and the first matched payment. No synthetic activation events
            are written.
          </Text>
        </Column>

        {!authLoading && !user?.isPlatformAdmin && (
          <Text color="muted">
            This page is only available to platform operators. Workspace ownership does not grant
            access.
          </Text>
        )}

        {funnelQuery.isLoading && <Text color="muted">Loading activation data…</Text>}

        {funnelQuery.error && (
          <Text color="muted">
            {funnelQuery.error instanceof Error
              ? funnelQuery.error.message
              : 'Could not load the activation funnel.'}
          </Text>
        )}

        {funnelQuery.data && (
          <>
            <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
              <Column border padding="4" gap="1" style={CARD_STYLE}>
                <Text size="sm" color="muted">
                  Events received
                </Text>
                <Text size="xl" weight="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCount(funnelQuery.data.totals.events)}
                </Text>
              </Column>
              <Column border padding="4" gap="1" style={CARD_STYLE}>
                <Text size="sm" color="muted">
                  Payments recorded
                </Text>
                <Text size="xl" weight="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCount(funnelQuery.data.totals.payments)}
                </Text>
              </Column>
            </Grid>

            <Column border padding="4" gap="4" style={CARD_STYLE}>
              {funnelQuery.data.stages.map(stage => (
                <Column key={stage.key} gap="2">
                  <Row justifyContent="space-between" alignItems="baseline" gap="3" wrap="wrap">
                    <Column gap="1">
                      <Text weight="bold">{stage.label}</Text>
                      <Text size="sm" color="muted">
                        {stage.description}
                      </Text>
                    </Column>
                    <Row gap="3" alignItems="baseline">
                      <Text weight="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatCount(stage.count)}
                      </Text>
                      <Text size="sm" color="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {stage.fromStartPercent}% of signups · {stage.stepPercent}% of previous
                      </Text>
                    </Row>
                  </Row>
                  <div
                    aria-hidden="true"
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(stage.fromStartPercent, 100)}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: '#f2b4cb',
                      }}
                    />
                  </div>
                </Column>
              ))}
            </Column>

            <Text size="sm" color="muted">
              Generated {new Date(funnelQuery.data.generatedAt).toLocaleString('en-US')}. Refreshes
              when the page regains focus.
            </Text>
          </>
        )}
      </Column>
    </SettingsPageLayout>
  );
}
