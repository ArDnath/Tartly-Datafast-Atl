import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import {
  getPlan,
  getPlanOrNull,
  resolvePlanForTrafficTier,
  SETUP_MEMBERS,
  SETUP_WEBSITES,
  type Plan,
  type PlanFeature,
  planHasFeature,
} from '@/lib/plans';
import prisma from '@/lib/prisma';

/**
 * Plan entitlements are derived from backend billing records, never from the
 * UI and never from a checkout redirect.
 *
 * A workspace without a provider-confirmed subscription may finish onboarding
 * (one website, one member) but has no ingestion or paid features. There is no
 * free trial: the app shell shows the paywall until a subscription is active.
 */

export interface WorkspaceEntitlements {
  workspaceId: string;
  plan: Plan | null;
  planId: string | null;
  trafficTierIndex: number | null;
  subscriptionStatus: string;
  /** True only when the provider has confirmed paid access. */
  active: boolean;
  /** True when `active` is false; only the onboarding setup allowances apply. */
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

  return SETUP_WEBSITES;
}

export function getMemberLimit(entitlements: WorkspaceEntitlements | null): number {
  if (!entitlements) {
    return 0;
  }

  if (entitlements.active) {
    return entitlements.plan?.memberLimit ?? 0;
  }

  return SETUP_MEMBERS;
}
