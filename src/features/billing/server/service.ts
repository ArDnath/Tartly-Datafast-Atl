import {
  billingSubscriptionHasAccess,
  getBillingEventPriority,
  isNewerBillingEvent,
  mapProviderSubscriptionStatus,
  parseProviderDate,
  type BillingInterval,
  type BillingLifecycleStatus,
} from '@/lib/billing-lifecycle';
import { isPlanId, type PlanId } from '@/lib/plans';
import { isUniqueConstraintError } from '@/lib/prisma-error';
import prisma from '@/lib/prisma';
import {
  getBillingConfig,
  resolveBillingProduct,
  type BillingConfig,
} from '@/features/billing/server/provider';

/**
 * Platform billing state. Everything here is scoped by workspace and written
 * only from a verified provider webhook (or a provider-confirmed API call).
 * No request handler may mark a subscription active because a checkout
 * redirect said so.
 */

export interface DodoSubscriptionSnapshot {
  subscription_id: string;
  status: string;
  customer: {
    customer_id: string;
    email?: string | null;
    name?: string | null;
  };
  product_id?: string | null;
  currency?: string | null;
  recurring_pre_tax_amount?: number | null;
  next_billing_date?: string | null;
  previous_billing_date?: string | null;
  created_at?: string | null;
  cancel_at_next_billing_date?: boolean | null;
  cancelled_at?: string | null;
  trial_period_days?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface DodoPaymentSnapshot {
  payment_id: string;
  subscription_id?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  status?: string | null;
  invoice_id?: string | null;
  invoice_url?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: { customer_id?: string | null; email?: string | null } | null;
}

export interface VerifiedDodoEvent {
  id: string;
  type: string;
  timestamp: Date;
  payload: unknown;
}

export type DodoEventResult =
  | 'processed'
  | 'duplicate'
  | 'ignored'
  | 'unmatched'
  | 'unsupported';

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getMetadataWorkspaceId(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return getString((value as Record<string, unknown>).workspaceId);
}

function getProductPlan(
  config: BillingConfig | null,
  productId: string | null | undefined,
): { planId: PlanId; interval: BillingInterval } | null {
  if (!config) {
    return null;
  }

  const product = resolveBillingProduct(config, productId);

  return product ? { planId: product.planId, interval: product.interval } : null;
}

async function resolveWorkspaceId({
  metadata,
  providerCustomerId,
  providerSubscriptionId,
}: {
  metadata?: unknown;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
}): Promise<string | null> {
  // Provider identifiers win over body metadata. Metadata is attacker-supplied
  // if a provider dashboard is compromised; a subscription already stored for
  // a workspace is the stronger tenant binding.
  if (providerSubscriptionId) {
    const subscription = await prisma.client.platformSubscription.findFirst({
      where: { providerName: 'dodo', providerSubscriptionId },
      select: { workspaceId: true, workspace: { select: { deletedAt: true } } },
    });

    if (subscription && !subscription.workspace.deletedAt) {
      return subscription.workspaceId;
    }
  }

  if (providerCustomerId) {
    const customer = await prisma.client.billingCustomer.findFirst({
      where: { providerName: 'dodo', providerCustomerId },
      select: { workspaceId: true, workspace: { select: { deletedAt: true } } },
    });

    if (customer && !customer.workspace.deletedAt) {
      return customer.workspaceId;
    }
  }

  const metadataWorkspaceId = getMetadataWorkspaceId(metadata);

  if (metadataWorkspaceId) {
    const workspace = await prisma.client.workspace.findFirst({
      where: { id: metadataWorkspaceId, deletedAt: null },
      select: { id: true },
    });

    if (workspace) {
      return workspace.id;
    }
  }

  return null;
}

async function claimEvent(event: VerifiedDodoEvent): Promise<'claimed' | 'duplicate'> {
  try {
    await prisma.client.billingEvent.create({
      data: {
        providerName: 'dodo',
        providerEventId: event.id,
        eventType: event.type,
        eventAt: event.timestamp,
        payload: event.payload as any,
        processingStatus: 'processing',
      },
    });

    return 'claimed';
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existing = await prisma.client.billingEvent.findUnique({
      where: { providerEventId: event.id },
      select: { processingStatus: true, receivedAt: true },
    });

    if (
      existing &&
      ['processed', 'ignored', 'unmatched', 'unsupported'].includes(existing.processingStatus)
    ) {
      return 'duplicate';
    }

    // A concurrent delivery may still be in flight. Only treat it as a
    // duplicate for a short window; a crashed attempt must stay retryable.
    if (
      existing?.processingStatus === 'processing' &&
      Date.now() - existing.receivedAt.getTime() < 60_000
    ) {
      return 'duplicate';
    }

    // A previous attempt failed or went stale. Re-claim it so provider retries
    // can finish.
    await prisma.client.billingEvent.updateMany({
      where: { providerEventId: event.id },
      data: { processingStatus: 'processing', errorMessage: null },
    });

    return 'claimed';
  }
}

async function finishEvent(
  eventId: string,
  status: DodoEventResult | 'failed',
  workspaceId?: string | null,
  errorMessage?: string | null,
) {
  await prisma.client.billingEvent.updateMany({
    where: { providerEventId: eventId },
    data: {
      processingStatus: status,
      workspaceId: workspaceId ?? undefined,
      errorMessage: errorMessage ?? null,
      processedAt:
        status === 'processed' || status === 'ignored' || status === 'unsupported'
          ? new Date()
          : null,
    },
  });
}

function buildSubscriptionData({
  config,
  workspaceId,
  snapshot,
  eventType,
  eventAt,
  existingPlanId,
}: {
  config: BillingConfig | null;
  workspaceId: string;
  snapshot: DodoSubscriptionSnapshot;
  eventType: string;
  eventAt: Date;
  existingPlanId?: string | null;
}) {
  const productId = getString(snapshot.product_id);
  const productPlan = getProductPlan(config, productId);
  const metadataPlan = isPlanId(snapshot.metadata?.planId)
    ? (snapshot.metadata?.planId as PlanId)
    : null;
  const planId = productPlan?.planId ?? metadataPlan ?? (isPlanId(existingPlanId) ? existingPlanId : null);

  // Never guess a plan. A misconfigured product ID must fail visibly rather
  // than silently grant Starter limits to a Pro subscription.
  if (!planId) {
    return null;
  }
  const interval: BillingInterval =
    productPlan?.interval ??
    (snapshot.metadata?.interval === 'annual' ? 'annual' : 'monthly');
  const currentPeriodStart = parseProviderDate(snapshot.previous_billing_date);
  const currentPeriodEnd = parseProviderDate(snapshot.next_billing_date);
  const createdAt = parseProviderDate(snapshot.created_at);
  const trialPeriodDays = getNumber(snapshot.trial_period_days) ?? 0;
  const trialEnd =
    trialPeriodDays > 0 && createdAt
      ? new Date(createdAt.getTime() + trialPeriodDays * 24 * 60 * 60 * 1000)
      : null;
  const lifecycleStatus = mapProviderSubscriptionStatus({
    providerStatus: snapshot.status,
    eventType,
    inTrial: Boolean(trialEnd && trialEnd.getTime() > eventAt.getTime()),
  });

  return {
    workspaceId,
    providerName: 'dodo' as const,
    providerSubscriptionId: snapshot.subscription_id,
    providerCustomerId: snapshot.customer.customer_id,
    planId,
    productId,
    interval,
    lifecycleStatus,
    providerStatus: snapshot.status,
    currency: getString(snapshot.currency) ?? 'USD',
    amountCents: Math.max(0, Math.round(getNumber(snapshot.recurring_pre_tax_amount) ?? 0)),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(snapshot.cancel_at_next_billing_date),
    canceledAt: parseProviderDate(snapshot.cancelled_at),
    endedAt:
      lifecycleStatus === 'CANCELLED' || lifecycleStatus === 'EXPIRED' ? eventAt : null,
    trialEnd,
    lastEventType: eventType,
    lastEventAt: eventAt,
    lastEventPriority: getBillingEventPriority(eventType),
    metadata: (snapshot.metadata ?? null) as any,
  };
}

async function applySubscriptionSnapshot({
  config,
  workspaceId,
  snapshot,
  eventType,
  eventAt,
}: {
  config: BillingConfig | null;
  workspaceId: string;
  snapshot: DodoSubscriptionSnapshot;
  eventType: string;
  eventAt: Date;
}): Promise<'processed' | 'ignored' | 'unsupported'> {
  const existing = await prisma.client.platformSubscription.findUnique({
    where: { workspaceId },
    select: { lastEventAt: true, lastEventPriority: true, planId: true },
  });

  if (
    existing &&
    !isNewerBillingEvent(
      { eventAt, eventType },
      { lastEventAt: existing.lastEventAt, lastEventPriority: existing.lastEventPriority },
    )
  ) {
    return 'ignored';
  }

  const data = buildSubscriptionData({
    config,
    workspaceId,
    snapshot,
    eventType,
    eventAt,
    existingPlanId: existing?.planId,
  });

  if (!data) {
    return 'unsupported';
  }

  const hasAccess = billingSubscriptionHasAccess(
    {
      lifecycleStatus: data.lifecycleStatus,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      currentPeriodEnd: data.currentPeriodEnd,
    },
    eventAt,
  );

  await prisma.client.$transaction([
    prisma.client.platformSubscription.upsert({
      where: { workspaceId },
      create: data,
      update: data,
    }),
    prisma.client.billingCustomer.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        providerName: 'dodo',
        providerCustomerId: snapshot.customer.customer_id,
        email: snapshot.customer.email ?? '',
      },
      update: {
        providerCustomerId: snapshot.customer.customer_id,
        ...(snapshot.customer.email ? { email: snapshot.customer.email } : {}),
      },
    }),
    prisma.client.workspace.update({
      where: { id: workspaceId },
      data: {
        planId: data.planId,
        subscriptionStatus: data.lifecycleStatus,
      },
    }),
  ]);

  if (
    existing?.planId &&
    existing.planId !== data.planId &&
    hasAccess &&
    data.lifecycleStatus === 'ACTIVE'
  ) {
    await prisma.client.billingSubscriptionChange.create({
      data: {
        workspaceId,
        fromPlanId: existing.planId,
        toPlanId: data.planId,
        changeType: 'provider-sync',
        effectiveAt: eventAt,
      },
    });
  }

  return 'processed';
}

