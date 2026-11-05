import { z } from 'zod';
import { getPublicOrigin } from '@/lib/get-base-url';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import prisma from '@/lib/prisma';
import { getBillingConfig } from '@/features/billing/server/provider';
import { getDodoBillingProvider } from '@/features/billing/server/providers/dodo';

const schema = z.strictObject({
  workspaceId: z.uuid(),
});

/** Open the provider-hosted customer portal for invoices and payment methods. */
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

  const customer = await prisma.client.billingCustomer.findUnique({
    where: { workspaceId: body.workspaceId },
    select: { providerCustomerId: true },
  });

  if (!customer?.providerCustomerId) {
    return badRequest({
      code: 'billing-customer-missing',
      message: 'Start a subscription before opening the billing portal.',
    });
  }

  try {
    const provider = getDodoBillingProvider(config);
    const session = await provider.createPortalSession(
      customer.providerCustomerId,
      `${getPublicOrigin(request)}/app/settings/billing`,
    );

    return json({ url: session.url });
  } catch {
    return serviceUnavailable({
      code: 'billing-provider-unavailable',
      message: 'The billing provider is unavailable. Try again in a moment.',
    });
  }
}
