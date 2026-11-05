import { afterEach, describe, expect, test, vi } from 'vitest';
import { captureException, redactLogFields, serializeError } from './logger';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('redactLogFields', () => {
  test('removes secret-shaped keys at any depth', () => {
    const result = redactLogFields({
      email: 'founder@example.com',
      password: 'hunter2',
      nested: {
        apiKey: 'tlv_123',
        authorization: 'Bearer abc',
        providerWebhookSecret: 'whsec_123',
        safe: 'visible',
      },
      list: [{ tokenHash: 'abc', keep: 1 }],
    });

    expect(result).toEqual({
      email: 'founder@example.com',
      password: '[redacted]',
      nested: {
        apiKey: '[redacted]',
        authorization: '[redacted]',
        providerWebhookSecret: '[redacted]',
        safe: 'visible',
      },
      list: [{ tokenHash: '[redacted]', keep: 1 }],
    });
  });

  test('serializes errors without leaking the raw object', () => {
    const error = new Error('boom');
    error.name = 'TestError';

    expect(serializeError(error)).toMatchObject({ name: 'TestError', message: 'boom' });
  });
});

describe('captureException', () => {
  test('writes locally when no webhook is configured', async () => {
    vi.stubEnv('ERROR_TRACKING_WEBHOOK', '');
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

    await captureException(new Error('local-only'), { event: 'test.failure' });

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(String(errorLog.mock.calls[0][0])).toContain('test.failure');
  });

  test('posts to the configured webhook and redacts context', async () => {
    vi.stubEnv('ERROR_TRACKING_WEBHOOK', 'https://errors.test/ingest');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

    await captureException(new Error('remote'), { workspaceId: 'w1', apiKey: 'secret' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(body.context.apiKey).toBe('[redacted]');
    expect(body.context.workspaceId).toBe('w1');
  });

  test('never throws when the webhook is down', async () => {
    vi.stubEnv('ERROR_TRACKING_WEBHOOK', 'https://errors.test/ingest');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(captureException(new Error('remote'))).resolves.toBeUndefined();
  });
});
