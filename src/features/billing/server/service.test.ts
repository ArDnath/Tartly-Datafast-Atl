import { beforeEach, describe, expect, test, vi } from 'vitest';
import { processDodoWebhook } from '@/features/billing/server/service';
import type { BillingConfig } from '@/features/billing/server/provider';

const mocks = vi.hoisted(() => ({
  billingEvent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  platformSubscription: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  billingCustomer: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  billingInvoice: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  workspace: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
      billingEvent: mocks.billingEvent,
      platformSubscription: mocks.platformSubscription,
      billingCustomer: mocks.billingCustomer,
      billingInvoice: mocks.billingInvoice,
      billingSubscriptionChange: { create: vi.fn() },
      workspace: mocks.workspace,
    },
  },
}));

const { billingEvent, platformSubscription, billingCustomer, billingInvoice, workspace } = mocks;

const config: BillingConfig = {
  providerName: 'dodo',
  environment: 'test_mode',
  apiKey: 'test-key',
  webhookSecret: 'test-secret',
  products: [{ planId: 'pro', interval: 'monthly', productId: 'pdt_pro' }],
};

const eventAt = new Date('2026-11-05T12:00:00.000Z');

function subscriptionPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'subscription.active',
    data: {
      subscription_id: 'sub_1',
      status: 'active',
      customer: { customer_id: 'cus_1', email: 'owner@example.com' },
      product_id: 'pdt_pro',
      currency: 'USD',
      recurring_pre_tax_amount: 1499,
      previous_billing_date: '2026-11-05T00:00:00Z',
      next_billing_date: '2026-12-05T00:00:00Z',
      created_at: '2026-11-05T00:00:00Z',
      cancel_at_next_billing_date: false,
      metadata: { workspaceId: 'workspace-1', planId: 'pro', interval: 'monthly' },
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  billingEvent.create.mockResolvedValue({});
  billingEvent.updateMany.mockResolvedValue({});
  workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
  workspace.update.mockResolvedValue({});
  platformSubscription.upsert.mockResolvedValue({});
  platformSubscription.findUnique.mockResolvedValue(null);
  platformSubscription.findFirst.mockResolvedValue(null);
  billingCustomer.upsert.mockResolvedValue({});
  billingCustomer.findFirst.mockResolvedValue(null);
  billingInvoice.upsert.mockResolvedValue({});
});

describe('platform billing webhook reducer', () => {
  test('activates a confirmed subscription from a verified event', async () => {
    const result = await processDodoWebhook(
      {
        id: 'msg_1',
        type: 'subscription.active',
        timestamp: eventAt,
        payload: subscriptionPayload(),
      },
      config,
    );

    expect(result).toBe('processed');
    expect(platformSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'workspace-1' },
        create: expect.objectContaining({
          planId: 'pro',
          lifecycleStatus: 'ACTIVE',
          providerSubscriptionId: 'sub_1',
        }),
      }),
    );
    expect(workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { planId: 'pro', subscriptionStatus: 'ACTIVE' },
      }),
    );
  });

  test('ignores a replay of an already-processed webhook', async () => {
    billingEvent.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 'P2002' }));
    billingEvent.findUnique.mockResolvedValue({ processingStatus: 'processed' });

    const event = {
      id: 'msg_1',
      type: 'subscription.active',
      timestamp: eventAt,
      payload: subscriptionPayload(),
    };

    expect(await processDodoWebhook(event, config)).toBe('processed');
    expect(await processDodoWebhook(event, config)).toBe('duplicate');
    expect(platformSubscription.upsert).toHaveBeenCalledTimes(1);
  });

  test('does not let an older snapshot overwrite newer state', async () => {
    platformSubscription.findUnique.mockResolvedValue({
      lastEventAt: new Date('2026-11-06T00:00:00Z'),
      lastEventPriority: 80,
      planId: 'pro',
    });

    const result = await processDodoWebhook(
      {
        id: 'msg_2',
        type: 'subscription.updated',
        timestamp: eventAt,
        payload: subscriptionPayload({ type: 'subscription.updated' }),
      },
      config,
    );

    expect(result).toBe('ignored');
    expect(platformSubscription.upsert).not.toHaveBeenCalled();
    expect(workspace.update).not.toHaveBeenCalled();
  });

  test('records an unmatched event without guessing a tenant', async () => {
    workspace.findFirst.mockResolvedValue(null);

    const result = await processDodoWebhook(
      {
        id: 'msg_3',
        type: 'subscription.active',
        timestamp: eventAt,
        payload: subscriptionPayload({ metadata: {} }),
      },
      config,
    );

    expect(result).toBe('unmatched');
    expect(platformSubscription.upsert).not.toHaveBeenCalled();
    expect(billingEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processingStatus: 'unmatched' }),
      }),
    );
  });

  test('stores only provider-issued invoices', async () => {
    const result = await processDodoWebhook(
      {
        id: 'msg_4',
        type: 'payment.succeeded',
        timestamp: eventAt,
        payload: {
          type: 'payment.succeeded',
          data: {
            payment_id: 'pay_1',
            subscription_id: 'sub_1',
            total_amount: 1499,
            currency: 'USD',
            created_at: '2026-11-05T12:00:00Z',
            status: 'succeeded',
            invoice_id: 'inv_1',
            invoice_url: 'https://example.com/invoice.pdf',
            metadata: { workspaceId: 'workspace-1' },
          },
        },
      },
      config,
    );

    expect(result).toBe('processed');
    expect(billingInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          providerName_providerInvoiceId: {
            providerName: 'dodo',
            providerInvoiceId: 'inv_1',
          },
        },
        create: expect.objectContaining({
          workspaceId: 'workspace-1',
          status: 'paid',
          amountCents: 1499,
        }),
      }),
    );
  });

  test('rejects a plan it cannot resolve instead of defaulting to Starter', async () => {
    const result = await processDodoWebhook(
      {
        id: 'msg_5',
        type: 'subscription.active',
        timestamp: eventAt,
        payload: subscriptionPayload({
          product_id: 'pdt_unknown',
          metadata: { workspaceId: 'workspace-1' },
        }),
      },
      config,
    );

    expect(result).toBe('unsupported');
    expect(platformSubscription.upsert).not.toHaveBeenCalled();
  });
});
