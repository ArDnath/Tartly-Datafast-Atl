import { beforeEach, expect, test, vi } from 'vitest';
import { SETUP_MEMBERS, SETUP_WEBSITES } from '@/lib/plans';
import prisma from '@/lib/prisma';
import {
  entitlementsHaveFeature,
  getMemberLimit,
  getWebsiteLimit,
  getWorkspaceEntitlements,
} from './entitlements';

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
    setup: false,
  });
  expect(entitlements?.plan?.eventsPerMonth).toBe(10_000_000);
});

test('an unpaid workspace gets onboarding setup allowances but no paid access', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue({
    id: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    platformSubscription: null,
  } as any);

  const entitlements = await getWorkspaceEntitlements('workspace-1');

  expect(entitlements).toMatchObject({
    active: false,
    setup: true,
  });
  expect(getWebsiteLimit(entitlements)).toBe(SETUP_WEBSITES);
  expect(getMemberLimit(entitlements)).toBe(SETUP_MEMBERS);
  expect(entitlementsHaveFeature(entitlements, 'revenue_attribution')).toBe(false);
});

test('a trialing legacy subscription still counts as paid access', async () => {
  vi.mocked(prisma.client.workspace.findFirst as any).mockResolvedValue({
    id: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    platformSubscription: {
      planId: 'starter',
      trafficTierIndex: null,
      lifecycleStatus: 'TRIALING',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
    },
  } as any);

  const entitlements = await getWorkspaceEntitlements('workspace-1');

  expect(entitlements).toMatchObject({ active: true, setup: false });
  expect(getWebsiteLimit(entitlements)).toBe(1);
});
