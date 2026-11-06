import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Auth } from '@/lib/types';

vi.mock('@/lib/auth', () => ({
  hasPermission: vi.fn(async () => false),
}));

vi.mock('@/queries/prisma', () => ({
  getTeamUser: vi.fn(),
  getWebsite: vi.fn(),
  getWebsiteMemberForUser: vi.fn(),
}));

const membershipFindUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      workspaceMembership: {
        findUnique: membershipFindUnique,
      },
    },
  },
}));

const { getTeamUser, getWebsite, getWebsiteMemberForUser } = await import('@/queries/prisma');
const {
  canDeleteWebsite,
  canUpdateWebsite,
  canViewWebsite,
  getWebsiteAccess,
  getWebsiteWorkspaceAccess,
} = await import('./website');

const workspaceA = {
  id: 'workspace-a',
  name: 'A',
  slug: 'a',
  ownerId: 'user-a',
  planId: 'starter',
  subscriptionStatus: 'active',
  deletedAt: null,
};

const userA = {
  id: 'user-a',
  username: 'a@example.com',
  role: 'user',
  isAdmin: false,
};

const authA = { user: userA } as Auth;

function mockMembership(workspace: typeof workspaceA | null, role = 'OWNER') {
  membershipFindUnique.mockImplementation(async ({ where }: any) => {
    if (!workspace || where.workspaceId_userId.workspaceId !== workspace.id) {
      return null;
    }

    if (where.workspaceId_userId.userId !== userA.id) {
      return null;
    }

    return { role, workspace };
  });
}

function mockWebsites() {
  vi.mocked(getWebsite).mockImplementation(async (id: string) => {
    if (id === 'website-a') {
      return { id, userId: 'user-a', teamId: null, workspaceId: 'workspace-a' } as any;
    }

    if (id === 'website-b') {
      return { id, userId: 'user-b', teamId: null, workspaceId: 'workspace-b' } as any;
    }

    if (id === 'legacy-b') {
      return { id, userId: 'user-b', teamId: null, workspaceId: null } as any;
    }

    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWebsites();
  mockMembership(workspaceA);
  vi.mocked(getTeamUser).mockResolvedValue(null);
  vi.mocked(getWebsiteMemberForUser).mockResolvedValue(null);
});

describe('workspace tenant isolation for websites', () => {
  test('OWNER can read, update, delete, and manage members of their website', async () => {
    await expect(canViewWebsite(authA, 'website-a')).resolves.toBe(true);
    await expect(canUpdateWebsite(authA, 'website-a')).resolves.toBe(true);
    await expect(canDeleteWebsite(authA, 'website-a')).resolves.toBe(true);
    await expect(getWebsiteAccess(authA, 'website-a')).resolves.toMatchObject({
      canManageMembers: true,
    });
    await expect(getWebsiteAccess(authA, 'website-a')).resolves.toMatchObject({
      role: 'owner',
      canView: true,
      canUpdate: true,
      canDelete: true,
      canManageMembers: true,
      workspaceId: 'workspace-a',
    });
  });

  test('a user cannot read another workspace website by swapping the ID', async () => {
    await expect(canViewWebsite(authA, 'website-b')).resolves.toBe(false);
    await expect(canUpdateWebsite(authA, 'website-b')).resolves.toBe(false);
    await expect(canDeleteWebsite(authA, 'website-b')).resolves.toBe(false);
    await expect(getWebsiteAccess(authA, 'website-b')).resolves.toMatchObject({
      role: null,
      canView: false,
    });
  });

  test('platform-admin status is not a tenant grant', async () => {
    const admin = { user: { ...userA, isAdmin: true } } as Auth;

    await expect(canViewWebsite(admin, 'website-b')).resolves.toBe(false);
  });

  test('VIEWER can read analytics but cannot change the website', async () => {
    mockMembership(workspaceA, 'VIEWER');

    await expect(canViewWebsite(authA, 'website-a')).resolves.toBe(true);
    await expect(canUpdateWebsite(authA, 'website-a')).resolves.toBe(false);
    await expect(canDeleteWebsite(authA, 'website-a')).resolves.toBe(false);
    await expect(getWebsiteAccess(authA, 'website-a')).resolves.toMatchObject({
      canManageMembers: false,
    });
  });

  test('MEMBER can update but not delete or manage members', async () => {
    mockMembership(workspaceA, 'MEMBER');

    await expect(canUpdateWebsite(authA, 'website-a')).resolves.toBe(true);
    await expect(canDeleteWebsite(authA, 'website-a')).resolves.toBe(false);
    await expect(getWebsiteAccess(authA, 'website-a')).resolves.toMatchObject({
      canManageMembers: false,
    });
  });

  test('unknown workspace membership fails closed', async () => {
    membershipFindUnique.mockResolvedValue(null);

    await expect(canViewWebsite(authA, 'website-a')).resolves.toBe(false);
    await expect(getWebsiteWorkspaceAccess(authA, 'website-a')).resolves.toBeNull();
  });

  test('deleted or missing workspace fails closed', async () => {
    mockMembership({ ...workspaceA, deletedAt: new Date() } as any);

    await expect(canViewWebsite(authA, 'website-a')).resolves.toBe(false);
  });

  test('legacy website without a workspace keeps owner access only', async () => {
    await expect(canViewWebsite(authA, 'legacy-b')).resolves.toBe(false);
    await expect(getWebsiteWorkspaceAccess(authA, 'legacy-b')).resolves.toBeNull();
  });

  test('share tokens grant read-only access to exactly one website', async () => {
    const shareAuth = {
      shareToken: {
        purpose: 'share',
        shareId: 'share-1',
        shareSlug: 'abc',
        shareType: 1,
        websiteId: 'website-b',
      },
    } as Auth;

    await expect(canViewWebsite(shareAuth, 'website-b')).resolves.toBe(true);
    await expect(canUpdateWebsite(shareAuth, 'website-b')).resolves.toBe(false);
    await expect(canDeleteWebsite(shareAuth, 'website-b')).resolves.toBe(false);
    await expect(canViewWebsite(shareAuth, 'website-a')).resolves.toBe(false);
  });

  test('must be at least a member to update, admin to delete', async () => {
    await expect(getWebsiteWorkspaceAccess(authA, 'website-a', 'ADMIN')).resolves.toMatchObject({
      workspaceId: 'workspace-a',
      role: 'OWNER',
    });
    mockMembership(workspaceA, 'MEMBER');
    await expect(getWebsiteWorkspaceAccess(authA, 'website-a', 'ADMIN')).resolves.toBeNull();
    await expect(getWebsiteWorkspaceAccess(authA, 'website-a', 'MEMBER')).resolves.not.toBeNull();
  });
});
