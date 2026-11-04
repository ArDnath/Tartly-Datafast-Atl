import { hasPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/constants';
import { getEntity } from '@/lib/entity';
import type { Auth } from '@/lib/types';
import { getTeamUser } from '@/queries/prisma';
import { canDeleteWebsite, canUpdateWebsite, canViewWebsite } from './website';

/**
 * Generic entity access for inherited features (boards, links, pixels) and
 * websites. Websites always resolve through their workspace. Platform admin
 * status is not a tenant grant.
 */
export async function canViewEntity(auth: Auth, entityId: string) {
  if (!auth.user && !auth.shareToken) {
    return false;
  }

  const entity = await getEntity(entityId);

  if (!entity) {
    return false;
  }

  if ('workspaceId' in entity) {
    return canViewWebsite(auth, entity.id);
  }

  if (!auth.user) {
    return false;
  }

  if (entity.userId) {
    return auth.user.id === entity.userId;
  }

  if (entity.teamId) {
    return !!(await getTeamUser(entity.teamId, auth.user.id));
  }

  return false;
}

export async function canUpdateEntity(auth: Auth, entityId: string) {
  if (!auth.user) {
    return false;
  }

  const entity = await getEntity(entityId);

  if (!entity) {
    return false;
  }

  if ('workspaceId' in entity) {
    return canUpdateWebsite(auth, entity.id);
  }

  if (entity.userId) {
    return auth.user.id === entity.userId;
  }

  if (entity.teamId) {
    const teamUser = await getTeamUser(entity.teamId, auth.user.id);

    return !!teamUser && (await hasPermission(teamUser.role, PERMISSIONS.websiteUpdate));
  }

  return false;
}

export async function canDeleteEntity(auth: Auth, entityId: string) {
  if (!auth.user) {
    return false;
  }

  const entity = await getEntity(entityId);

  if (!entity) {
    return false;
  }

  if ('workspaceId' in entity) {
    return canDeleteWebsite(auth, entity.id);
  }

  if (entity.userId) {
    return auth.user.id === entity.userId;
  }

  if (entity.teamId) {
    const teamUser = await getTeamUser(entity.teamId, auth.user.id);

    return !!teamUser && (await hasPermission(teamUser.role, PERMISSIONS.websiteDelete));
  }

  return false;
}
