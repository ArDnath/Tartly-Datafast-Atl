import { z } from 'zod';
import { DEFAULT_TRAFFIC_TIER_INDEX, PLAN_IDS, TRAFFIC_TIERS } from '@/lib/plans';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import prisma from '@/lib/prisma';
import { recordAuditEvent } from '@/queries/prisma';
import { findBillingProduct, getBillingConfig } from '@/features/billing/server/provider';
import { getDodoBillingProvider } from '@/features/billing/server/providers/dodo';

const schema = z.strictObject({
  workspaceId: z.uuid(),
  planId: z.enum(PLAN_IDS),
  tierIndex: z
    .number()
    .int()
    .min(0)
    .max(TRAFFIC_TIERS.length - 1)
    .optional(),
});

/**
 * Ask the provider to change the plan or traffic tier immediately with
 * proration. The local plan is updated only by the webhook, so a failed
 * payment cannot grant the new plan.
 */
export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const access = await requireWorkspaceAccess(auth.user, body.workspaceId, 'OWNER');

  if (!access) {
    return forbidden({
      code: 'billing-owner-required',
      message: 'Only the workspace owner can manage billing.',
    });
  }

  const config = getBillingConfig();

  if (!config) {
    return serviceUnavailable({
      code: 'billing-not-configured',
      message: 'Platform billing is not configured yet.',
    });
  }

  const subscription = await prisma.client.platformSubscription.findUnique({
    where: { workspaceId: body.workspaceId },
    select: {
      providerSubscriptionId: true,
      lifecycleStatus: true,
      planId: true,
      interval: true,
      trafficTierIndex: true,
    },
  });

  if (!subscription) {
    return badRequest({
      code: 'subscription-missing',
      message: 'This workspace has no platform subscription to change.',
    });
  }

  if (!['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(subscription.lifecycleStatus)) {
    return badRequest({
      code: 'subscription-not-active',
      message: 'This subscription is not active.',
    });
  }

  const interval = subscription.interval === 'annual' ? 'annual' : 'monthly';
  const currentTierIndex = subscription.trafficTierIndex ?? DEFAULT_TRAFFIC_TIER_INDEX;
  const tierIndex = body.tierIndex ?? currentTierIndex;

  if (subscription.planId === body.planId && currentTierIndex === tierIndex) {
    return badRequest({
      code: 'plan-unchanged',
      message: 'This workspace is already on that plan and traffic tier.',
    });
  }

  const product = findBillingProduct(config, body.planId, interval, tierIndex);

  if (!product) {
    return badRequest({
      code: 'billing-price-unavailable',
      message: `No ${interval} price is configured for the ${body.planId} plan at this traffic tier.`,
    });
  }

  try {
    const provider = getDodoBillingProvider(config);
    await provider.changePlan(subscription.providerSubscriptionId, product.productId);

    await prisma.client.billingSubscriptionChange.create({
      data: {
        workspaceId: body.workspaceId,
        fromPlanId: subscription.planId,
        toPlanId: body.planId,
        changeType: subscription.planId === body.planId ? 'traffic-tier-change' : 'plan-change',
        requestedBy: auth.user.id,
      },
    });

    await recordAuditEvent({
      auth,
      request,
      eventType: 'billing.subscription.plan_change_requested',
      resourceType: 'workspace',
      resourceId: body.workspaceId,
      metadata: {
        fromPlanId: subscription.planId,
        toPlanId: body.planId,
        fromTierIndex: currentTierIndex,
        toTierIndex: tierIndex,
        provider: 'dodo',
      },
    });

    return json({ ok: true, pending: true });
  } catch {
    return serviceUnavailable({
      code: 'billing-provider-unavailable',
      message: 'The billing provider is unavailable. Try again in a moment.',
    });
  }
}
