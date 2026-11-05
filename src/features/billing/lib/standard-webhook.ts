import crypto from 'node:crypto';

/**
 * Standard Webhooks verification for platform billing.
 *
 * Dodo Payments signs every delivery with the Standard Webhooks scheme:
 * `webhook-id`, `webhook-timestamp`, and `webhook-signature`, where the
 * signature is HMAC-SHA256 over `${id}.${timestamp}.${rawBody}`.
 * Docs (fetched 2026-11-05):
 * https://docs.dodopayments.com/developer-resources/webhooks
 *
 * This is intentionally independent from the analytics Dodo integration. A
 * platform-billing secret must never be accepted on the customer revenue
 * webhook, and vice versa.
 */

export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export class WebhookVerificationError extends Error {
  code: 'missing-header' | 'invalid-signature' | 'stale-timestamp' | 'invalid-secret';

  constructor(code: WebhookVerificationError['code'], message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
    this.code = code;
  }
}

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export function getWebhookHeaders(headers: Headers): WebhookHeaders {
  return {
    id: headers.get('webhook-id'),
    timestamp: headers.get('webhook-timestamp'),
    signature: headers.get('webhook-signature'),
  };
}

function decodeSecret(secret: string): Buffer {
  const value = secret.trim().replace(/^whsec_/, '');

  if (!value) {
    throw new WebhookVerificationError('invalid-secret', 'Webhook secret is empty.');
  }

  // Standard Webhooks secrets are base64. Accept a raw-UTF8 secret too so a
  // local development value does not silently produce the wrong key.
  try {
    const decoded = Buffer.from(value, 'base64');

    if (decoded.length >= 16 && decoded.toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '')) {
      return decoded;
    }
  } catch {
    // Fall through to the raw value.
  }

  return Buffer.from(value, 'utf8');
}

function signatureCandidates(header: string): string[] {
  return header
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const comma = part.indexOf(',');

      return comma === -1 ? part : part.slice(comma + 1);
    })
    .filter(Boolean);
}

export function computeWebhookSignature({
  id,
  timestamp,
  payload,
  secret,
}: {
  id: string;
  timestamp: string;
  payload: string;
  secret: string;
}): string {
  return crypto
    .createHmac('sha256', decodeSecret(secret))
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64');
}

export interface VerifiedWebhook {
  id: string;
  timestamp: Date;
  payload: string;
}

export function verifyStandardWebhook({
  payload,
  headers,
  secret,
  now = new Date(),
  toleranceSeconds = WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
}: {
  payload: string;
  headers: WebhookHeaders;
  secret: string;
  now?: Date;
  toleranceSeconds?: number;
}): VerifiedWebhook {
  const { id, timestamp, signature } = headers;

  if (!id || !timestamp || !signature) {
    throw new WebhookVerificationError(
      'missing-header',
      'Missing webhook-id, webhook-timestamp, or webhook-signature header.',
    );
  }

  const timestampSeconds = Number(timestamp);

  if (!Number.isFinite(timestampSeconds)) {
    throw new WebhookVerificationError('stale-timestamp', 'Invalid webhook timestamp.');
  }

  const ageSeconds = Math.abs(now.getTime() / 1000 - timestampSeconds);

  if (ageSeconds > toleranceSeconds) {
    throw new WebhookVerificationError(
      'stale-timestamp',
      'Webhook timestamp is outside the allowed tolerance.',
    );
  }

  const expected = Buffer.from(
    computeWebhookSignature({ id, timestamp, payload, secret }),
    'utf8',
  );
  const candidates = signatureCandidates(signature).map(value => Buffer.from(value, 'utf8'));

  if (!candidates.some(candidate => candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected))) {
    throw new WebhookVerificationError('invalid-signature', 'Webhook signature does not match.');
  }

  return {
    id,
    timestamp: new Date(timestampSeconds * 1000),
    payload,
  };
}