async function applyPaymentSnapshot({
  workspaceId,
  snapshot,
  eventType,
}: {
  workspaceId: string;
  snapshot: DodoPaymentSnapshot;
  eventType: string;
}): Promise<void> {
  const invoiceId = getString(snapshot.invoice_id) ?? getString(snapshot.payment_id);

  if (!invoiceId) {
    return;
  }

  const subscription = snapshot.subscription_id
    ? await prisma.client.platformSubscription.findFirst({
        where: {
          workspaceId,
          providerName: 'dodo',
          providerSubscriptionId: snapshot.subscription_id,
        },
        select: { currentPeriodStart: true, currentPeriodEnd: true },
      })
    : null;

  const issuedAt = parseProviderDate(snapshot.created_at) ?? new Date();
  const paid = eventType === 'payment.succeeded';

  await prisma.client.billingInvoice.upsert({
    where: {
      providerName_providerInvoiceId: {
        providerName: 'dodo',
        providerInvoiceId: invoiceId,
      },
    },
    create: {
      workspaceId,
      providerName: 'dodo',
      providerInvoiceId: invoiceId,
      providerPaymentId: getString(snapshot.payment_id),
      status: paid ? 'paid' : (getString(snapshot.status) ?? 'open'),
      currency: getString(snapshot.currency) ?? 'USD',
      amountCents: Math.max(0, Math.round(getNumber(snapshot.total_amount) ?? 0)),
      periodStart: subscription?.currentPeriodStart ?? null,
      periodEnd: subscription?.currentPeriodEnd ?? null,
      issuedAt,
      paidAt: paid ? issuedAt : null,
      hostedUrl: getString(snapshot.invoice_url),
    },
    update: {
      status: paid ? 'paid' : (getString(snapshot.status) ?? undefined),
      paidAt: paid ? issuedAt : undefined,
      ...(getString(snapshot.invoice_url) ? { hostedUrl: getString(snapshot.invoice_url) } : {}),
    },
  });
}

