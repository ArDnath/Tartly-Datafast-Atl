import { expect, test, vi } from 'vitest';
import type { BillingConfig } from '@/features/billing/server/provider';
import { createDodoBillingProvider } from './dodo';

const config: BillingConfig = {
  providerName: 'dodo',
  environment: 'test_mode',
  apiKey: 'test-key',
  webhookSecret: 'test-secret',
  products: [],
};

function fakeClient() {
  return {
    checkoutSessions: {
      create: vi.fn().mockResolvedValue({
        checkout_url: 'https://checkout.example.com/session',
        session_id: 'cks_1',
      }),
    },
    customers: {
      customerPortal: {
        create: vi.fn().mockResolvedValue({ link: 'https://portal.example.com/session' }),
      },
    },
    subscriptions: {
      update: vi.fn().mockResolvedValue(undefined),
      changePlan: vi.fn().mockResolvedValue(undefined),
    },
  } as any;
}

test('creates a paid checkout without a second provider-side trial', async () => {
  const client = fakeClient();
  const provider = createDodoBillingProvider(config, client);

  const session = await provider.createCheckout({
    workspaceId: 'workspace-1',
    planId: 'pro',
    interval: 'monthly',
    tierIndex: 3,
    productId: 'pdt_pro',
    customer: { email: 'owner@example.com', name: 'Owner' },
    successUrl: 'https://tartly.test/app?checkout=success',
    cancelUrl: 'https://tartly.test/app?checkout=cancelled',
  });

  expect(session.url).toBe('https://checkout.example.com/session');
  expect(client.checkoutSessions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      product_cart: [{ product_id: 'pdt_pro', quantity: 1 }],
      metadata: {
        workspaceId: 'workspace-1',
        planId: 'pro',
        interval: 'monthly',
        tierIndex: 3,
      },
      feature_flags: { redirect_immediately: true },
    }),
  );
  expect(client.checkoutSessions.create.mock.calls[0][0]).not.toHaveProperty('subscription_data');
});

test('rejects an empty resolved product id', async () => {
  const provider = createDodoBillingProvider(config, fakeClient());

  await expect(
    provider.createCheckout({
      workspaceId: 'workspace-1',
      planId: 'pro',
      interval: 'monthly',
      tierIndex: 3,
      productId: '',
      customer: { email: 'owner@example.com' },
      successUrl: 'https://tartly.test/app',
      cancelUrl: 'https://tartly.test/app',
    }),
  ).rejects.toThrow('A resolved Dodo product is required');
});
