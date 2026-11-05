import { beforeEach, describe, expect, test, vi } from 'vitest';

const workspaceInvitation = {
  upsert: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
};
const workspaceMembership = {
  count: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
};
const user = { findFirst: vi.fn() };
const transaction = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      workspaceInvitation,
      workspaceMembership,
      user,
    },
    transaction,
  },
}));

vi.mock('@/lib/email', () => ({
  sendWorkspaceInvitationEmail: vi.fn(async () => undefined),
}));

vi.mock('@/lib/workspace-auth', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/workspace-auth')>();

  return {
    ...actual,
    requireWorkspaceAccess: vi.fn(),
  };
});

vi.mock('@/lib/entitlements', () => ({
  getWorkspaceEntitlements: vi.fn(async () => ({
    workspaceId: 'workspace-a',
    planId: 'pro',
    plan: { name: 'Pro' },
    subscriptionStatus: 'active',
    active: true,
  })),
  getMemberLimit: vi.fn(() => 5),
}));

const { requireWorkspaceAccess } = await import('@/lib/workspace-auth');
const { sendWorkspaceInvitationEmail } = await import('@/lib/email');
const {
  acceptWorkspaceInvitation,
  createWorkspaceInvitation,
  hashInvitationToken,
  InvitationError,
  previewWorkspaceInvitation,
  revokeWorkspaceInvitation,
} = await import('./workspace-invitations');

const auth = {
  user: { id: 'user-a', username: 'owner@example.com', role: 'user', isAdmin: false },
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({
    workspaceId: 'workspace-a',
    role: 'OWNER',
    workspace: {
      id: 'workspace-a',
      name: 'Acme',
      slug: 'acme',
      ownerId: 'user-a',
      planId: 'pro',
      subscriptionStatus: 'active',
    },
  });
  workspaceMembership.count.mockResolvedValue(1);
  workspaceInvitation.count.mockResolvedValue(0);
  user.findFirst.mockResolvedValue(null);
  workspaceInvitation.upsert.mockImplementation(async ({ create }: any) => ({
    id: 'invite-1',
    email: create.email,
    role: create.role,
    expiresAt: create.expiresAt,
    createdAt: new Date(),
  }));
});

describe('workspace invitations', () => {
  test('stores only a hash of the invitation token and emails a one-time link', async () => {
    const invitation = await createWorkspaceInvitation({
      user: auth.user,
      workspaceId: 'workspace-a',
      email: 'Member@Example.com',
      role: 'MEMBER',
    });

    expect(invitation.email).toBe('member@example.com');
    expect(invitation.token).toMatch(/^[a-f0-9]{64}$/);
    expect(workspaceInvitation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: 'member@example.com',
          invitationTokenHash: hashInvitationToken(invitation.token),
        }),
      }),
    );
    expect(
      workspaceInvitation.upsert.mock.calls[0][0].create.invitationTokenHash,
    ).not.toBe(invitation.token);
    expect(sendWorkspaceInvitationEmail).toHaveBeenCalledTimes(1);
  });

  test('refuses to exceed the plan member allowance', async () => {
    workspaceMembership.count.mockResolvedValue(5);

    await expect(
      createWorkspaceInvitation({
        user: auth.user,
        workspaceId: 'workspace-a',
        email: 'member@example.com',
        role: 'MEMBER',
      }),
    ).rejects.toMatchObject({ code: 'member-limit' });
    expect(workspaceInvitation.upsert).not.toHaveBeenCalled();
  });

  test('refuses an invitation for an existing member', async () => {
    user.findFirst.mockResolvedValue({
      id: 'user-b',
      workspaceMemberships: [{ id: 'membership-1' }],
    });

    await expect(
      createWorkspaceInvitation({
        user: auth.user,
        workspaceId: 'workspace-a',
        email: 'member@example.com',
        role: 'MEMBER',
      }),
    ).rejects.toMatchObject({ code: 'already-member' });
  });

  test('accepts a valid invitation only for the invited email', async () => {
    const invitation = {
      id: 'invite-1',
      workspaceId: 'workspace-a',
      email: 'member@example.com',
      role: 'MEMBER',
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      workspace: { name: 'Acme', deletedAt: null },
    };
    workspaceInvitation.findFirst.mockResolvedValue(invitation);
    workspaceMembership.findUnique.mockResolvedValue(null);
    transaction.mockImplementation(async (fn: any) => fn({ workspaceMembership, workspaceInvitation }));

    const result = await acceptWorkspaceInvitation({
      user: { ...auth.user, username: 'member@example.com' },
      token: 'valid-token',
    });

    expect(result).toMatchObject({ workspaceId: 'workspace-a', role: 'MEMBER' });
    expect(workspaceMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'MEMBER', userId: 'user-a' }),
      }),
    );
    expect(workspaceInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { acceptedAt: expect.any(Date) } }),
    );
  });

  test('rejects an invitation used by the wrong account', async () => {
    workspaceInvitation.findFirst.mockResolvedValue({
      id: 'invite-1',
      workspaceId: 'workspace-a',
      email: 'member@example.com',
      role: 'MEMBER',
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      workspace: { name: 'Acme', deletedAt: null },
    });

    await expect(
      acceptWorkspaceInvitation({
        user: { ...auth.user, username: 'someone-else@example.com' },
        token: 'valid-token',
      }),
    ).rejects.toMatchObject({ code: 'email-mismatch' });
  });

  test('rejects expired and already accepted invitations', async () => {
    workspaceInvitation.findFirst.mockResolvedValueOnce({
      id: 'invite-1',
      workspaceId: 'workspace-a',
      email: 'member@example.com',
      role: 'MEMBER',
      expiresAt: new Date(Date.now() - 1),
      acceptedAt: null,
      workspace: { name: 'Acme', deletedAt: null },
    });

    await expect(
      acceptWorkspaceInvitation({
        user: { ...auth.user, username: 'member@example.com' },
        token: 'expired-token',
      }),
    ).rejects.toMatchObject({ code: 'expired' });

    workspaceInvitation.findFirst.mockResolvedValueOnce({
      id: 'invite-1',
      workspaceId: 'workspace-a',
      email: 'member@example.com',
      role: 'MEMBER',
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: new Date(),
      workspace: { name: 'Acme', deletedAt: null },
    });

    await expect(
      acceptWorkspaceInvitation({
        user: { ...auth.user, username: 'member@example.com' },
        token: 'used-token',
      }),
    ).rejects.toMatchObject({ code: 'already-accepted' });
  });

  test('preview reports invalid tokens as null', async () => {
    workspaceInvitation.findFirst.mockResolvedValue(null);

    await expect(previewWorkspaceInvitation('bad-token')).resolves.toBeNull();
  });

  test('only admins can revoke an invitation', async () => {
    vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

    await expect(
      revokeWorkspaceInvitation({
        user: auth.user,
        workspaceId: 'workspace-a',
        invitationId: 'invite-1',
      }),
    ).rejects.toBeInstanceOf(InvitationError);
  });
});
