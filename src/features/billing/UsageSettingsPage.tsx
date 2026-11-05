'use client';

import { Column, Grid, Heading, Row, Text } from '@talivia/react-zen';
import { useQuery } from '@tanstack/react-query';
import Link from '@/components/common/Link';
import { useApi } from '@/components/hooks';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { formatUsd } from '@/lib/plans';
import type { UsageMeter } from '@/lib/usage';

interface WorkspaceUsageResponse {
  workspaceId: string;
  role: string;
  planId: string | null;
  plan: {
    id: string;
    name: string;
    monthlyPriceCents: number;
    annualPriceCents: number;
    currency: string;
    websiteLimit: number;
    memberLimit: number;
    eventsPerMonth: number;
    retentionDays: number;
    replaySessionsPerMonth: number;
    features: readonly string[];
  };
  subscriptionStatus: string;
  periodStart: string;
  periodEnd: string;
  resetAt: string;
  events: UsageMeter;
  replays: UsageMeter;
  websites: { used: number; limit: number };
  members: { used: number; limit: number };
}

const SURFACE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

const STATUS_COPY: Record<UsageMeter['status'], { label: string; color: string }> = {
  ok: { label: 'Healthy', color: '#2dbf72' },
  warning: { label: '80% used', color: '#f2b4cb' },
  grace: { label: 'Grace period', color: '#f2b4cb' },
  limit: { label: 'Ingestion paused', color: '#ff6b6b' },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(value)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function UsageBar({
  label,
  meter,
  unit,
}: {
  label: string;
  meter: UsageMeter;
  unit: string;
}) {
  const status = STATUS_COPY[meter.status];
  const width = meter.included ? Math.max(meter.used > 0 ? 2 : 0, meter.percent) : 0;

  return (
    <Column gap="2">
      <Row justifyContent="space-between" alignItems="baseline" gap="3" wrap="wrap">
        <Text weight="bold">{label}</Text>
        <Text
          size="sm"
          color={meter.status === 'ok' ? 'muted' : undefined}
          style={{ color: meter.status === 'ok' ? undefined : status.color }}
        >
          {meter.included
            ? `${formatNumber(meter.used)} / ${formatNumber(meter.limit)} ${unit}`
            : 'Not included in this plan'}
        </Text>
      </Row>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={meter.included ? meter.limit : 0}
        aria-valuenow={meter.included ? Math.min(meter.used, meter.limit) : 0}
        style={{
          background: '#ffffff0d',
          borderRadius: 999,
          height: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: status.color,
            borderRadius: 999,
            height: '100%',
            transition: 'width 320ms ease-in-out',
            width: `${width}%`,
          }}
        />
      </div>
      <Row justifyContent="space-between" gap="3" wrap="wrap">
        <Text size="sm" color="muted">
          {meter.included
            ? meter.status === 'limit'
              ? 'Billable ingestion is paused until the period resets. Your dashboard and exports still work.'
              : meter.status === 'grace'
                ? `Allowance reached. ${formatNumber(Math.max(0, meter.hardLimit - meter.used))} grace ${unit} left before ingestion pauses.`
                : `${formatNumber(meter.remaining)} ${unit} remaining before the 100% notice.`
            : 'Replay is a Pro feature.'}
        </Text>
        <Text size="sm" style={{ color: status.color }}>
          {meter.included ? status.label : 'Upgrade required'}
        </Text>
      </Row>
    </Column>
  );
}

function LimitRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);

  return (
    <Row justifyContent="space-between" alignItems="baseline" gap="3">
      <Text color="muted">{label}</Text>
      <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatNumber(used)} / {formatNumber(limit)}
        <Text as="span" size="sm" color="muted">
          {`  ·  ${formatNumber(remaining)} left`}
        </Text>
      </Text>
    </Row>
  );
}

