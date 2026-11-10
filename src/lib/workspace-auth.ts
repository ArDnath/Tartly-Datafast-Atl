import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import type { Auth } from '@/lib/types';

/**
 * The only workspace permission module. New SaaS routes must call
 * `requireWorkspaceAccess` or `requireWebsiteAccess` instead of inventing
 * their own checks.
 *
 * The legacy self-hosted code still uses `src/permissions/*` (user/team/
 * website-member). Phase 2 migrates those call sites; until then this module
 * is the authority for every workspace-aware route.
 */

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export type WorkspaceAction =
  | 'workspace:read'
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:transfer'
  | 'billing:manage'
  | 'website:create'
  | 'website:read'
  | 'website:update'
  | 'website:delete'
  | 'members:manage'
  | 'integrations:manage'
  | 'analytics:read'
  | 'exports:read';

const ROLE_ACTIONS: Record<WorkspaceRole, readonly WorkspaceAction[]> = {
  OWNER: [
    'workspace:read',
    'workspace:update',
    'workspace:delete',
    'workspace:transfer',
    'billing:manage',
    'website:create',
    'website:read',
    'website:update',
    'website:delete',
    'members:manage',
    'integrations:manage',
    'analytics:read',
    'exports:read',
  ],
  ADMIN: [
    'workspace:read',
    'workspace:update',
    'website:create',
    'website:read',
    'website:update',
    'website:delete',
    'members:manage',
    'integrations:manage',
    'analytics:read',
    'exports:read',
  ],
  MEMBER: ['workspace:read', 'website:read', 'website:update', 'analytics:read', 'exports:read'],
  VIEWER: ['workspace:read', 'website:read', 'analytics:read'],
};

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === 'string' && (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function canWorkspace(role: WorkspaceRole, action: WorkspaceAction) {
  return ROLE_ACTIONS[role].includes(action);
}

export function hasMinimumRole(role: WorkspaceRole, minimum: WorkspaceRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export interface WorkspaceAccess {
  workspaceId: string;
  role: WorkspaceRole;
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    ownerId: string;
    planId: string | null;
    subscriptionStatus: string;
  };
}

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const membership = await prisma.client.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          ownerId: true,
          planId: true,
          subscriptionStatus: true,
          deletedAt: true,
          suspendedAt: true,
        },
      },
    },
  });

  if (!membership || membership.workspace.deletedAt || membership.workspace.suspendedAt) {
    return null;
  }

  if (!isWorkspaceRole(membership.role)) {
    return null;
  }

  return {
    role: membership.role,
    workspace: membership.workspace,
  };
}

/**
 * Resolve a workspace and enforce a minimum role. Returns null (never throws)
 * so callers can decide between 403 and 404 without leaking existence.
 *
 * Platform admins are intentionally NOT auto-authorized here. The internal
 * admin console must use a separate, audited path.
 */
export async function requireWorkspaceAccess(
  user: Auth['user'] | null | undefined,
  workspaceId: string,
  minimum: WorkspaceRole = 'VIEWER',
): Promise<WorkspaceAccess | null> {
  if (!user?.id || !workspaceId) {
    return null;
  }

  const membership = await getWorkspaceMembership(user.id, workspaceId);

  if (!membership || !hasMinimumRole(membership.role, minimum)) {
    return null;
  }

  return {
    workspaceId: membership.workspace.id,
    role: membership.role,
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      logoUrl: membership.workspace.logoUrl,
      ownerId: membership.workspace.ownerId,
      planId: membership.workspace.planId,
      subscriptionStatus: membership.workspace.subscriptionStatus,
    },
  };
}

/**
 * Website access resolution. A website can only be reached through its
 * workspace in the SaaS path. Websites without a workspace are legacy rows;
 * they are rejected here so a new route cannot accidentally fall back to an
 * unscoped query.
 */
export async function requireWebsiteAccess(
  user: Auth['user'] | null | undefined,
  websiteId: string,
  minimum: WorkspaceRole = 'VIEWER',
): Promise<(WorkspaceAccess & { websiteId: string }) | null> {
  if (!user?.id || !websiteId) {
    return null;
  }

  const website = await prisma.client.website.findFirst({
    where: { id: websiteId, deletedAt: null },
    select: { id: true, workspaceId: true },
  });

  if (!website?.workspaceId) {
    return null;
  }

  const access = await requireWorkspaceAccess(user, website.workspaceId, minimum);

  return access ? { ...access, websiteId: website.id } : null;
}

export async function getUserWorkspaces(userId: string) {
  return prisma.client.workspaceMembership.findMany({
    where: {
      userId,
      workspace: { deletedAt: null, suspendedAt: null },
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          ownerId: true,
          planId: true,
          subscriptionStatus: true,
          createdAt: true,
          onboardingCompletedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export function slugifyWorkspaceName(value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || 'workspace';
}

/**
 * Create a workspace and its OWNER membership in one transaction. The caller
 * supplies the suffix (usually a short random id) so slugs are unique without
 * a read-then-write race.
 */
export interface CreatedWorkspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  planId: string | null;
  subscriptionStatus: string;
  onboardingCompletedAt: Date | null;
}

export async function createWorkspaceForUser({
  userId,
  name,
  slug,
  logoUrl,
  planId = 'starter',
}: {
  userId: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  planId?: string;
}): Promise<CreatedWorkspace> {
  const base = slugifyWorkspaceName(name);
  const candidate = slug || `${base}-${uuid().slice(0, 8)}`;
  const runTransaction = prisma.client.$transaction.bind(prisma.client) as unknown as <T>(
    fn: (tx: any) => Promise<T>,
  ) => Promise<T>;

  return runTransaction(async tx => {
    const workspace = await tx.workspace.create({
      data: {
        id: uuid(),
        name: name.trim(),
        slug: candidate,
        logoUrl: logoUrl ?? null,
        ownerId: userId,
        planId,
        subscriptionStatus: 'incomplete',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        ownerId: true,
        planId: true,
        subscriptionStatus: true,
        onboardingCompletedAt: true,
      },
    });

    await tx.workspaceMembership.create({
      data: {
        id: uuid(),
        workspaceId: workspace.id,
        userId,
        role: 'OWNER',
      },
    });

    return workspace;
  });
}
