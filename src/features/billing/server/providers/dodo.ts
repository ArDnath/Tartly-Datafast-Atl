import DodoPayments from 'dodopayments';
import type {
  BillingConfig,
  BillingProvider,
  CreateBillingCheckoutInput,
} from '@/features/billing/server/provider';

/**
 * Dodo Payments implementation of the platform billing contract.
 *
 * Docs used (fetched 2026-11-05, checkout fields re-verified 2026-11-12):
 * - Checkout sessions: https://docs.dodopayments.com/api-reference/checkout-sessions/create
 * - Subscription update (cancel at next billing date):
 *   https://docs.dodopayments.com/api-reference/subscriptions/patch-subscriptions
 * - Change plan: https://docs.dodopayments.com/api-reference/subscriptions/change-plan
 * - Customer portal:
 *   https://docs.dodopayments.com/api-reference/customers/create-customer-portal-session
 *
 * There is no platform-side trial: charging starts as soon as the customer
 * completes the provider checkout, and the workspace unlocks only after the
 * webhook confirms payment. Never re-introduce a provider-side trial without
 * updating docs/PLATFORM_BILLING.md and the entitlement rules together.
 */
export function createDodoBillingProvider(
  config: BillingConfig,
  client: DodoPayments = new DodoPayments({
    bearerToken: config.apiKey,
    environment: config.environment,
  }),
): BillingProvider {
  return {
    name: 'dodo',

    async createCheckout(input: CreateBillingCheckoutInput) {
      if (!input.productId) {
        throw new Error('A resolved Dodo product is required for checkout.');
      }

      const session = await client.checkoutSessions.create({
        product_cart: [{ product_id: input.productId, quantity: 1 }],
        customer: input.customer.providerCustomerId
          ? { customer_id: input.customer.providerCustomerId }
          : {
              email: input.customer.email,
              name: input.customer.name ?? undefined,
            },
        return_url: input.successUrl,
        cancel_url: input.cancelUrl,
        feature_flags: {
          redirect_immediately: true,
        },
        customization: {
          theme: 'system',
        },
        metadata: {
          workspaceId: input.workspaceId,
          planId: input.planId,
          interval: input.interval,
          tierIndex: input.tierIndex,
        },
      });

      if (!session.checkout_url) {
        throw new Error('Dodo did not return a checkout URL.');
      }

      return {
        url: session.checkout_url,
        sessionId: session.session_id,
      };
    },

    async createPortalSession(providerCustomerId: string, returnUrl: string) {
      const session = await client.customers.customerPortal.create(providerCustomerId, {
        return_url: returnUrl,
      });

      return { url: session.link };
    },

    async cancelAtPeriodEnd(providerSubscriptionId: string) {
      await client.subscriptions.update(providerSubscriptionId, {
        cancel_at_next_billing_date: true,
        cancel_reason: 'cancelled_by_customer',
      });
    },

    async changePlan(providerSubscriptionId: string, productId: string) {
      await client.subscriptions.changePlan(providerSubscriptionId, {
        product_id: productId,
        proration_billing_mode: 'prorated_immediately',
        quantity: 1,
      });
    },
  };
}

export function getDodoBillingProvider(config: BillingConfig): BillingProvider {
  return createDodoBillingProvider(config);
}
