import {
  getWebhookHeaders,
  verifyStandardWebhook,
  WebhookVerificationError,
} from '@/features/billing/lib/standard-webhook';
import { getBillingConfig } from '@/features/billing/server/provider';
import { processDodoWebhook } from '@/features/billing/server/service';
import { badRequest, json, serverError, serviceUnavailable } from '@/lib/response';

/**
 * Platform billing webhook (context A). This path is deliberately different
 * from `/api/payments/dodo/[websiteId]/webhook`, which receives the customer's
 * own revenue events. The signing secrets are different and must never be
 * accepted across contexts.
 */
export async function POST(request: Request) {
  const config = getBillingConfig();

  if (!config) {
    return serviceUnavailable({
      code: 'billing-not-configured',
      message: 'Platform billing is not configured yet.',
    });
  }

  const payload = await request.text();

  let verified: ReturnType<typeof verifyStandardWebhook>;

  try {
    verified = verifyStandardWebhook({
      payload,
      headers: getWebhookHeaders(request.headers),
      secret: config.webhookSecret,
    });
  } catch (error) {
    const code =
      error instanceof WebhookVerificationError ? error.code : 'invalid-signature';

    return badRequest({ code: `webhook-${code}`, message: 'Webhook verification failed.' });
  }

  let event: unknown;

  try {
    event = JSON.parse(verified.payload);
  } catch {
    return badRequest({ code: 'webhook-invalid-payload', message: 'Webhook payload is not valid JSON.' });
  }

  if (
    !event ||
    typeof event !== 'object' ||
    typeof (event as { type?: unknown }).type !== 'string'
  ) {
    return badRequest({ code: 'webhook-unsupported', message: 'Webhook event type is missing.' });
  }

  try {
    const result = await processDodoWebhook(
      {
        id: verified.id,
        type: (event as { type: string }).type,
        timestamp: verified.timestamp,
        payload: event,
      },
      config,
    );

    return json({ received: true, status: result });
  } catch {
    // The provider retries on 5xx. The raw error is stored on the billing
    // event row; it never reaches the response or the logs.
    return serverError({
      code: 'billing-webhook-processing-failed',
      message: 'The billing event could not be processed.',
    });
  }
}
