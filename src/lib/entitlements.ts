import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import prisma from '@/lib/prisma';
import { getPlan, getPlanOrNull, type Plan, type PlanFeature, planHasFeature } from '@/lib/plans';

/**
 * Plan entitlements are derived from backend billing records, never from the
 * UI and never from a checkout redirect.
 *
 * The `platform_subscription` row is written only by a verified provider
 * webhook (or a provider-confirmed plan change). A workspace without one keeps
 * Starter setup limits but `active` stays false, so no paid feature is
 * unlocked for free.
 */

export interface WorkspaceEntitlements {
  workspaceId: string;
  plan: Plan | null;
  planId: string | null;
  subscriptionStatus: string;
  /** True only when the provider has confirmed paid access. */
  active: boolean;
  /** True when `active` is false; the workspace may only use the setup allowance. */
  setup: boolean;
}

export async function getWorkspaceEntitlements(
  workspaceId: string,
  now: Date = new Date(),
): Promise<WorkspaceEntitlements | null> {
  const workspace = await prisma.client.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: {
      id: true,
      planId: true,
      subscriptionStatus: true,
      platformSubscription: {
        select: {
          planId: true,
          lifecycleStatus: true,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  const subscription = workspace.platformSubscription;

  if (subscription) {
    const plan = getPlanOrNull(subscription.planId) || getPlan('starter');
    const active = billingSubscriptionHasAccess(
      {
        lifecycleStatus: subscription.lifecycleStatus,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      now,
    );

    return {
      workspaceId: workspace.id,
      plan,
      planId: subscription.planId,
      subscriptionStatus: subscription.lifecycleStatus,
      active,
      setup: !active,
    };
  }

  // Pre-billing workspaces have no subscription row. They keep their stored
  // plan for setup limits, but only an explicit legacy status counts as paid.
  const plan = getPlanOrNull(workspace.planId) || getPlan('starter');
  const active =
    workspace.subscriptionStatus === 'active' || workspace.subscriptionStatus === 'trialing';

  return {
    workspaceId: workspace.id,
    plan,
    planId: workspace.planId,
    subscriptionStatus: workspace.subscriptionStatus,
    active,
    setup: !active,
  };
}

export function entitlementsHaveFeature(
  entitlements: WorkspaceEntitlements | null,
  feature: PlanFeature,
): boolean {
  if (!entitlements?.plan || !entitlements.active) {
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
