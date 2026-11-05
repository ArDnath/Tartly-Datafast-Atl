'use client';

import { Button, Column, Grid, Heading, Row, Text, useToast } from '@talivia/react-zen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApi } from '@/components/hooks';
import type { BillingInterval } from '@/lib/billing-lifecycle';
import { formatUsd, PLANS, type PlanId } from '@/lib/plans';

interface BillingSubscription {
  planId: PlanId;
  interval: BillingInterval;
  lifecycleStatus: string;
  providerStatus: string;
  currency: string;
  amountCents: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  active: boolean;
  updatedAt: string;
}

interface BillingInvoice {
  id: string;
  status: string;
  currency: string;
  amountCents: number;
  issuedAt: string;
  paidAt: string | null;
  hostedUrl: string | null;
}

interface BillingStateResponse {
  configured: boolean;
  provider: 'dodo';
  subscription: BillingSubscription | null;
  invoices: BillingInvoice[];
  customer: { email: string } | null;
  availableProducts: Array<{ planId: PlanId; interval: BillingInterval }>;
}

const SURFACE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

const STATUS_COPY: Record<string, { label: string; color: string; detail: string }> = {
  ACTIVE: { label: 'Active', color: '#2dbf72', detail: 'Paid features are enabled.' },
  TRIALING: { label: 'Trial', color: '#f2b4cb', detail: 'Your trial is running.' },
  PAST_DUE: {
    label: 'Payment past due',
    color: '#f8b84e',
    detail: 'Access continues during the provider grace period.',
  },
  SUSPENDED: {
    label: 'Suspended',
    color: '#ff6b6b',
    detail: 'Paid features are paused until a payment succeeds.',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#f8b84e',
    detail: 'The subscription will not renew.',
  },
  EXPIRED: { label: 'Expired', color: '#ff6b6b', detail: 'The subscription term has ended.' },
  INCOMPLETE: {
    label: 'Checkout incomplete',
    color: '#a1a1aa',
    detail: 'No payment has been confirmed yet.',
  },
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  } catch {
    return formatUsd(cents);
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf())
    ? null
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

