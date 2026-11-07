import DodoPayments from 'dodopayments';
import type {
  BillingConfig,
  BillingProvider,
  CreateBillingCheckoutInput,
} from '@/features/billing/server/provider';
import { getPlan } from '@/lib/plans';

/**
 * Dodo Payments implementation of the platform billing contract.
 *
 * Docs used (fetched 2026-11-05):
 * - Checkout sessions: https://docs.dodopayments.com/api-reference/checkout-sessions/create
 * - Subscription update (cancel at next billing date):
 *   https://docs.dodopayments.com/api-reference/subscriptions/patch-subscriptions
 * - Change plan: https://docs.dodopayments.com/api-reference/subscriptions/change-plan
 * - Customer portal:
 *   https://docs.dodopayments.com/api-reference/customers/create-customer-portal-session
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
      const product = config.products.find(
        item => item.planId === input.planId && item.interval === input.interval,
      );

      if (!product) {
        throw new Error(`No Dodo product configured for ${input.planId}/${input.interval}.`);
      }

      const session = await client.checkoutSessions.create({
        product_cart: [{ product_id: product.productId, quantity: 1 }],
        customer: input.customer.providerCustomerId
          ? { customer_id: input.customer.providerCustomerId }
          : {
              email: input.customer.email,
              name: input.customer.name ?? undefined,
            },
        return_url: input.successUrl,
        cancel_url: input.cancelUrl,
        subscription_data: {
          trial_period_days: getPlan(input.planId).trialDays,
        },
        metadata: {
          workspaceId: input.workspaceId,
          planId: input.planId,
          interval: input.interval,
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
