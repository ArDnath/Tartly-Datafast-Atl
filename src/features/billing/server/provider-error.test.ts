import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mapProviderError } from './provider-error';

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { logger } from '@/lib/logger';

const warn = vi.mocked(logger.warn);

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The Dodo SDK throws APIError subclasses shaped `{ status, error: { code,
 * message } }` (node_modules/dodopayments/core/error.js). These tests mirror
 * the real shapes, including the 409 `PREVIOUS_PAYMENT_PENDING` response that
 * was misreported as a 503 in production on 2026-11-17.
 */
function dodoError(status: number, code: string, message: string) {
  const error = Object.assign(new Error(`${status} ${message}`), {
    status,
    error: { code, message },
  });
  return error;
}

function call(cause: unknown) {
  return mapProviderError({
    cause,
    event: 'billing.change_plan.failed',
    fields: { workspaceId: 'ws-1', planId: 'pro' },
  });
}

describe('mapProviderError', () => {
  test('maps a 409 provider conflict to 409 with the provider code and message', async () => {
    const response = call(
      dodoError(
        409,
        'PREVIOUS_PAYMENT_PENDING',
        'Cannot change plan as previous payment is not successful yet',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('PREVIOUS_PAYMENT_PENDING');
    expect(body.error.message).toBe('Cannot change plan as previous payment is not successful yet');
  });

  test('maps a 404 provider response to 404', async () => {
    const response = call(dodoError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
    expect(body.error.message).toBe('Subscription not found');
  });

  test('maps other 4xx provider responses to 400 with the provider detail', async () => {
    const response = call(
      dodoError(
        401,
        'INSUFFICIENT_PERMISSION',
        'This API key does not have the required permission.',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INSUFFICIENT_PERMISSION');
    expect(body.error.message).toBe('This API key does not have the required permission.');
  });

  test('maps a provider 5xx to 503 with the generic message, not provider internals', async () => {
    const response = call(dodoError(500, 'internal_error', 'Something exploded'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('billing-provider-unavailable');
    expect(body.error.message).toBe('The billing provider is unavailable. Try again in a moment.');
  });

  test('maps a connection failure (no status) to 503 with the generic message', async () => {
    const cause = new TypeError('fetch failed');
    const response = call(cause);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('billing-provider-unavailable');
    expect(body.error.message).toBe('The billing provider is unavailable. Try again in a moment.');
  });

  test('maps a thrown non-error value to 503 with the generic message', async () => {
    const response = call('boom');
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.message).toBe('The billing provider is unavailable. Try again in a moment.');
  });

  test('logs every failure with the event, fields, status, provider code, and error name', () => {
    call(
      dodoError(
        409,
        'PREVIOUS_PAYMENT_PENDING',
        'Cannot change plan as previous payment is not successful yet',
      ),
    );

    expect(warn).toHaveBeenCalledWith('billing.change_plan.failed', {
      workspaceId: 'ws-1',
      planId: 'pro',
      status: 409,
      providerCode: 'PREVIOUS_PAYMENT_PENDING',
      error: 'Error',
    });
  });

  test('logs a connection failure with error name and no status', () => {
    call(new TypeError('fetch failed'));

    expect(warn).toHaveBeenCalledWith('billing.change_plan.failed', {
      workspaceId: 'ws-1',
      planId: 'pro',
      status: undefined,
      providerCode: undefined,
      error: 'TypeError',
    });
  });
});