/**
 * Process one verified Dodo event. Idempotent by `webhook-id`; the subscription
 * reducer additionally rejects older snapshots so out-of-order deliveries
 * converge on the newest state.
 */
export async function processDodoWebhook(
  event: VerifiedDodoEvent,
  config: BillingConfig | null = getBillingConfig(),
): Promise<DodoEventResult> {
  const claimed = await claimEvent(event);

  if (claimed === 'duplicate') {
    return 'duplicate';
  }

  try {
    const payload = event.payload as {
      data?: DodoSubscriptionSnapshot | DodoPaymentSnapshot;
    };
    const data = payload.data;

    if (!data) {
      await finishEvent(event.id, 'unsupported');
      return 'unsupported';
    }

    if (event.type.startsWith('subscription.')) {
      const snapshot = data as DodoSubscriptionSnapshot;

      if (typeof snapshot.subscription_id !== 'string') {
        await finishEvent(event.id, 'unsupported');
        return 'unsupported';
      }

      const workspaceId = await resolveWorkspaceId({
        metadata: snapshot.metadata,
        providerCustomerId: snapshot.customer?.customer_id,
        providerSubscriptionId: snapshot.subscription_id,
      });

      if (!workspaceId) {
        await finishEvent(event.id, 'unmatched');
        return 'unmatched';
      }

      const result = await applySubscriptionSnapshot({
        config,
        workspaceId,
        snapshot,
        eventType: event.type,
        eventAt: event.timestamp,
      });

      await finishEvent(event.id, result, workspaceId);

      return result;
    }

    if (event.type === 'payment.succeeded' || event.type === 'payment.failed') {
      const snapshot = data as DodoPaymentSnapshot;
      const workspaceId = await resolveWorkspaceId({
        metadata: snapshot.metadata,
        providerCustomerId: snapshot.customer?.customer_id,
        providerSubscriptionId: snapshot.subscription_id,
      });

      if (!workspaceId) {
        await finishEvent(event.id, 'unmatched');
        return 'unmatched';
      }

      await applyPaymentSnapshot({ workspaceId, snapshot, eventType: event.type });
      await finishEvent(event.id, 'processed', workspaceId);

      return 'processed';
    }

    await finishEvent(event.id, 'unsupported');
    return 'unsupported';
  } catch (error) {
    await finishEvent(
      event.id,
      'failed',
      null,
      error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
    );

    throw error;
  }
}

