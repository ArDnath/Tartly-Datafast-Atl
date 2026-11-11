import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import { getFreeTrialState, getTrialDaysRemaining, isPlanId } from '@/lib/plans';
import prisma from '@/lib/prisma';
import type { WorkspaceBillingAccess } from '@/features/billing/lib/access';
import { getBillingConfig } from '@/features/billing/server/provider';

/**
 * One query for the app-shell guard. This is a read-only view: it never
 * activates a plan and never trusts a redirect. The provider webhook remains
 * the only writer of paid state.
 */
export async function getWorkspaceBillingAccess(
  workspaceId: string,
  now: Date = new Date(),
): Promise<WorkspaceBillingAccess | null> {
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
          interval: true,
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
  const paid = subscription
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
  const trialActive = !paid && freeTrial.active;
  const config = getBillingConfig();
  const planId = subscription?.planId ?? workspace.planId;

  return {
    workspaceId: workspace.id,
    planId,
    subscriptionStatus: subscription?.lifecycleStatus ?? workspace.subscriptionStatus,
    configured: Boolean(config),
    paid,
    trial: {
      active: trialActive,
      endsAt: trialActive ? (freeTrial.endsAt?.toISOString() ?? null) : null,
      daysRemaining: trialActive ? getTrialDaysRemaining(freeTrial.endsAt, now) : 0,
    },
    requiresPayment: !paid && !trialActive,
    subscription:
      subscription && isPlanId(subscription.planId)
        ? {
            planId: subscription.planId,
            interval: subscription.interval === 'annual' ? 'annual' : 'monthly',
            trafficTierIndex: subscription.trafficTierIndex,
            lifecycleStatus: subscription.lifecycleStatus,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    availableProducts:
      config?.products.map(product => ({
        planId: product.planId,
        interval: product.interval,
        ...(product.tierIndex === undefined ? {} : { tierIndex: product.tierIndex }),
      })) ?? [],
  };
}
