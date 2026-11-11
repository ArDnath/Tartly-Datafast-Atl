import { beforeEach, expect, test, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getWorkspaceEntitlements } from './entitlements';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      workspace: { findFirst: vi.fn() },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('a suspended workspace has no entitlements', async () => {
  // The query itself filters suspended_at; a suspended row therefore resolves
  // to null and the collector rejects before any write.
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue(null);

  await expect(getWorkspaceEntitlements('workspace-1')).resolves.toBeNull();
  expect(prisma.client.workspace.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'workspace-1', deletedAt: null, suspendedAt: null },
    }),
  );
});

test('an active platform subscription is paid and is not a setup allowance', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue({
    id: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    platformSubscription: {
      planId: 'pro',
      trafficTierIndex: 6,
      lifecycleStatus: 'ACTIVE',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
    },
  } as any);

  const entitlements = await getWorkspaceEntitlements('workspace-1');

  expect(entitlements).toMatchObject({
    workspaceId: 'workspace-1',
    planId: 'pro',
    trafficTierIndex: 6,
    active: true,
    trial: false,
    setup: false,
  });
  expect(entitlements?.plan?.eventsPerMonth).toBe(10_000_000);
});

test('an expired trial has no website or member allowance', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue({
    id: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    platformSubscription: null,
  } as any);

  const entitlements = await getWorkspaceEntitlements(
    'workspace-1',
    new Date('2026-11-12T00:00:00.000Z'),
  );

  expect(entitlements).toMatchObject({
    active: false,
    trial: false,
    setup: true,
    trialDaysRemaining: 0,
  });
});

test('a live trial keeps the setup allowances but not paid features', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue({
    id: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    createdAt: new Date('2026-11-10T00:00:00.000Z'),
    platformSubscription: null,
  } as any);

  const entitlements = await getWorkspaceEntitlements(
    'workspace-1',
    new Date('2026-11-12T00:00:00.000Z'),
  );

  expect(entitlements).toMatchObject({
    active: false,
    trial: true,
    setup: true,
    trialDaysRemaining: 5,
  });
});
