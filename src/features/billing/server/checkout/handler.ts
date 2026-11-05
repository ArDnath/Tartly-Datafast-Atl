import { z } from 'zod';
import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import { getPublicOrigin } from '@/lib/get-base-url';
import { PLAN_IDS } from '@/lib/plans';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getBillingConfig, findBillingProduct } from '@/features/billing/server/provider';
import { getDodoBillingProvider } from '@/features/billing/server/providers/dodo';
import { recordAuditEvent } from '@/queries/prisma';
import prisma from '@/lib/prisma';

const schema = z.strictObject({
  workspaceId: z.uuid(),
  planId: z.enum(PLAN_IDS),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
});

/**
 * Start a platform checkout. The redirect never activates anything: the
 * subscription becomes active only when Dodo confirms it by webhook.
 */
export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const access = await requireWorkspaceAccess(auth.user, body.workspaceId, 'OWNER');

  if (!access) {
    return forbidden({ code: 'billing-owner-required', message: 'Only the workspace owner can manage billing.' });
  }

  const config = getBillingConfig();

  if (!config) {
    return serviceUnavailable({
      code: 'billing-not-configured',
      message: 'Platform billing is not configured yet.',
    });
  }

  const product = findBillingProduct(config, body.planId, body.interval);

  if (!product) {
    return badRequest({
      code: 'billing-product-missing',
      message: `No ${body.interval} price is configured for the ${body.planId} plan.`,
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
      message: 'This workspace already has a subscription. Use the plan change or billing portal action.',
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
      customer: {
        providerCustomerId: customer?.providerCustomerId,
        email: user.username,
        name: user.displayName,
      },
      successUrl: `${origin}/app/settings/billing?checkout=success`,
      cancelUrl: `${origin}/app/settings/billing?checkout=cancelled`,
    });

    await recordAuditEvent({
      auth,
      request,
      eventType: 'billing.checkout.created',
      resourceType: 'workspace',
      resourceId: body.workspaceId,
      metadata: { planId: body.planId, interval: body.interval, provider: 'dodo' },
    });

    return json({ url: session.url, sessionId: session.sessionId });
  } catch {
    return serviceUnavailable({
      code: 'billing-provider-unavailable',
      message: 'The billing provider is unavailable. Try again in a moment.',
    });
  }
}
