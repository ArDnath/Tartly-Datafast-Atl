/**
 * Platform billing lifecycle, shared by the billing domain and the shared
 * entitlement/usage services.
 *
 * The provider (Dodo) is the source of truth. This module only normalises its
 * statuses and decides whether a workspace still has paid access. It must stay
 * pure so it can be used from a webhook reducer, an entitlement check, and a
 * test without a database.
 */

export const BILLING_LIFECYCLE_STATUSES = [
  'INCOMPLETE',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED',
] as const;

export type BillingLifecycleStatus = (typeof BILLING_LIFECYCLE_STATUSES)[number];

export type BillingInterval = 'monthly' | 'annual';

/** Provider statuses documented by Dodo Payments (fetched 2026-11-05). */
export type DodoSubscriptionStatus =
  | 'pending'
  | 'active'
  | 'on_hold'
  | 'paused'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'past_due';

/**
 * Higher wins only when two events share a timestamp. Timestamps are the
 * primary ordering key because providers may retry or deliver out of order.
 * Terminal events rank above snapshots so a retried `subscription.updated`
 * cannot reopen a cancelled subscription.
 */
export const BILLING_EVENT_PRIORITY: Record<string, number> = {
  'subscription.active': 10,
  'subscription.renewed': 20,
  'subscription.updated': 30,
  'subscription.plan_changed': 40,
  'subscription.past_due': 50,
  'subscription.on_hold': 60,
  'subscription.paused': 65,
  'subscription.unpaused': 66,
  'subscription.failed': 70,
  'subscription.cancelled': 80,
  'subscription.expired': 90,
};

export function getBillingEventPriority(eventType: string): number {
  return BILLING_EVENT_PRIORITY[eventType] ?? 0;
}

export function isSubscriptionLifecycleEvent(eventType: string): boolean {
  return eventType.startsWith('subscription.');
}

/**
 * Map a provider subscription snapshot to our lifecycle. A cancellation that
 * is scheduled for the next billing date keeps access until that date; the
 * access predicate below handles the period, not this mapper.
 */
export function mapProviderSubscriptionStatus({
  providerStatus,
  eventType,
  inTrial = false,
}: {
  providerStatus: string;
  eventType: string;
  /** True only while the provider-confirmed trial end is still in the future. */
  inTrial?: boolean;
}): BillingLifecycleStatus {
  if (eventType === 'subscription.cancelled') {
    return 'CANCELLED';
  }

  if (eventType === 'subscription.expired') {
    return 'EXPIRED';
  }

  if (eventType === 'subscription.past_due') {
    return 'PAST_DUE';
  }

  if (
    eventType === 'subscription.on_hold' ||
    eventType === 'subscription.paused' ||
    eventType === 'subscription.failed'
  ) {
    return 'SUSPENDED';
  }

  switch (providerStatus) {
    case 'active':
      return inTrial ? 'TRIALING' : 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'on_hold':
    case 'paused':
    case 'failed':
      return 'SUSPENDED';
    case 'cancelled':
      return 'CANCELLED';
    case 'expired':
      return 'EXPIRED';
    default:
      return 'INCOMPLETE';
  }
}

export interface BillingAccessState {
  lifecycleStatus: BillingLifecycleStatus | string;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: Date | null;
}

/**
 * Paid features require a confirmed subscription. `PAST_DUE` retains access
 * during the provider's grace period. A scheduled cancellation keeps access
 * until the paid period ends, even when the provider has already emitted
 * `subscription.cancelled`.
 */
export function billingSubscriptionHasAccess(
  subscription: BillingAccessState | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!subscription) {
    return false;
  }

  switch (subscription.lifecycleStatus) {
    case 'ACTIVE':
    case 'TRIALING':
    case 'PAST_DUE':
      return true;
    case 'CANCELLED':
      return Boolean(
        subscription.cancelAtPeriodEnd &&
          subscription.currentPeriodEnd &&
          subscription.currentPeriodEnd.getTime() > now.getTime(),
      );
    default:
      return false;
  }
}

export interface BillingEventOrder {
  eventAt: Date;
  eventType: string;
}

export interface StoredBillingEventOrder {
  lastEventAt: Date;
  lastEventPriority: number;
}

/**
 * Apply-at-most-once ordering. Returns true when the incoming event is newer,
 * or equal in time but at least as important as the stored event type.
 */
export function isNewerBillingEvent(
  incoming: BillingEventOrder,
  stored: StoredBillingEventOrder | null | undefined,
): boolean {
  if (!stored) {
    return true;
  }

  const delta = incoming.eventAt.getTime() - stored.lastEventAt.getTime();

  if (delta !== 0) {
    return delta > 0;
  }

  return getBillingEventPriority(incoming.eventType) >= stored.lastEventPriority;
}

/** Dodo returns the period end as `next_billing_date`; parse defensively. */
export function parseProviderDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
}
