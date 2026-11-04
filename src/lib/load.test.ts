import { beforeEach, expect, test, vi } from 'vitest';

const redis = vi.hoisted(() => ({
  enabled: true,
  client: {
    fetch: vi.fn(),
  },
}));

vi.mock('@/lib/redis', () => ({ default: redis }));
vi.mock('@/queries/prisma', () => ({ getWebsite: vi.fn() }));
vi.mock('@/queries/sql', () => ({ getWebsiteSession: vi.fn() }));

const { fetchSession } = await import('./load');

beforeEach(() => {
  vi.clearAllMocks();
});

test('scopes cached sessions by website and session ID', async () => {
  redis.client.fetch.mockResolvedValue({ id: 'session-1', websiteId: 'website-1' });

  await expect(fetchSession('website-1', 'session-1')).resolves.toMatchObject({
    id: 'session-1',
  });

  expect(redis.client.fetch.mock.calls[0][0]).toBe('session:website-1:session-1');
});

test('rejects a cached session that belongs to another website', async () => {
  redis.client.fetch.mockResolvedValue({ id: 'session-1', websiteId: 'website-2' });

  await expect(fetchSession('website-1', 'session-1')).resolves.toBeNull();
});
