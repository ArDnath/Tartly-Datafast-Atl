import type { BillingInterval } from '@/lib/billing-lifecycle';
import { PLAN_IDS, type PlanId } from '@/lib/plans';

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
  customer: BillingCheckoutCustomer;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  readonly name: string;
  createCheckout(input: CreateBillingCheckoutInput): Promise<{ url: string; sessionId: string }>;
  createPortalSession(
    providerCustomerId: string,
    returnUrl: string,
  ): Promise<{ url: string }>;
  cancelAtPeriodEnd(providerSubscriptionId: string): Promise<void>;
  changePlan(providerSubscriptionId: string, productId: string): Promise<void>;
}

function getProductId(planId: PlanId, interval: BillingInterval): string | null {
  const prefix = planId === 'pro' ? 'DODO_PRO' : 'DODO_STARTER';
  const key = interval === 'annual' ? `${prefix}_ANNUAL_PRODUCT_ID` : `${prefix}_PRODUCT_ID`;

  return process.env[key]?.trim() || null;
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

  for (const planId of PLAN_IDS) {
    for (const interval of ['monthly', 'annual'] as const) {
      const productId = getProductId(planId, interval);

      if (productId) {
        products.push({ planId, interval, productId });
      }
    }
  }

  // Checkout cannot work for a plan without its monthly product. Annual is
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

export function findBillingProduct(
  config: BillingConfig,
  planId: PlanId,
  interval: BillingInterval,
): BillingProduct | null {
  return (
    config.products.find(product => product.planId === planId && product.interval === interval) ??
    null
  );
}

export function resolveBillingProduct(config: BillingConfig, productId: string | null | undefined) {
  if (!productId) {
    return null;
  }

  return config.products.find(product => product.productId === productId) ?? null;
}
