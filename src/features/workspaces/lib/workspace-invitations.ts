import type { Auth } from '@/lib/types';
import { hash, uuid } from '@/lib/crypto';
import { getWorkspaceEntitlements, getMemberLimit } from '@/lib/entitlements';
import { sendWorkspaceInvitationEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import {
  hasMinimumRole,
  requireWorkspaceAccess,
  type WorkspaceRole,
  isWorkspaceRole,
} from '@/lib/workspace-auth';

export type InvitationRole = Exclude<WorkspaceRole, 'OWNER'>;

export const INVITABLE_ROLES: readonly InvitationRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];
export const INVITATION_TTL_DAYS = 7;

export class InvitationError extends Error {
  code:
    | 'not-found'
    | 'expired'
    | 'already-accepted'
    | 'email-mismatch'
    | 'role-invalid'
    | 'member-limit'
    | 'already-member'
    | 'owner-role';

  constructor(code: InvitationError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeInvitationEmail(value: string) {
  return value.trim().toLowerCase();
}

export function createInvitationToken() {
  return `${uuid().replace(/-/g, '')}${uuid().replace(/-/g, '')}`;
}

export function hashInvitationToken(token: string) {
  return hash('workspace-invitation:', token);
}

export function buildInvitationUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, '')}/invite/${token}`;
}

export async function countWorkspaceSeats(workspaceId: string) {
  const [members, pending] = await Promise.all([
    prisma.client.workspaceMembership.count({ where: { workspaceId } }),
    prisma.client.workspaceInvitation.count({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);

  return members + pending;
}

export async function createWorkspaceInvitation({
  user,
  workspaceId,
  email,
  role,
  origin,
}: {
  user: Auth['user'] | null | undefined;
  workspaceId: string;
  email: string;
  role: InvitationRole;
  origin?: string;
}) {
  const access = await requireWorkspaceAccess(user, workspaceId, 'ADMIN');

  if (!access) {
    throw new InvitationError('not-found', 'You cannot invite members to this workspace.');
  }

  const normalizedEmail = normalizeInvitationEmail(email);

  const existingUser = (await prisma.client.user.findFirst({
    where: { username: normalizedEmail, deletedAt: null },
    select: {
      id: true,
      workspaceMemberships: {
        where: { workspaceId },
        select: { id: true },
      },
    },
  })) as any;

  if (existingUser?.workspaceMemberships.length) {
    throw new InvitationError('already-member', 'That person is already a member.');
  }

  const entitlements = await getWorkspaceEntitlements(workspaceId);
  const limit = getMemberLimit(entitlements);

  if (limit <= 0 || (await countWorkspaceSeats(workspaceId)) >= limit) {
    throw new InvitationError(
      'member-limit',
      `Your ${entitlements?.plan?.name || 'current'} plan includes ${limit} member${limit === 1 ? '' : 's'}. Upgrade to invite more.`,
    );
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.client.workspaceInvitation.upsert({
    where: {
      workspaceId_email: {
        workspaceId,
        email: normalizedEmail,
      },
    },
    create: {
      id: uuid(),
      workspaceId,
      email: normalizedEmail,
      role,
      invitationTokenHash: tokenHash,
      invitedBy: user?.id,
      expiresAt,
    },
    update: {
      role,
      invitationTokenHash: tokenHash,
      expiresAt,
      acceptedAt: null,
      invitedBy: user?.id,
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  let emailDelivered = true;

  try {
    await sendWorkspaceInvitationEmail({
      to: normalizedEmail,
      workspaceName: access.workspace.name,
      inviterName: user?.username || 'A workspace owner',
      role,
      inviteUrl: buildInvitationUrl(
        origin || process.env.APP_URL || 'http://localhost:3000',
        token,
      ),
      expiresAt,
    });
  } catch {
    emailDelivered = false;
  }

  // The plaintext token is intentionally not returned to the client. It is
  // delivered by email (or the local .dev-emails/outbox.log in development).
  return { ...invitation, emailDelivered };
}

export async function listWorkspaceInvitations({
  user,
  workspaceId,
}: {
  user: Auth['user'] | null | undefined;
  workspaceId: string;
}) {
  const access = await requireWorkspaceAccess(user, workspaceId, 'ADMIN');

  if (!access) {
    return null;
  }

  return prisma.client.workspaceInvitation.findMany({
    where: { workspaceId, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: true,
    },
  });
}

export async function revokeWorkspaceInvitation({
  user,
  workspaceId,
  invitationId,
}: {
  user: Auth['user'] | null | undefined;
  workspaceId: string;
  invitationId: string;
}) {
  const access = await requireWorkspaceAccess(user, workspaceId, 'ADMIN');

  if (!access) {
    throw new InvitationError('not-found', 'Invitation not found.');
  }

  const invitation = await prisma.client.workspaceInvitation.findFirst({
    where: { id: invitationId, workspaceId },
    select: { id: true },
  });

  if (!invitation) {
    throw new InvitationError('not-found', 'Invitation not found.');
  }

  await prisma.client.workspaceInvitation.delete({ where: { id: invitationId } });

  return true;
}

export async function previewWorkspaceInvitation(token: string) {
  const invitation = await prisma.client.workspaceInvitation.findFirst({
    where: { invitationTokenHash: hashInvitationToken(token) },
    select: {
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      workspace: { select: { name: true, slug: true } },
    },
  });

  if (!invitation) {
    return null;
  }

  return {
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    accepted: Boolean(invitation.acceptedAt),
    expired: invitation.expiresAt.getTime() <= Date.now(),
    workspace: invitation.workspace,
  };
}

export async function acceptWorkspaceInvitation({
  user,
  token,
}: {
  user: Auth['user'];
  token: string;
}) {
  const invitation = await prisma.client.workspaceInvitation.findFirst({
    where: { invitationTokenHash: hashInvitationToken(token) },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      workspace: { select: { name: true, deletedAt: true } },
    },
  });

  if (!invitation || invitation.workspace.deletedAt) {
    throw new InvitationError('not-found', 'This invitation is not valid.');
  }

  if (invitation.acceptedAt) {
    throw new InvitationError('already-accepted', 'This invitation was already accepted.');
  }

  if (invitation.expiresAt.getTime() <= Date.now()) {
    throw new InvitationError('expired', 'This invitation has expired.');
  }

  if (normalizeInvitationEmail(invitation.email) !== normalizeInvitationEmail(user.username)) {
    throw new InvitationError('email-mismatch', 'Sign in with the email address that was invited.');
  }

  if (!isWorkspaceRole(invitation.role) || invitation.role === 'OWNER') {
    throw new InvitationError('role-invalid', 'This invitation has an invalid role.');
  }

  return prisma.transaction(async (tx: any) => {
    const existing = await tx.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
        },
      },
      select: { role: true },
    });

    if (!existing) {
      await tx.workspaceMembership.create({
        data: {
          id: uuid(),
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
        },
      });
    }

    await tx.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspace.name,
      role:
        existing && hasMinimumRole(existing.role as WorkspaceRole, invitation.role as WorkspaceRole)
          ? existing.role
          : invitation.role,
    };
  });
}
