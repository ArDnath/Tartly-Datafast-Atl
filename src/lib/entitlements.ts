import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import {
  FREE_TRIAL_MEMBERS,
  FREE_TRIAL_WEBSITES,
  getFreeTrialState,
  getPlan,
  getPlanOrNull,
  type Plan,
  type PlanFeature,
  planHasFeature,
} from '@/lib/plans';
import prisma from '@/lib/prisma';

/**
 * Plan entitlements are derived from backend billing records, never from the
 * UI and never from a checkout redirect.
 *
 * A workspace without a provider-confirmed subscription is in its 7-day free
 * trial (2,000 events, one website). When the trial ends, paid features and
 * ingestion stay locked until a subscription is active.
 */

export interface WorkspaceEntitlements {
  workspaceId: string;
  plan: Plan | null;
  planId: string | null;
  subscriptionStatus: string;
  /** True only when the provider has confirmed paid access. */
  active: boolean;
  /** True while the workspace is inside its 7-day free trial. */
  trial: boolean;
  trialEndsAt: Date | null;
  /** True when `active` is false; only trial limits are available. */
  setup: boolean;
}

export async function getWorkspaceEntitlements(
  workspaceId: string,
  now: Date = new Date(),
): Promise<WorkspaceEntitlements | null> {
  const workspace = await prisma.client.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null, suspendedAt: null },
    select: {
      id: true,
      planId: true,
      subscriptionStatus: true,
      createdAt: true,
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
      trial: active && subscription.lifecycleStatus === 'TRIALING',
      trialEndsAt: null,
      setup: !active,
    };
  }

  // Pre-billing workspaces have no subscription row. They keep their stored
  // plan for limits, but only an explicit legacy status counts as paid.
  const plan = getPlanOrNull(workspace.planId) || getPlan('starter');
  const active =
    workspace.subscriptionStatus === 'active' || workspace.subscriptionStatus === 'trialing';
  const freeTrial = getFreeTrialState(workspace.createdAt, now);

  return {
    workspaceId: workspace.id,
    plan,
    planId: workspace.planId,
    subscriptionStatus: workspace.subscriptionStatus,
    active,
    trial: active || freeTrial.active,
    trialEndsAt: active ? null : freeTrial.endsAt,
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
  if (!entitlements) {
    return 0;
  }

  if (entitlements.active) {
    return entitlements.plan?.websiteLimit ?? 0;
  }

  return entitlements.trial ? FREE_TRIAL_WEBSITES : 0;
}

export function getMemberLimit(entitlements: WorkspaceEntitlements | null): number {
  if (!entitlements) {
    return 0;
  }

  if (entitlements.active) {
    return entitlements.plan?.memberLimit ?? 0;
  }

  return entitlements.trial ? FREE_TRIAL_MEMBERS : 0;
}
