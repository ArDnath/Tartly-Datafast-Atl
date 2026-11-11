import type { BillingInterval } from '@/lib/billing-lifecycle';
import {
  clampTrafficTierIndex,
  DEFAULT_TRAFFIC_TIER_INDEX,
  isPlanId,
  type PlanId,
} from '@/lib/plans';

export interface CheckoutIntent {
  planId: PlanId;
  interval: BillingInterval;
  tierIndex: number;
}

export type CheckoutSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Validate the pricing-card handoff. The query string is not an authorization
 * boundary — checkout re-checks workspace ownership — but it must never make
 * the UI display a plan or tier the app cannot resolve.
 */
export function parseCheckoutIntent(params: CheckoutSearchParams = {}): CheckoutIntent {
  const planValue = first(params.plan);
  const intervalValue = first(params.interval);
  const tierValue = first(params.tier);

  return {
    planId: isPlanId(planValue) ? planValue : 'starter',
    interval: intervalValue === 'annual' ? 'annual' : 'monthly',
    tierIndex:
      tierValue === undefined || tierValue === ''
        ? DEFAULT_TRAFFIC_TIER_INDEX
        : clampTrafficTierIndex(Number(tierValue)),
  };
}

export function buildCheckoutPath(intent: CheckoutIntent): string {
  const params = new URLSearchParams({
    plan: intent.planId,
    interval: intent.interval,
    tier: String(intent.tierIndex),
  });

  return `/checkout?${params.toString()}`;
}
