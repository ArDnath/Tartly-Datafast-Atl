import {
  entitlementsHaveFeature,
  getWorkspaceEntitlements,
  type WorkspaceEntitlements,
} from '@/lib/entitlements';
import type { PlanFeature } from '@/lib/plans';
import type { Auth } from '@/lib/types';
import { getWebsiteWorkspaceAccess } from '@/permissions';

/**
 * Server-side plan features for a website route.
 *
 * The browser never decides whether a paid feature is available. Every route
 * that exposes a paid capability resolves the workspace from the website,
 * reads the backend subscription, and refuses the request when the feature is
 * absent. A share token is intentionally not accepted here: shared reports are
 * read-only and are authorized by the share itself.
 */
export async function getWebsiteEntitlements(
  auth: Auth,
  websiteId: string,
): Promise<WorkspaceEntitlements | null> {
  if (auth.shareToken) {
    return null;
  }

  const access = await getWebsiteWorkspaceAccess(auth, websiteId, 'VIEWER');

  if (!access) {
    return null;
  }

  return getWorkspaceEntitlements(access.workspaceId);
}

export async function canUseWebsiteFeature(
  auth: Auth,
  websiteId: string,
  feature: PlanFeature,
): Promise<boolean> {
  const entitlements = await getWebsiteEntitlements(auth, websiteId);

  return entitlementsHaveFeature(entitlements, feature);
}

/** Check a paid feature from an already-authorized workspace id (for shares). */
export async function canUseWorkspaceFeature(
  workspaceId: string,
  feature: PlanFeature,
): Promise<boolean> {
  const entitlements = await getWorkspaceEntitlements(workspaceId);

  return entitlementsHaveFeature(entitlements, feature);
}
