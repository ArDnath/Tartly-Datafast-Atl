import { beforeEach, expect, test, vi } from 'vitest';

const queryRaw = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      $queryRaw: queryRaw,
    },
  },
}));

const { consumeRateLimit, hashRateLimitSubject, rateLimitKey } = await import('./rate-limit');

beforeEach(() => {
  vi.clearAllMocks();
});

test('allows requests up to the limit', async () => {
  queryRaw.mockResolvedValue([{ count: 5, expires_at: new Date(Date.now() + 60_000) }]);

  await expect(
    consumeRateLimit({ key: 'login:ip:one', limit: 5, windowSeconds: 60 }),
  ).resolves.toMatchObject({
    allowed: true,
    remaining: 0,
    limit: 5,
  });
});

test('blocks requests over the limit and returns a retry window', async () => {
  queryRaw.mockResolvedValue([{ count: 6, expires_at: new Date(Date.now() + 30_000) }]);

  await expect(
    consumeRateLimit({ key: 'login:ip:one', limit: 5, windowSeconds: 60 }),
  ).resolves.toMatchObject({
    allowed: false,
    remaining: 0,
  });
});

test('fails open if the counter store is unavailable', async () => {
  queryRaw.mockRejectedValue(new Error('database unavailable'));

  await expect(
    consumeRateLimit({ key: 'login:ip:one', limit: 5, windowSeconds: 60 }),
  ).resolves.toMatchObject({
    allowed: true,
  });
});

test('builds scoped keys and hashes subjects', () => {
  expect(rateLimitKey('login:ip', 'one', undefined, 'two')).toBe('login:ip:one:two');
  expect(hashRateLimitSubject('203.0.113.9')).toHaveLength(32);
  expect(hashRateLimitSubject('203.0.113.9')).not.toContain('203.0.113.9');
});
