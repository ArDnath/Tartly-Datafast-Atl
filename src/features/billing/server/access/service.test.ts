import { beforeEach, expect, test, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getBillingConfig } from '@/features/billing/server/provider';
import { getWorkspaceBillingAccess } from './service';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      workspace: { findFirst: vi.fn() },
    },
  },
}));

vi.mock('@/features/billing/server/provider', () => ({
  getBillingConfig: vi.fn(),
}));

const now = new Date('2026-11-12T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBillingConfig).mockReturnValue({
    providerName: 'dodo',
    environment: 'test_mode',
    apiKey: 'key',
    webhookSecret: 'secret',
    products: [{ planId: 'starter', interval: 'monthly', productId: 'pdt', tierIndex: 3 }],
  });
});

test('a confirmed subscription is paid and needs no checkout', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue({
    id: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    platformSubscription: {
      planId: 'pro',
      interval: 'annual',
      trafficTierIndex: 5,
      lifecycleStatus: 'ACTIVE',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
    },
  });

  const access = await getWorkspaceBillingAccess('workspace-1', now);

  expect(access).toMatchObject({
    workspaceId: 'workspace-1',
    paid: true,
    requiresPayment: false,
    subscription: { planId: 'pro', interval: 'annual', trafficTierIndex: 5 },
  });
});

test('an unpaid workspace requires payment and advertises available products', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue({
    id: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    platformSubscription: null,
  });

  const access = await getWorkspaceBillingAccess('workspace-1', now);

  expect(access).toMatchObject({
    paid: false,
    requiresPayment: true,
    configured: true,
  });
  expect(access?.availableProducts).toEqual([
    { planId: 'starter', interval: 'monthly', tierIndex: 3 },
  ]);
});

test('a missing or suspended workspace has no access record', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue(null);

  await expect(getWorkspaceBillingAccess('workspace-1', now)).resolves.toBeNull();
});
