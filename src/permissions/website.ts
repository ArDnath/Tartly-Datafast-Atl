import { hasPermission } from '@/lib/auth';
import { PERMISSIONS, WEBSITE_MEMBER_ROLES } from '@/lib/constants';
import type { Auth } from '@/lib/types';
import {
  canWorkspace,
  getWorkspaceMembership,
  hasMinimumRole,
  type WorkspaceRole,
} from '@/lib/workspace-auth';
import { getTeamUser, getWebsite, getWebsiteMemberForUser } from '@/queries/prisma';

/**
 * Website access is resolved from the workspace that owns the website.
 *
 * This module is the single access point used by the inherited API routes.
 * Routes must never query tenant data before it returns.
 *
 * Websites created before the workspace migration may still have a null
 * `workspace_id`. Those rows fall back to the legacy owner/team check so the
 * migration remains reversible; every new website is workspace-owned and is
 * never authorized by the legacy path.
 */

const NO_ACCESS = {
  role: null,
  canView: false,
  canUpdate: false,
  canDelete: false,
  canManageMembers: false,
  workspaceId: null,
} as const;

function toAccess(role: WorkspaceRole, workspaceId: string) {
  return {
    role: role.toLowerCase(),
    canView: canWorkspace(role, 'website:read'),
    canUpdate: canWorkspace(role, 'website:update'),
    canDelete: canWorkspace(role, 'website:delete'),
    canManageMembers: canWorkspace(role, 'members:manage'),
    workspaceId,
  };
}

function isShareForWebsite(auth: Auth, websiteId: string) {
  const { shareToken } = auth;

  return (
    shareToken?.websiteId === websiteId ||
    shareToken?.pixelId === websiteId ||
    shareToken?.linkId === websiteId
  );
}

async function getLegacyWebsiteAccess(auth: Auth, websiteId: string) {
  const { user } = auth;

  if (!user) {
    return NO_ACCESS;
  }

  const website = await getWebsite(websiteId);

  if (!website || website.deletedAt) {
    return NO_ACCESS;
  }

  if (website.userId === user.id) {
    return {
      ...NO_ACCESS,
      role: 'owner',
      canView: true,
      canUpdate: true,
      canDelete: true,
      canManageMembers: true,
    };
  }

  if (website.teamId) {
    const teamUser = await getTeamUser(website.teamId, user.id);
    const canUpdate = !!teamUser && (await hasPermission(teamUser.role, PERMISSIONS.websiteUpdate));
    const canDelete = !!teamUser && (await hasPermission(teamUser.role, PERMISSIONS.websiteDelete));

    if (teamUser) {
      return {
        ...NO_ACCESS,
        role: canUpdate ? WEBSITE_MEMBER_ROLES.member : WEBSITE_MEMBER_ROLES.viewer,
        canView: true,
        canUpdate,
        canDelete,
        canManageMembers: false,
      };
    }
  }

  const member = await getWebsiteMemberForUser(websiteId, user);
  const canUpdate = member?.role === WEBSITE_MEMBER_ROLES.member;

  return {
    ...NO_ACCESS,
    role: member?.role || null,
    canView: !!member,
    canUpdate,
    canDelete: false,
    canManageMembers: false,
  };
}

export async function getWebsiteAccess(auth: Auth, websiteId: string) {
  const { user } = auth;

  // A share token is scoped to exactly one entity and is always read-only,
  // even when the visitor also has a signed-in session.
  if (isShareForWebsite(auth, websiteId)) {
    return {
      ...NO_ACCESS,
      canView: true,
    };
  }

  if (!user) {
    return NO_ACCESS;
  }

  const website = await getWebsite(websiteId);

  if (!website || website.deletedAt) {
    return NO_ACCESS;
  }

  if (!website.workspaceId) {
    return getLegacyWebsiteAccess(auth, websiteId);
  }

  const membership = await getWorkspaceMembership(user.id, website.workspaceId);

  if (!membership) {
    return NO_ACCESS;
  }

  return toAccess(membership.role, website.workspaceId);
}

export async function canViewWebsite(auth: Auth, websiteId: string) {
  if (auth.shareToken && isShareForWebsite(auth, websiteId)) {
    return true;
  }

  // Platform admins are intentionally not granted tenant data through this
  // helper. Internal administration uses a separate, audited path.
  return (await getWebsiteAccess(auth, websiteId)).canView;
}

export async function canViewAllWebsites({ user }: Auth) {
  void user;
  return false;
}

export async function canCreateWebsite({ user }: Auth) {
  // Workspace role and plan limits are enforced by the route. This helper
  // only answers "is there a signed-in principal?".
  return Boolean(user?.id);
}

export async function canUpdateWebsite(auth: Auth, websiteId: string) {
  if (auth.shareToken) {
    return false;
  }

  return (await getWebsiteAccess(auth, websiteId)).canUpdate;
}

export async function canDeleteWebsite(auth: Auth, websiteId: string) {
  if (auth.shareToken) {
    return false;
  }

  return (await getWebsiteAccess(auth, websiteId)).canDelete;
}

export async function canManageWebsiteMembers(auth: Auth, websiteId: string) {
  if (auth.shareToken) {
    return false;
  }

  return (await getWebsiteAccess(auth, websiteId)).canManageMembers;
}

/**
 * Explicit workspace-and-website assertion used by server actions and new
 * routes. Returns null rather than leaking whether the website exists.
 */
export async function getWebsiteWorkspaceAccess(
  auth: Auth,
  websiteId: string,
  minimum: WorkspaceRole = 'VIEWER',
) {
  if (!auth.user?.id || !websiteId) {
    return null;
  }

  const website = await getWebsite(websiteId);

  if (!website?.workspaceId || website.deletedAt) {
    return null;
  }

  const membership = await getWorkspaceMembership(auth.user.id, website.workspaceId);

  if (!membership || !hasMinimumRole(membership.role, minimum)) {
    return null;
  }

  return {
    websiteId,
    workspaceId: website.workspaceId,
    role: membership.role,
  };
}


