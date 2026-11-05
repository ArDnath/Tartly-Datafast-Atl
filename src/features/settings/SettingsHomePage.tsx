'use client';

import { Column, Grid, Heading, Row, Text } from '@talivia/react-zen';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import Link from '@/components/common/Link';
import { useApi, useNavigation } from '@/components/hooks';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { useWebsiteOverviewQuery } from '@/features/portfolio/hooks/useWebsiteOverviewQuery';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { BRAND } from '@/lib/brand';
import { getPlanOrNull } from '@/lib/plans';
import type { UsageMeter } from '@/lib/usage';

interface WorkspaceUsageResponse {
  planId: string | null;
  subscriptionStatus: string;
  resetAt: string;
  events: UsageMeter;
  replays: UsageMeter;
  websites: { used: number; limit: number };
  members: { used: number; limit: number };
}

const CARD_STYLE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

function formatPercent(meter: UsageMeter) {
  return meter.included ? `${Math.round(meter.percent)}%` : 'Not included';
}

function SettingsCard({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <Column border padding="4" gap="3" style={CARD_STYLE} minHeight="168px">
      <Column gap="1">
        <Text weight="bold">{title}</Text>
        <Text size="sm" color="muted">
          {detail}
        </Text>
      </Column>
      {children}
    </Column>
  );
}

export function SettingsHomePage() {
  const { get } = useApi();
  const { renderUrl } = useNavigation();
  const { user } = useLoginQuery();
  const { activeWorkspace, workspaceId, isLoading: workspaceLoading } = useActiveWorkspace();
  const { data: websitesData } = useWebsiteOverviewQuery();

  const usageQuery = useQuery({
    queryKey: ['workspace-usage', workspaceId],
    queryFn: () => get(`/workspaces/${workspaceId}/usage`) as Promise<WorkspaceUsageResponse>,
    enabled: Boolean(workspaceId),
    refetchOnWindowFocus: true,
  });

  if (workspaceLoading) {
    return <Text color="muted">Loading settings…</Text>;
  }

  if (!workspaceId || !activeWorkspace) {
    return (
      <Column gap="3">
        <Heading size="lg">Settings</Heading>
        <Text color="muted">
          Create or select a workspace to see its plan, websites, integrations, and account state.
        </Text>
      </Column>
    );
  }

  const plan = getPlanOrNull(activeWorkspace.planId);
  const usage = usageQuery.data;
  const websiteCount = websitesData?.data?.length ?? usage?.websites.used ?? 0;

  return (
    <Column gap="5">
      <Column gap="1">
        <Heading size="lg">Workspace settings</Heading>
        <Text color="muted">
          One place for the workspace, its sites, analytics integrations, plan, and account security
          in {BRAND.name}. Change the active workspace from the top navigation.
        </Text>
      </Column>

      <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
        <SettingsCard title="Workspace" detail="Members, roles, and invitations.">
          <Column gap="1">
            <Text weight="bold" truncate>
              {activeWorkspace.name}
            </Text>
            <Text size="sm" color="muted">
              {plan ? `${plan.name} plan` : 'No plan selected'} ·{' '}
              {activeWorkspace.subscriptionStatus}
            </Text>
          </Column>
          <Link
            href={renderUrl('/app/settings/workspace', false)}
            style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
          >
            Manage workspace
          </Link>
        </SettingsCard>

        <SettingsCard title="Plan and usage" detail="Allowances, reset date, and ingestion state.">
          <Text size="sm" color="muted">
            {usage
              ? `${usage.websites.used} / ${usage.websites.limit} websites · ${usage.members.used} / ${usage.members.limit} members`
              : 'Usage is loading.'}
          </Text>
          <Text size="sm" color="muted">
            {usage ? `Billable events: ${formatPercent(usage.events)} used` : '—'}
          </Text>
          <Link
            href={renderUrl('/app/settings/billing', false)}
            style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
          >
            Open plan and usage
          </Link>
        </SettingsCard>

        <SettingsCard title="Websites" detail="Sites in this workspace and their trackers.">
          <Text size="sm" color="muted">
            {websiteCount} website{websiteCount === 1 ? '' : 's'} in {activeWorkspace.name}.
          </Text>
          <Link
            href={renderUrl('/app/settings/websites', false)}
            style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
          >
            Manage websites
          </Link>
        </SettingsCard>

        <SettingsCard
          title="Integrations"
          detail="Payment providers that feed revenue attribution."
        >
          <Text size="sm" color="muted">
            Stripe, Dodo Payments, Lemon Squeezy, Polar, Yolfi, and the manual payment API connect
            per website.
          </Text>
          <Link
            href={renderUrl('/app/settings/integrations', false)}
            style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
          >
            Review integrations
          </Link>
        </SettingsCard>

        <SettingsCard title="Security" detail="Sign-in, email verification, and account deletion.">
          <Text size="sm" color="muted">
            {user?.emailVerifiedAt ? 'Email address verified.' : 'Email address not verified yet.'}
          </Text>
          <Link
            href={renderUrl('/app/settings/security', false)}
            style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
          >
            Open security
          </Link>
        </SettingsCard>

        <SettingsCard title="Account" detail="Profile, password, and display preferences.">
          <Text size="sm" color="muted" truncate>
            {user?.username || 'Signed out'}
          </Text>
          <Row gap="3" alignItems="center" wrap="wrap">
            <Link
              href={renderUrl('/app/settings/account', false)}
              style={{ color: '#f2b4cb', fontSize: 13, fontWeight: 600 }}
            >
              Manage account
            </Link>
            <Link
              href={renderUrl('/app/settings/preferences', false)}
              style={{ color: '#ffffff99', fontSize: 13 }}
            >
              Preferences
            </Link>
          </Row>
        </SettingsCard>
      </Grid>
    </Column>
  );
}
