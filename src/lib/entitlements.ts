import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import {
  FREE_TRIAL_MEMBERS,
  FREE_TRIAL_WEBSITES,
  getFreeTrialState,
  getPlan,
  getPlanOrNull,
  getTrialDaysRemaining,
  resolvePlanForTrafficTier,
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
  trafficTierIndex: number | null;
  subscriptionStatus: string;
  /** True only when the provider has confirmed paid access. */
  active: boolean;
  /** True while the workspace is inside its 7-day free trial. */
  trial: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
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
          trafficTierIndex: true,
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
  const active = subscription
    ? billingSubscriptionHasAccess(
        {
          lifecycleStatus: subscription.lifecycleStatus,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
        now,
      )
    : workspace.subscriptionStatus === 'active' || workspace.subscriptionStatus === 'trialing';

  const freeTrial = getFreeTrialState(workspace.createdAt, now);
  const trial = !active && freeTrial.active;
  const planId = subscription?.planId ?? workspace.planId;
  const basePlan = getPlanOrNull(planId) || getPlan('starter');
  const trafficTierIndex = subscription?.trafficTierIndex ?? null;
  const plan = resolvePlanForTrafficTier(basePlan, trafficTierIndex);

  return {
    workspaceId: workspace.id,
    plan,
    planId,
    trafficTierIndex,
    subscriptionStatus: subscription?.lifecycleStatus ?? workspace.subscriptionStatus,
    active,
    trial,
    trialEndsAt: trial ? freeTrial.endsAt : null,
    trialDaysRemaining: trial ? getTrialDaysRemaining(freeTrial.endsAt, now) : 0,
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
