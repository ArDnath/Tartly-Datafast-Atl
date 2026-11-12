import { BRAND } from '@/lib/brand';
import {
  DEFAULT_TRAFFIC_TIER_INDEX,
  formatTrafficEvents,
  formatUsd,
  getTrafficAnnualCents,
  getTrafficEvents,
  getTrafficPriceCents,
  PLANS,
  TRAFFIC_TIERS,
  type PlanId,
} from '@/lib/plans';

export type DodoBillingInterval = 'monthly' | 'annual';

export interface DodoBillingProductPlanItem {
  /** Stable key used by DODO_PRODUCT_IDS_JSON. */
  key: string;
  planId: PlanId;
  interval: DodoBillingInterval;
  tierIndex: number;
  name: string;
  description: string;
  amountCents: number;
  metadata: {
    tartlyPlanId: PlanId;
    tartlyInterval: DodoBillingInterval;
    tartlyTierIndex: number;
  };
}

/**
 * Deterministic Dodo product catalogue for every price the slider can show.
 *
 * The setup script creates one recurring product per plan, interval, and tier.
 * Keeping this list in code means the amount the customer sees and the amount
 * Dodo charges come from the same plans.ts source.
 */
export function buildDodoBillingProductPlan(): DodoBillingProductPlanItem[] {
  const items: DodoBillingProductPlanItem[] = [];

  for (const plan of PLANS) {
    for (const interval of ['monthly', 'annual'] as const) {
      for (let tierIndex = 0; tierIndex < TRAFFIC_TIERS.length; tierIndex += 1) {
        const events = getTrafficEvents(plan.id, tierIndex);
        const amountCents =
          interval === 'annual'
            ? getTrafficAnnualCents(plan.id, tierIndex)
            : getTrafficPriceCents(plan.id, tierIndex);
        const cadence = interval === 'annual' ? 'Yearly' : 'Monthly';
        const priceLabel = formatUsd(amountCents);

        items.push({
          key: `${plan.id}:${interval}:${tierIndex}`,
          planId: plan.id,
          interval,
          tierIndex,
          name: `${BRAND.name} ${plan.name} — ${formatTrafficEvents(events)} events (${cadence})`,
          description:
            interval === 'annual'
              ? `${formatTrafficEvents(events)} events/month. ${priceLabel} billed yearly (two months free).`
              : `${formatTrafficEvents(events)} events/month. ${priceLabel} billed monthly. Cancel any time.`,
          amountCents,
          metadata: {
            tartlyPlanId: plan.id,
            tartlyInterval: interval,
            tartlyTierIndex: tierIndex,
          },
        });
      }
    }
  }

  return items;
}

export function summarizeBillingProductPlan(items: readonly DodoBillingProductPlanItem[]): string {
  return items
    .map(item => `${item.key.padEnd(24)} ${formatUsd(item.amountCents).padStart(9)}  ${item.name}`)
    .join('\n');
}

export function getDefaultTierProductEnv(
  productIds: ReadonlyMap<string, string>,
): Record<string, string> {
  const tier = DEFAULT_TRAFFIC_TIER_INDEX;
  const keys = [
    `starter:monthly:${tier}`,
    `pro:monthly:${tier}`,
    `starter:annual:${tier}`,
    `pro:annual:${tier}`,
  ];
  const envNames: Record<string, string> = {
    [`starter:monthly:${tier}`]: 'DODO_STARTER_PRODUCT_ID',
    [`pro:monthly:${tier}`]: 'DODO_PRO_PRODUCT_ID',
    [`starter:annual:${tier}`]: 'DODO_STARTER_ANNUAL_PRODUCT_ID',
    [`pro:annual:${tier}`]: 'DODO_PRO_ANNUAL_PRODUCT_ID',
  };
  const result: Record<string, string> = {};

  for (const key of keys) {
    const productId = productIds.get(key);

    if (productId) {
      result[envNames[key]] = productId;
    }
  }

  return result;
}
