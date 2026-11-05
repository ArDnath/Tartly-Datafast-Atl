import type { Auth } from '@/lib/types';
import prisma from '@/lib/prisma';
import {
  hasMinimumRole,
  requireWorkspaceAccess,
  type WorkspaceRole,
  isWorkspaceRole,
} from '@/lib/workspace-auth';

export class MemberError extends Error {
  code: 'not-found' | 'owner-protected' | 'role-invalid' | 'cannot-remove-self';

  constructor(code: MemberError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

export async function listWorkspaceMembers({
  user,
  workspaceId,
}: {
  user: Auth['user'] | null | undefined;
  workspaceId: string;
}) {
  const access = await requireWorkspaceAccess(user, workspaceId, 'VIEWER');

  if (!access) {
    return null;
  }

  return prisma.client.workspaceMembership.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      userId: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });
}

export async function updateWorkspaceMemberRole({
  user,
  workspaceId,
  memberId,
  role,
}: {
  user: Auth['user'];
  workspaceId: string;
  memberId: string;
  role: string;
}) {
  const access = await requireWorkspaceAccess(user, workspaceId, 'OWNER');

  if (!access) {
    throw new MemberError('not-found', 'Member not found.');
  }

  if (!isWorkspaceRole(role) || role === 'OWNER') {
    throw new MemberError('role-invalid', 'Use the ownership transfer flow to change an owner.');
  }

  const member = await prisma.client.workspaceMembership.findFirst({
    where: { id: memberId, workspaceId },
    select: { id: true, role: true, userId: true },
  });

  if (!member) {
    throw new MemberError('not-found', 'Member not found.');
  }

  if (member.role === 'OWNER') {
    throw new MemberError('owner-protected', 'The workspace owner cannot be demoted here.');
  }

  if (member.userId === user.id) {
    throw new MemberError('cannot-remove-self', 'You cannot change your own role.');
  }

  await prisma.client.workspaceMembership.update({
    where: { id: memberId },
    data: { role },
  });

  return { id: memberId, role };
}

export async function removeWorkspaceMember({
  user,
  workspaceId,
  memberId,
}: {
  user: Auth['user'];
  workspaceId: string;
  memberId: string;
}) {
  const access = await requireWorkspaceAccess(user, workspaceId, 'ADMIN');

  if (!access) {
    throw new MemberError('not-found', 'Member not found.');
  }

  const member = await prisma.client.workspaceMembership.findFirst({
    where: { id: memberId, workspaceId },
    select: { id: true, role: true, userId: true },
  });

  if (!member) {
    throw new MemberError('not-found', 'Member not found.');
  }

  if (member.role === 'OWNER') {
    throw new MemberError('owner-protected', 'The workspace owner cannot be removed.');
  }

  if (member.userId === user.id) {
    throw new MemberError('cannot-remove-self', 'Use "leave workspace" instead.');
  }

  if (
    member.role === 'ADMIN' &&
    !hasMinimumRole(access.role as WorkspaceRole, 'OWNER')
  ) {
    throw new MemberError('not-found', 'Only the owner can remove an admin.');
  }

  await prisma.client.workspaceMembership.delete({ where: { id: memberId } });

  return true;
}
