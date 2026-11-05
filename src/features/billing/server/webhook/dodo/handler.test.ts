import { beforeEach, expect, test, vi } from 'vitest';
import { computeWebhookSignature } from '@/features/billing/lib/standard-webhook';
import { getBillingConfig } from '@/features/billing/server/provider';
import { processDodoWebhook } from '@/features/billing/server/service';
import { POST } from './handler';

vi.mock('@/features/billing/server/provider', () => ({ getBillingConfig: vi.fn() }));
vi.mock('@/features/billing/server/service', () => ({ processDodoWebhook: vi.fn() }));

const secret = `whsec_${Buffer.from('platform-webhook-test-secret-32b').toString('base64')}`;
const payload = JSON.stringify({ type: 'subscription.active', data: { subscription_id: 'sub_1' } });
const timestamp = String(Math.floor(Date.now() / 1000));

function signedRequest(signatureSecret = secret) {
  return new Request('https://app.example.com/api/billing/webhook/dodo', {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': 'msg_1',
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${computeWebhookSignature({
        id: 'msg_1',
        timestamp,
        payload,
        secret: signatureSecret,
      })}`,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBillingConfig).mockReturnValue({
    providerName: 'dodo',
    environment: 'test_mode',
    apiKey: 'key',
    webhookSecret: secret,
    products: [{ planId: 'starter', interval: 'monthly', productId: 'pdt_starter' }],
  });
  vi.mocked(processDodoWebhook).mockResolvedValue('processed');
});

test('rejects an invalid signature before parsing the event', async () => {
  const response = await POST(signedRequest('whsec_wrong-secret-value-32-bytes'));
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('webhook-invalid-signature');
  expect(processDodoWebhook).not.toHaveBeenCalled();
});

test('acknowledges a replayed event without reprocessing it', async () => {
  vi.mocked(processDodoWebhook).mockResolvedValue('duplicate');

  const response = await POST(signedRequest());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.status).toBe('duplicate');
});

test('processes a verified event exactly once per delivery', async () => {
  const response = await POST(signedRequest());

  expect(response.status).toBe(200);
  expect(processDodoWebhook).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'msg_1', type: 'subscription.active' }),
    expect.objectContaining({ providerName: 'dodo' }),
  );
});

test('returns 503 when platform billing is not configured', async () => {
  vi.mocked(getBillingConfig).mockReturnValue(null);

  const response = await POST(signedRequest());

  expect(response.status).toBe(503);
  expect(processDodoWebhook).not.toHaveBeenCalled();
});
