import type { BillingInterval } from '@/lib/billing-lifecycle';
import { logger } from '@/lib/logger';
import {
  clampTrafficTierIndex,
  DEFAULT_TRAFFIC_TIER_INDEX,
  PLAN_IDS,
  TRAFFIC_TIERS,
  type PlanId,
} from '@/lib/plans';

/**
 * Platform billing provider contract (context A: we charge our customers).
 *
 * The analytics Dodo integration in `features/payments` is a different
 * context and must never be routed through this module. A `BillingProvider`
 * only creates platform checkouts, portal sessions, cancellations, and plan
 * changes. Subscription state always comes back through a verified webhook.
 */

export interface BillingProduct {
  planId: PlanId;
  interval: BillingInterval;
  productId: string;
  /**
   * Exact traffic tier this product sells. A product without a tier is the
   * plan default and may only be used for DEFAULT_TRAFFIC_TIER_INDEX.
   */
  tierIndex?: number;
}

export interface BillingConfig {
  providerName: 'dodo';
  environment: 'test_mode' | 'live_mode';
  apiKey: string;
  webhookSecret: string;
  products: BillingProduct[];
}

export interface BillingCheckoutCustomer {
  providerCustomerId?: string | null;
  email: string;
  name?: string | null;
}

export interface CreateBillingCheckoutInput {
  workspaceId: string;
  planId: PlanId;
  interval: BillingInterval;
  tierIndex: number;
  /** Resolved exact product. The handler owns price/tier selection. */
  productId: string;
  customer: BillingCheckoutCustomer;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  readonly name: string;
  createCheckout(input: CreateBillingCheckoutInput): Promise<{ url: string; sessionId: string }>;
  createPortalSession(providerCustomerId: string, returnUrl: string): Promise<{ url: string }>;
  cancelAtPeriodEnd(providerSubscriptionId: string): Promise<void>;
  changePlan(providerSubscriptionId: string, productId: string): Promise<void>;
}

function getProductId(planId: PlanId, interval: BillingInterval): string | null {
  const prefix = planId === 'pro' ? 'DODO_PRO' : 'DODO_STARTER';
  const key = interval === 'annual' ? `${prefix}_ANNUAL_PRODUCT_ID` : `${prefix}_PRODUCT_ID`;

  return process.env[key]?.trim() || null;
}

/**
 * Optional map for the traffic slider:
 * `{"starter:monthly:3":"pdt_x","pro:annual:5":"pdt_y"}`.
 * Exact tiers win over the plan/interval fallback. Invalid entries are logged
 * without their values and ignored, so a typo cannot silently charge a
 * different price.
 */
function getTierProducts(): BillingProduct[] {
  const raw = process.env.DODO_PRODUCT_IDS_JSON?.trim();

  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.error('billing.config.invalid_product_map', { reason: 'invalid-json' });
    return [];
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    logger.error('billing.config.invalid_product_map', { reason: 'not-an-object' });
    return [];
  }

  const products: BillingProduct[] = [];
  const pattern = /^(starter|pro):(monthly|annual):(\d+)$/;

  for (const [key, value] of Object.entries(parsed)) {
    const match = pattern.exec(key);

    if (!match || typeof value !== 'string' || !value.trim()) {
      logger.warn('billing.config.invalid_product_entry', { reason: 'invalid-key-or-id' });
      continue;
    }

    const planId = match[1] as PlanId;
    const interval = match[2] as BillingInterval;
    const tierIndex = Number(match[3]);

    if (
      !Number.isInteger(tierIndex) ||
      tierIndex < 0 ||
      tierIndex >= TRAFFIC_TIERS.length ||
      clampTrafficTierIndex(tierIndex) !== tierIndex
    ) {
      logger.warn('billing.config.invalid_product_entry', {
        planId,
        interval,
        reason: 'tier-out-of-range',
      });
      continue;
    }

    products.push({
      planId,
      interval,
      productId: value.trim(),
      tierIndex,
    });
  }

  return products;
}

/**
 * Read billing configuration from the environment. Missing values are not an
 * error: the settings page shows an honest "billing not configured" state and
 * checkout returns 503. Nothing is charged without an explicit provider setup.
 */
export function getBillingConfig(): BillingConfig | null {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();

  if (!apiKey || !webhookSecret) {
    return null;
  }

  const products: BillingProduct[] = [];
  const tierProducts = getTierProducts();

  for (const planId of PLAN_IDS) {
    for (const interval of ['monthly', 'annual'] as const) {
      const productId = getProductId(planId, interval);

      products.push(
        ...tierProducts.filter(
          product => product.planId === planId && product.interval === interval,
        ),
      );

      if (productId) {
        products.push({ planId, interval, productId });
      }
    }
  }

  // Checkout cannot work for a plan without any monthly product. Annual is
  // optional until the owner creates the annual products in Dodo.
  for (const planId of PLAN_IDS) {
    if (!products.some(product => product.planId === planId && product.interval === 'monthly')) {
      return null;
    }
  }

  return {
    providerName: 'dodo',
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
    apiKey,
    webhookSecret,
    products,
  };
}

/**
 * Find the product for a requested plan, interval, and traffic tier.
 *
 * A non-default tier is only purchasable when an exact tier product exists.
 * Falling back to the default product would charge one price and show another,
 * which is never acceptable. With no tier argument (plan changes), the plan's
 * base product is used.
 */
export function findBillingProduct(
  config: BillingConfig,
  planId: PlanId,
  interval: BillingInterval,
  tierIndex?: number,
): BillingProduct | null {
  if (tierIndex === undefined) {
    return (
      config.products.find(
        product =>
          product.planId === planId &&
          product.interval === interval &&
          product.tierIndex === undefined,
      ) ??
      config.products.find(
        product =>
          product.planId === planId &&
          product.interval === interval &&
          product.tierIndex === DEFAULT_TRAFFIC_TIER_INDEX,
      ) ??
      null
    );
  }

  const safeTierIndex = clampTrafficTierIndex(tierIndex);
  const exact = config.products.find(
    product =>
      product.planId === planId &&
      product.interval === interval &&
      product.tierIndex === safeTierIndex,
  );

  if (exact) {
    return exact;
  }

  if (safeTierIndex !== DEFAULT_TRAFFIC_TIER_INDEX) {
    return null;
  }

  return (
    config.products.find(
      product =>
        product.planId === planId &&
        product.interval === interval &&
        product.tierIndex === undefined,
    ) ?? null
  );
}

export function resolveBillingProduct(config: BillingConfig, productId: string | null | undefined) {
  if (!productId) {
    return null;
  }

  return config.products.find(product => product.productId === productId) ?? null;
}
