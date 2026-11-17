import { logger } from '@/lib/logger';
import { badRequest, conflict, notFound, serviceUnavailable } from '@/lib/response';

const PROVIDER_UNAVAILABLE_MESSAGE = 'The billing provider is unavailable. Try again in a moment.';

/**
 * Turn a thrown platform-billing provider error into an honest HTTP response.
 *
 * The Dodo SDK throws `APIError` subclasses shaped `{ status, error: { code,
 * message } }`. A 4xx is the provider declining this specific request (a
 * pending payment on the subscription, a missing API-key permission, a
 * validation failure), so the provider's own code and message are surfaced:
 * replying 503 here told customers the provider was down when it was fine
 * (2026-11-17: Dodo 409 `PREVIOUS_PAYMENT_PENDING` surfaced as "billing
 * provider is unavailable"). Only connection failures and 5xx keep the 503.
 *
 * The provider message is data from the provider, never from this app's
 * internals, so passing it through leaks no stack or driver detail.
 */
export function mapProviderError(input: {
  cause: unknown;
  event: string;
  fields: Record<string, unknown>;
}) {
  const cause = input.cause;
  const status =
    typeof (cause as { status?: unknown })?.status === 'number'
      ? (cause as { status: number }).status
      : undefined;
  const providerError = (cause as { error?: { code?: unknown; message?: unknown } })?.error;
  const providerCode = typeof providerError?.code === 'string' ? providerError.code : undefined;
  const providerMessage =
    typeof providerError?.message === 'string'
      ? providerError.message
      : cause instanceof Error
        ? cause.message
        : PROVIDER_UNAVAILABLE_MESSAGE;

  logger.warn(input.event, {
    ...input.fields,
    status,
    providerCode,
    error: cause instanceof Error ? cause.name : 'unknown',
  });

  if (status === 409) {
    return conflict({
      code: providerCode ?? 'billing-provider-conflict',
      message: providerMessage,
    });
  }

  if (status === 404) {
    return notFound({
      code: providerCode ?? 'billing-provider-not-found',
      message: providerMessage,
    });
  }

  if (typeof status === 'number' && status >= 400 && status < 500) {
    return badRequest({
      code: providerCode ?? 'billing-provider-error',
      message: providerMessage,
    });
  }

  return serviceUnavailable({
    code: 'billing-provider-unavailable',
    message: PROVIDER_UNAVAILABLE_MESSAGE,
  });
}