export interface WorkspaceBillingState {
  configured: boolean;
  provider: 'dodo';
  subscription: {
    planId: PlanId;
    interval: BillingInterval;
    lifecycleStatus: BillingLifecycleStatus;
    providerStatus: string;
    currency: string;
    amountCents: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    active: boolean;
    updatedAt: string;
  } | null;
  invoices: Array<{
    id: string;
    status: string;
    currency: string;
    amountCents: number;
    issuedAt: string;
    paidAt: string | null;
    hostedUrl: string | null;
  }>;
  customer: { email: string } | null;
  /** Non-secret availability so the UI does not offer a price that cannot be bought. */
  availableProducts: Array<{ planId: PlanId; interval: BillingInterval }>;
}

export async function getWorkspaceBillingState(
  workspaceId: string,
  now: Date = new Date(),
): Promise<WorkspaceBillingState> {
  const [subscription, invoices, customer] = await Promise.all([
    prisma.client.platformSubscription.findUnique({ where: { workspaceId } }),
    prisma.client.billingInvoice.findMany({
      where: { workspaceId },
      orderBy: { issuedAt: 'desc' },
      take: 24,
      select: {
        id: true,
        status: true,
        currency: true,
        amountCents: true,
        issuedAt: true,
        paidAt: true,
        hostedUrl: true,
      },
    }),
    prisma.client.billingCustomer.findUnique({
      where: { workspaceId },
      select: { email: true },
    }),
  ]);

  const config = getBillingConfig();

  return {
    configured: Boolean(config),
    provider: 'dodo',
    subscription: subscription
      ? {
          planId: isPlanId(subscription.planId) ? subscription.planId : 'starter',
          interval: subscription.interval === 'annual' ? 'annual' : 'monthly',
          lifecycleStatus: subscription.lifecycleStatus as BillingLifecycleStatus,
          providerStatus: subscription.providerStatus,
          currency: subscription.currency,
          amountCents: subscription.amountCents,
          currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          trialEnd: subscription.trialEnd?.toISOString() ?? null,
          active: billingSubscriptionHasAccess(
            {
              lifecycleStatus: subscription.lifecycleStatus,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              currentPeriodEnd: subscription.currentPeriodEnd,
            },
            now,
          ),
          updatedAt: subscription.updatedAt.toISOString(),
        }
      : null,
    invoices: invoices.map(invoice => ({
      id: invoice.id,
      status: invoice.status,
      currency: invoice.currency,
      amountCents: invoice.amountCents,
      issuedAt: invoice.issuedAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
      hostedUrl: invoice.hostedUrl,
    })),
    customer: customer ? { email: customer.email } : null,
    availableProducts:
      config?.products.map(product => ({ planId: product.planId, interval: product.interval })) ??
      [],
  };
}
