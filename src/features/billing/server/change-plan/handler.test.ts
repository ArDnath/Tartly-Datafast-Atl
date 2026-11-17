import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { findBillingProduct, getBillingConfig } from '@/features/billing/server/provider';
import { getDodoBillingProvider } from '@/features/billing/server/providers/dodo';
import { recordAuditEvent } from '@/queries/prisma';
import { POST } from './handler';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/workspace-auth', () => ({ requireWorkspaceAccess: vi.fn() }));
vi.mock('@/queries/prisma', () => ({ recordAuditEvent: vi.fn() }));
vi.mock('@/features/billing/server/provider', () => ({
  getBillingConfig: vi.fn(),
  findBillingProduct: vi.fn(),
}));
vi.mock('@/features/billing/server/providers/dodo', () => ({
  getDodoBillingProvider: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      platformSubscription: { findUnique: vi.fn() },
      billingSubscriptionChange: { create: vi.fn() },
    },
  },
}));

const changePlan = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { workspaceId: 'workspace-1', planId: 'pro', tierIndex: 2 },
  } as any);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({ role: 'OWNER' } as any);
  vi.mocked(getBillingConfig).mockReturnValue({
    providerName: 'dodo',
    environment: 'test_mode',
    apiKey: 'key',
    webhookSecret: 'secret',
    products: [{ planId: 'pro', interval: 'monthly', productId: 'pdt_pro_t2', tierIndex: 2 }],
  });
  vi.mocked(findBillingProduct).mockReturnValue({
    planId: 'pro',
    interval: 'monthly',
    productId: 'pdt_pro_t2',
    tierIndex: 2,
  });
  const client = (await import('@/lib/prisma')).default.client as any;
  client.platformSubscription.findUnique.mockResolvedValue({
    providerSubscriptionId: 'sub_1',
    lifecycleStatus: 'ACTIVE',
    planId: 'starter',
    interval: 'monthly',
    trafficTierIndex: 1,
  });
  client.billingSubscriptionChange.create.mockResolvedValue({});
  vi.mocked(getDodoBillingProvider).mockReturnValue({ changePlan } as any);
  changePlan.mockResolvedValue(undefined);
});

test('requests the provider plan change and records it as pending, without granting the plan', async () => {
  const response = await POST(
    new Request('https://app.example.com/api/billing/change-plan', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual({ ok: true, pending: true });
  expect(changePlan).toHaveBeenCalledWith('sub_1', 'pdt_pro_t2');
  expect(recordAuditEvent).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: 'billing.subscription.plan_change_requested' }),
  );
});

test('regression: a provider 409 (previous payment still processing) is a 409, not a 503', async () => {
  // Dodo returned exactly this on 2026-11-17 after a plan change whose
  // prorated payment was still processing; the old blind catch reported it
  // as "billing provider is unavailable".
  changePlan.mockRejectedValue(
    Object.assign(new Error('409 Cannot change plan as previous payment is not successful yet'), {
      status: 409,
      error: {
        code: 'PREVIOUS_PAYMENT_PENDING',
        message: 'Cannot change plan as previous payment is not successful yet',
      },
    }),
  );

  const response = await POST(
    new Request('https://app.example.com/api/billing/change-plan', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(409);
  expect(body.error.code).toBe('PREVIOUS_PAYMENT_PENDING');
  expect(body.error.message).toBe('Cannot change plan as previous payment is not successful yet');
});

test('a connection failure keeps the 503 with the generic message', async () => {
  changePlan.mockRejectedValue(new TypeError('fetch failed'));

  const response = await POST(
    new Request('https://app.example.com/api/billing/change-plan', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(503);
  expect(body.error.code).toBe('billing-provider-unavailable');
  expect(body.error.message).toBe('The billing provider is unavailable. Try again in a moment.');
});

test('a failed provider call never writes the change row or audit event', async () => {
  changePlan.mockRejectedValue(
    Object.assign(new Error('409 conflict'), { status: 409, error: { code: 'X', message: 'no' } }),
  );

  await POST(new Request('https://app.example.com/api/billing/change-plan', { method: 'POST' }));

  const client = (await import('@/lib/prisma')).default.client as any;
  expect(client.billingSubscriptionChange.create).not.toHaveBeenCalled();
  expect(recordAuditEvent).not.toHaveBeenCalled();
});