export function UsageSettingsPage() {
  const { get } = useApi();
  const { workspaceId, activeWorkspace, isLoading: workspaceLoading } = useActiveWorkspace();

  const usageQuery = useQuery({
    queryKey: ['workspace-usage', workspaceId],
    queryFn: () => get(`/workspaces/${workspaceId}/usage`) as Promise<WorkspaceUsageResponse>,
    enabled: Boolean(workspaceId),
    refetchOnWindowFocus: true,
  });

  if (workspaceLoading) {
    return <Text color="muted">Loading plan and usage…</Text>;
  }

  if (!workspaceId || !activeWorkspace) {
    return (
      <Column gap="3">
        <Heading size="lg">Plan and usage</Heading>
        <Text color="muted">Create or select a workspace to see its plan and usage.</Text>
      </Column>
    );
  }

  if (usageQuery.isLoading) {
    return <Text color="muted">Loading plan and usage…</Text>;
  }

  if (usageQuery.error || !usageQuery.data) {
    return (
      <Column gap="3">
        <Heading size="lg">Plan and usage</Heading>
        <Text color="muted">
          {usageQuery.error instanceof Error
            ? usageQuery.error.message
            : 'Could not load usage for this workspace.'}
        </Text>
      </Column>
    );
  }

  const usage = usageQuery.data;
  const isPaid = usage.subscriptionStatus === 'active' || usage.subscriptionStatus === 'trialing';
  const isPro = usage.plan.id === 'pro';

  return (
    <Column gap="5">
      <Column gap="1">
        <Row justifyContent="space-between" alignItems="baseline" gap="3" wrap="wrap">
          <Heading size="lg">Plan and usage</Heading>
          <Text size="sm" color="muted">
            Resets {formatDate(usage.resetAt)}
          </Text>
        </Row>
        <Text color="muted">
          Usage is counted from accepted events only. Bots, rejected requests, duplicates, and
          performance beacons never consume allowance.
        </Text>
      </Column>

      <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
        <Column border padding="4" gap="2" style={SURFACE}>
          <Text size="sm" color="muted">
            Current plan
          </Text>
          <Row alignItems="baseline" gap="2">
            <Text size="xl" weight="bold">
              {usage.plan.name}
            </Text>
            <Text color="muted">{formatUsd(usage.plan.monthlyPriceCents)}/mo</Text>
          </Row>
          <Text size="sm" color="muted">
            {isPaid
              ? `Subscription ${usage.subscriptionStatus}.`
              : 'No paid subscription is on file for this workspace yet.'}
          </Text>
          <Link
            href="/pricing"
            style={{
              alignSelf: 'flex-start',
              background: '#f2b4cb',
              border: '1px solid #f2b4cb',
              borderRadius: 10,
              color: '#141414',
              fontWeight: 600,
              marginTop: 4,
              padding: '8px 14px',
              textDecoration: 'none',
            }}
          >
            {isPro ? 'Compare plans' : 'Upgrade to Pro'}
          </Link>
        </Column>

        <Column border padding="4" gap="3" style={SURFACE}>
          <Text size="sm" color="muted">
            Workspace limits
          </Text>
          <LimitRow label="Websites" used={usage.websites.used} limit={usage.websites.limit} />
          <LimitRow label="Members" used={usage.members.used} limit={usage.members.limit} />
          <Text size="sm" color="muted">
            {usage.plan.retentionDays}-day analytics retention
            {usage.plan.replaySessionsPerMonth
              ? ` · ${usage.plan.replaySessionsPerMonth.toLocaleString('en-US')} replays / month`
              : ' · Replay not included'}
          </Text>
        </Column>
      </Grid>

      <Column border padding="4" gap="4" style={SURFACE}>
        <UsageBar label="Billable events" meter={usage.events} unit="events" />
        <div style={{ borderTop: '1px solid #ffffff0d' }} />
        <UsageBar label="Replay sessions" meter={usage.replays} unit="sessions" />
      </Column>

      <Column gap="2">
        <Text weight="bold">What happens next</Text>
        <Text size="sm" color="muted">
          At 80% you get an in-app notice. At 100% the grace allowance starts. When the grace
          allowance ends, billable ingestion pauses until {formatDate(usage.resetAt)}; analytics,
          reports, and exports stay available and nothing is deleted. There is no automatic overage
          charge.
        </Text>
        <Text size="sm" color="muted">
          Need more headroom before the reset? Compare the two plans on the pricing page. Plan
          changes require an active billing subscription.
        </Text>
      </Column>
    </Column>
  );
}
