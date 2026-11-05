import { describe, expect, test } from 'vitest';
import {
  computeWebhookSignature,
  getWebhookHeaders,
  verifyStandardWebhook,
  WebhookVerificationError,
} from '@/features/billing/lib/standard-webhook';

const secret = `whsec_${Buffer.from('platform-billing-test-secret-32b').toString('base64')}`;
const now = new Date('2026-11-05T12:00:00.000Z');
const timestamp = String(Math.floor(now.getTime() / 1000));
const payload = JSON.stringify({ type: 'subscription.active', data: { subscription_id: 'sub_1' } });

function headers(signature: string, overrides: Record<string, string> = {}) {
  return new Headers({
    'webhook-id': 'msg_1',
    'webhook-timestamp': timestamp,
    'webhook-signature': signature,
    ...overrides,
  });
}

describe('platform billing webhook verification', () => {
  test('accepts a valid Standard Webhooks signature', () => {
    const signature = computeWebhookSignature({ id: 'msg_1', timestamp, payload, secret });
    const result = verifyStandardWebhook({
      payload,
      headers: getWebhookHeaders(headers(`v1,${signature}`)),
      secret,
      now,
    });

    expect(result.id).toBe('msg_1');
    expect(result.payload).toBe(payload);
  });

  test('accepts any valid candidate when multiple signatures are present', () => {
    const signature = computeWebhookSignature({ id: 'msg_1', timestamp, payload, secret });
    const result = verifyStandardWebhook({
      payload,
      headers: getWebhookHeaders(headers(`v1,not-valid v1,${signature}`)),
      secret,
      now,
    });

    expect(result.id).toBe('msg_1');
  });

  test('rejects a tampered payload', () => {
    const signature = computeWebhookSignature({ id: 'msg_1', timestamp, payload, secret });

    expect(() =>
      verifyStandardWebhook({
        payload: `${payload} `,
        headers: getWebhookHeaders(headers(`v1,${signature}`)),
        secret,
        now,
      }),
    ).toThrow(WebhookVerificationError);
  });

  test('rejects a stale timestamp', () => {
    const signature = computeWebhookSignature({ id: 'msg_1', timestamp, payload, secret });

    expect(() =>
      verifyStandardWebhook({
        payload,
        headers: getWebhookHeaders(headers(`v1,${signature}`)),
        secret,
        now: new Date(now.getTime() + 10 * 60 * 1000),
      }),
    ).toThrow(/tolerance/);
  });

  test('rejects missing signature headers', () => {
    expect(() =>
      verifyStandardWebhook({
        payload,
        headers: getWebhookHeaders(new Headers()),
        secret,
        now,
      }),
    ).toThrow(/Missing/);
  });
});
