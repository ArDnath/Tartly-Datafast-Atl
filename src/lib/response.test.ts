import { beforeEach, expect, test, vi } from 'vitest';
import { SHARE_CONTEXT_HEADER, SHARE_TOKEN_HEADER } from '@/lib/constants';
import { SHARED_REDACTED_VALUE } from '@/lib/share-redaction';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const { headers } = await import('next/headers');
const { json, serverError } = await import('./response');
const { logger } = await import('@/lib/logger');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue(new Headers() as any);
});

test('returns original values outside share context', async () => {
  const response = await json({ customerName: 'Ada', amount: 13 });

  await expect(response.json()).resolves.toEqual({ customerName: 'Ada', amount: 13 });
});

test('redacts values when both share headers are present', async () => {
  vi.mocked(headers).mockResolvedValue(
    new Headers({
      [SHARE_CONTEXT_HEADER]: '1',
      [SHARE_TOKEN_HEADER]: 'share-token',
    }) as any,
  );

  const response = await json({ customerName: 'Ada', amount: 13 });

  await expect(response.json()).resolves.toEqual({
    customerName: SHARED_REDACTED_VALUE,
    amount: 13,
  });
});

test('serverError never returns a stack, query, or driver object', async () => {
  const response = serverError({
    errorObject: {
      name: 'PrismaClientKnownRequestError',
      message: 'Unique constraint failed on the fields: (`email`)',
      stack: 'at handler (/app/src/secret.ts:1:1)',
      query: 'INSERT INTO user ...',
    },
  });
  const body = await response.json();

  expect(response.status).toBe(500);
  expect(body.error.errorObject).toBeUndefined();
  expect(JSON.stringify(body)).not.toContain('secret.ts');
  expect(JSON.stringify(body)).not.toContain('INSERT INTO');
  expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
    'api.server_error',
    expect.objectContaining({ message: expect.stringContaining('Unique constraint') }),
  );
});
