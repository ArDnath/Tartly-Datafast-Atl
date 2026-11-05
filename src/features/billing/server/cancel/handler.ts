import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import prisma from '@/lib/prisma';
import { recordAuditEvent } from '@/queries/prisma';
import { getBillingConfig } from '@/features/billing/server/provider';
import { getDodoBillingProvider } from '@/features/billing/server/providers/dodo';

const schema = z.strictObject({
  workspaceId: z.uuid(),
});

/**
 * Schedule cancellation at the end of the paid period. The provider call is
 * the confirmation; local access lasts until `current_period_end` even after
 * the provider emits `subscription.cancelled`.
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
    select: { providerSubscriptionId: true, lifecycleStatus: true },
  });

  if (!subscription) {
    return badRequest({
      code: 'subscription-missing',
      message: 'This workspace has no platform subscription to cancel.',
    });
  }

  if (!['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(subscription.lifecycleStatus)) {
    return badRequest({
      code: 'subscription-not-active',
      message: 'This subscription is not active.',
    });
  }

  try {
    const provider = getDodoBillingProvider(config);
    await provider.cancelAtPeriodEnd(subscription.providerSubscriptionId);

    await prisma.client.platformSubscription.update({
      where: { workspaceId: body.workspaceId },
      data: { cancelAtPeriodEnd: true },
    });

    await recordAuditEvent({
      auth,
      request,
      eventType: 'billing.subscription.cancel_scheduled',
      resourceType: 'workspace',
      resourceId: body.workspaceId,
      metadata: { provider: 'dodo' },
    });

    return json({ ok: true, cancelAtPeriodEnd: true });
  } catch {
    return serviceUnavailable({
      code: 'billing-provider-unavailable',
      message: 'The billing provider is unavailable. Try again in a moment.',
    });
  }
}
