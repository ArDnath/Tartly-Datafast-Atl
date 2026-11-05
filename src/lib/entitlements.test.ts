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
      lifecycleStatus: 'ACTIVE',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
    },
  } as any);

  const entitlements = await getWorkspaceEntitlements('workspace-1');

  expect(entitlements).toMatchObject({
    workspaceId: 'workspace-1',
    planId: 'pro',
    active: true,
    setup: false,
  });
});
