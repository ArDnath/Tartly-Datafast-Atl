import { z } from 'zod';
import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import { getPublicOrigin } from '@/lib/get-base-url';
import { logger } from '@/lib/logger';
import { DEFAULT_TRAFFIC_TIER_INDEX, PLAN_IDS, TRAFFIC_TIERS } from '@/lib/plans';
import { consumeRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serviceUnavailable, tooManyRequests } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getBillingConfig, findBillingProduct } from '@/features/billing/server/provider';
import { getDodoBillingProvider } from '@/features/billing/server/providers/dodo';
import { recordAuditEvent } from '@/queries/prisma';
import prisma from '@/lib/prisma';

const MAX_TIER_INDEX = TRAFFIC_TIERS.length - 1;

const schema = z.strictObject({
  workspaceId: z.uuid(),
  planId: z.enum(PLAN_IDS),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
  tierIndex: z.number().int().min(0).max(MAX_TIER_INDEX).default(DEFAULT_TRAFFIC_TIER_INDEX),
});

/**
 * Start a platform checkout. The redirect never activates anything: the
 * subscription becomes active only when Dodo confirms it by webhook.
 *
 * The tier is part of the checkout intent because every slider position has
 * its own price. The handler refuses a tier that has no exact provider price
 * instead of silently charging the default product.
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

  const rateLimit = await consumeRateLimit({
    key: rateLimitKey('billing-checkout:workspace', body.workspaceId),
    limit: 20,
    windowSeconds: 600,
  });

  if (!rateLimit.allowed) {
    return tooManyRequests(
      {
        code: 'billing-checkout-rate-limited',
        message: 'Too many checkout attempts. Wait a moment and try again.',
      },
      rateLimit.retryAfterSeconds,
    );
  }

  const config = getBillingConfig();

  if (!config) {
    return serviceUnavailable({
      code: 'billing-not-configured',
      message: 'Platform billing is not configured yet.',
    });
  }

  const product = findBillingProduct(config, body.planId, body.interval, body.tierIndex);

  if (!product) {
    return badRequest({
      code: 'billing-price-unavailable',
      message:
        body.interval === 'annual'
          ? `No annual price is configured for the ${body.planId} plan at this traffic tier.`
          : `No ${body.planId} price is configured for this traffic tier yet.`,
    });
  }

  const existing = await prisma.client.platformSubscription.findUnique({
    where: { workspaceId: body.workspaceId },
    select: {
      lifecycleStatus: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      providerSubscriptionId: true,
    },
  });

  if (
    existing &&
    billingSubscriptionHasAccess({
      lifecycleStatus: existing.lifecycleStatus,
      cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
      currentPeriodEnd: existing.currentPeriodEnd,
    })
  ) {
    return badRequest({
      code: 'subscription-exists',
      message:
        'This workspace already has a subscription. Use the plan change or billing portal action.',
    });
  }

  const user = await prisma.client.user.findUnique({
    where: { id: auth.user.id },
    select: { username: true, displayName: true },
  });

  if (!user?.username) {
    return badRequest({
      code: 'billing-email-required',
      message: 'Add a valid account email before starting checkout.',
    });
  }

  const customer = await prisma.client.billingCustomer.findUnique({
    where: { workspaceId: body.workspaceId },
    select: { providerCustomerId: true },
  });

  const origin = getPublicOrigin(request);
  const provider = getDodoBillingProvider(config);

  try {
    const session = await provider.createCheckout({
      workspaceId: body.workspaceId,
      planId: body.planId,
      interval: body.interval,
      tierIndex: body.tierIndex,
      productId: product.productId,
      customer: {
        providerCustomerId: customer?.providerCustomerId,
        email: user.username,
        name: user.displayName,
      },
      successUrl: `${origin}/app?checkout=success`,
      cancelUrl: `${origin}/app?checkout=cancelled`,
    });

    await recordAuditEvent({
      auth,
      request,
      eventType: 'billing.checkout.created',
      resourceType: 'workspace',
      resourceId: body.workspaceId,
      metadata: {
        planId: body.planId,
        interval: body.interval,
        tierIndex: body.tierIndex,
        provider: 'dodo',
      },
    });

    return json({ url: session.url, sessionId: session.sessionId });
  } catch (cause) {
    logger.warn('billing.checkout.failed', {
      workspaceId: body.workspaceId,
      planId: body.planId,
      interval: body.interval,
      tierIndex: body.tierIndex,
      error: cause instanceof Error ? cause.name : 'unknown',
    });

    return serviceUnavailable({
      code: 'billing-provider-unavailable',
      message: 'The billing provider is unavailable. Try again in a moment.',
    });
  }
}
