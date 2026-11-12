import type { BillingInterval, BillingLifecycleStatus } from '@/lib/billing-lifecycle';
import { DEFAULT_TRAFFIC_TIER_INDEX, type PlanId } from '@/lib/plans';

/**
 * Client-safe shape for the app shell paywall. The server
 * route adds the caller's workspace role; no provider secret or raw webhook
 * payload is ever part of this contract.
 */

export interface BillingProductAvailability {
  planId: PlanId;
  interval: BillingInterval;
  /** Exact traffic tier. A missing value is the plan's default price. */
  tierIndex?: number;
}

export interface WorkspaceBillingAccess {
  workspaceId: string;
  planId: string | null;
  subscriptionStatus: string;
  configured: boolean;
  /** Provider-confirmed (or legacy-confirmed) paid access. */
  paid: boolean;
  /** True when the workspace has no active subscription. */
  requiresPayment: boolean;
  subscription: {
    planId: PlanId;
    interval: BillingInterval;
    trafficTierIndex: number | null;
    lifecycleStatus: BillingLifecycleStatus | string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  availableProducts: BillingProductAvailability[];
}

export interface WorkspaceBillingAccessResponse extends WorkspaceBillingAccess {
  role: string;
}

/**
 * A product sells the requested tier when it has the exact tier, or when it is
 * the plan's base product and the request is for the default tier.
 */
export function isBillingProductAvailable(
  products: readonly BillingProductAvailability[],
  planId: PlanId,
  interval: BillingInterval,
  tierIndex: number = DEFAULT_TRAFFIC_TIER_INDEX,
): boolean {
  return products.some(
    product =>
      product.planId === planId &&
      product.interval === interval &&
      (product.tierIndex === tierIndex ||
        (product.tierIndex === undefined && tierIndex === DEFAULT_TRAFFIC_TIER_INDEX)),
  );
}
