import prisma from '@/lib/prisma';
import { getPlan, getPlanOrNull, type Plan, type PlanFeature, planHasFeature } from '@/lib/plans';

/**
 * Plan entitlements are always derived from the stored workspace record. The
 * UI must not decide whether a feature is available; ask this module.
 *
 * Billing is not wired yet (Phase 5). A workspace with no subscription status
 * can still finish onboarding, but only within its configured plan limits.
 */

export interface WorkspaceEntitlements {
  workspaceId: string;
  plan: Plan | null;
  planId: string | null;
  subscriptionStatus: string;
  /** True only when the provider has confirmed a paid subscription. */
  active: boolean;
}

export async function getWorkspaceEntitlements(
  workspaceId: string,
): Promise<WorkspaceEntitlements | null> {
  const workspace = await prisma.client.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: {
      id: true,
      planId: true,
      subscriptionStatus: true,
    },
  });

  if (!workspace) {
    return null;
  }

  // Workspaces created before billing existed have no stored plan. They are
  // treated as Starter for setup limits only; `active` stays false, so no paid
  // feature is unlocked until a subscription is confirmed.
  const plan = getPlanOrNull(workspace.planId) || getPlan('starter');

  return {
    workspaceId: workspace.id,
    plan,
    planId: workspace.planId,
    subscriptionStatus: workspace.subscriptionStatus,
    active: workspace.subscriptionStatus === 'active' || workspace.subscriptionStatus === 'trialing',
  };
}

export function entitlementsHaveFeature(
  entitlements: WorkspaceEntitlements | null,
  feature: PlanFeature,
): boolean {
  if (!entitlements?.plan) {
    return false;
  }

  return planHasFeature(entitlements.plan, feature);
}

export function getWebsiteLimit(entitlements: WorkspaceEntitlements | null): number {
  return entitlements?.plan?.websiteLimit ?? 0;
}

export function getMemberLimit(entitlements: WorkspaceEntitlements | null): number {
  return entitlements?.plan?.memberLimit ?? 0;
}