export function BillingSubscriptionPanel({
  workspaceId,
  role,
  currentPlanId,
}: {
  workspaceId: string;
  role: string;
  currentPlanId: string;
}) {
  const { get, post } = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const billingQuery = useQuery({
    queryKey: ['workspace-billing', workspaceId],
    queryFn: () => get('/billing', { workspaceId }) as Promise<BillingStateResponse>,
    enabled: Boolean(workspaceId),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');

    if (checkout === 'success') {
      setNotice(
        'Payment received. The plan updates after the billing provider confirms the subscription.',
      );
    } else if (checkout === 'cancelled') {
      setNotice('Checkout was cancelled. Nothing was charged.');
    }

    if (checkout) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const billing = billingQuery.data;
  const isOwner = role === 'OWNER';
  const isActive = Boolean(billing?.subscription?.active);
  const currentPlan = billing?.subscription?.planId ?? currentPlanId;

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setNotice(null);

    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The billing action failed.');
    } finally {
      setBusy(null);
    }
  }

  async function startCheckout(planId: PlanId) {
    await run(`checkout-${planId}`, async () => {
      const { url } = (await post('/billing/checkout', {
        workspaceId,
        planId,
        interval,
      })) as { url: string };

      window.location.href = url;
    });
  }

  async function changePlan(planId: PlanId) {
    await run(`change-${planId}`, async () => {
      await post('/billing/change-plan', { workspaceId, planId });
      await queryClient.invalidateQueries({ queryKey: ['workspace-billing', workspaceId] });
      toast('Plan change requested. It applies after the provider confirms it.');
    });
  }

  async function openPortal() {
    await run('portal', async () => {
      const { url } = (await post('/billing/portal', { workspaceId })) as { url: string };

      window.location.href = url;
    });
  }

  async function cancelAtPeriodEnd() {
    await run('cancel', async () => {
      await post('/billing/cancel', { workspaceId });
      setConfirmCancel(false);
      await queryClient.invalidateQueries({ queryKey: ['workspace-billing', workspaceId] });
      toast('Cancellation scheduled for the end of the paid period.');
    });
  }

  if (billingQuery.isLoading) {
    return <Text color="muted">Loading billing…</Text>;
  }

  if (billingQuery.error || !billing) {
    return (
      <Column gap="2">
        <Heading size="lg">Subscription</Heading>
        <Text color="muted">
          {billingQuery.error instanceof Error
            ? billingQuery.error.message
            : 'Could not load billing for this workspace.'}
        </Text>
      </Column>
    );
  }

  const subscription = billing.subscription;
  const status = subscription ? STATUS_COPY[subscription.lifecycleStatus] : null;
  const periodEnd = formatDate(subscription?.currentPeriodEnd ?? null);
  const annualAvailable = billing.availableProducts.some(product => product.interval === 'annual');

  return (
    <Column gap="4">
      <Column gap="1">
        <Heading size="lg">Subscription</Heading>
        <Text color="muted">
          Platform billing is separate from the payment providers you connect to measure your own
          revenue.
        </Text>
      </Column>

      {notice && (
        <div role="status">
          <Text size="sm" style={{ color: '#f2b4cb' }}>
            {notice}
          </Text>
        </div>
      )}

      {!billing.configured && (
        <Column border padding="4" gap="2" style={SURFACE}>
          <Text weight="bold">Billing is not connected in this environment.</Text>
          <Text size="sm" color="muted">
            Add the Dodo billing API key, webhook secret, and product IDs to enable checkout.
            Nothing is charged until billing is configured and a payment is confirmed.
          </Text>
        </Column>
      )}

      {subscription && status && (
        <Column border padding="4" gap="3" style={SURFACE}>
          <Row justifyContent="space-between" alignItems="baseline" gap="3" wrap="wrap">
            <Column gap="1">
              <Text size="sm" color="muted">
                Current subscription
              </Text>
              <Row alignItems="baseline" gap="2" wrap="wrap">
                <Text size="xl" weight="bold">
                  {PLANS.find(plan => plan.id === subscription.planId)?.name ?? subscription.planId}
                </Text>
                <Text color="muted">
                  {subscription.interval === 'annual' ? 'Annual' : 'Monthly'} ·{' '}
                  {formatMoney(subscription.amountCents, subscription.currency)}
                </Text>
              </Row>
            </Column>
            <Text size="sm" style={{ color: status.color }}>
              {status.label}
            </Text>
          </Row>

          <Text size="sm" color="muted">
            {status.detail}
            {periodEnd
              ? subscription.cancelAtPeriodEnd
                ? ` Access ends on ${periodEnd}.`
                : ` Current period ends on ${periodEnd}.`
              : ''}
          </Text>

          {subscription.trialEnd && (
            <Text size="sm" color="muted">
              Trial ends {formatDate(subscription.trialEnd)}.
            </Text>
          )}

          <Row gap="2" wrap="wrap">
            {isOwner && billing.customer && (
              <Button variant="outline" onPress={openPortal} isDisabled={busy !== null}>
                {busy === 'portal' ? 'Opening…' : 'Manage billing'}
              </Button>
            )}
            {isOwner && subscription.active && !subscription.cancelAtPeriodEnd && (
              <Button
                variant="quiet"
                onPress={() => setConfirmCancel(true)}
                isDisabled={busy !== null}
              >
                Cancel at period end
              </Button>
            )}
          </Row>

          {confirmCancel && (
            <Column gap="2">
              <Text size="sm">
                Your plan stays active until {periodEnd ?? 'the end of the paid period'}. After
                that, paid features stop and your data remains available under the Starter limits.
              </Text>
              <Row gap="2">
                <Button variant="danger" onPress={cancelAtPeriodEnd} isDisabled={busy !== null}>
                  {busy === 'cancel' ? 'Scheduling…' : 'Confirm cancellation'}
                </Button>
                <Button variant="quiet" onPress={() => setConfirmCancel(false)}>
                  Keep subscription
                </Button>
              </Row>
            </Column>
          )}
        </Column>
      )}

      {isOwner && (
        <Column gap="3">
          <Row justifyContent="space-between" alignItems="baseline" gap="3" wrap="wrap">
            <Text weight="bold">{isActive ? 'Change plan' : 'Choose a plan'}</Text>
            {annualAvailable && (
              <Row gap="2">
                <Button
                  variant={interval === 'monthly' ? 'primary' : 'quiet'}
                  onPress={() => setInterval('monthly')}
                >
                  Monthly
                </Button>
                <Button
                  variant={interval === 'annual' ? 'primary' : 'quiet'}
                  onPress={() => setInterval('annual')}
                >
                  Annual
                </Button>
              </Row>
            )}
          </Row>

          <Grid columns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="3">
            {PLANS.map(plan => {
              const isCurrent = isActive && currentPlan === plan.id;
              const productAvailable = billing.availableProducts.some(
                product => product.planId === plan.id && product.interval === interval,
              );
              const price = interval === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents;

              return (
                <Column key={plan.id} border padding="4" gap="2" style={SURFACE}>
                  <Row justifyContent="space-between" alignItems="baseline" gap="2">
                    <Text weight="bold">{plan.name}</Text>
                    <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatUsd(price)}
                      <Text as="span" size="sm" color="muted">
                        {interval === 'annual' ? '/yr' : '/mo'}
                      </Text>
                    </Text>
                  </Row>
                  <Text size="sm" color="muted">
                    {plan.websiteLimit} website{plan.websiteLimit === 1 ? '' : 's'} ·{' '}
                    {plan.eventsPerMonth.toLocaleString('en-US')} events/month
                  </Text>
                  <Button
                    variant={isCurrent ? 'quiet' : 'primary'}
                    isDisabled={
                      !billing.configured || isCurrent || !productAvailable || busy !== null
                    }
                    onPress={() => (isActive ? changePlan(plan.id) : startCheckout(plan.id))}
                  >
                    {isCurrent
                      ? 'Current plan'
                      : !productAvailable
                        ? 'Price not configured'
                        : isActive
                          ? `Switch to ${plan.name}`
                          : `Choose ${plan.name}`}
                  </Button>
                </Column>
              );
            })}
          </Grid>
        </Column>
      )}

      <Column gap="2">
        <Text weight="bold">Invoices</Text>
        {billing.invoices.length === 0 ? (
          <Text size="sm" color="muted">
            No invoices yet. Invoices appear here after the billing provider issues one.
          </Text>
        ) : (
          <Column gap="2">
            {billing.invoices.map(invoice => (
              <Row
                key={invoice.id}
                justifyContent="space-between"
                alignItems="baseline"
                gap="3"
                wrap="wrap"
                border
                padding="3"
                style={SURFACE}
              >
                <Column gap="1">
                  <Text size="sm">{formatDate(invoice.issuedAt) ?? invoice.issuedAt}</Text>
                  <Text size="sm" color="muted">
                    {invoice.status}
                  </Text>
                </Column>
                <Row gap="3" alignItems="baseline">
                  <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(invoice.amountCents, invoice.currency)}
                  </Text>
                  {invoice.hostedUrl ? (
                    <a
                      href={invoice.hostedUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#f2b4cb' }}
                    >
                      View invoice
                    </a>
                  ) : (
                    <Text size="sm" color="muted">
                      No hosted copy
                    </Text>
                  )}
                </Row>
              </Row>
            ))}
          </Column>
        )}
      </Column>
    </Column>
  );
}
