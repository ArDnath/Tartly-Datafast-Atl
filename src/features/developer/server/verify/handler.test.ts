import { beforeEach, describe, expect, test, vi } from 'vitest';

const { authenticateApiKey, prisma } = vi.hoisted(() => ({
  authenticateApiKey: vi.fn(),
  prisma: {
    client: {
      website: { findFirst: vi.fn() },
      websiteEvent: { count: vi.fn(), findFirst: vi.fn() },
    },
  },
}));

vi.mock('@/features/websites/lib/api-key', () => ({ authenticateApiKey }));
vi.mock('@/lib/prisma', () => ({ default: prisma }));

import { GET } from './handler';

function request(headers: Record<string, string> = { authorization: 'Bearer key' }) {
  return new Request('http://localhost/api/developer/verify', { headers });
}

describe('GET /api/developer/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.client.website.findFirst.mockResolvedValue({ id: 'website-a', domain: 'example.com' });
    prisma.client.websiteEvent.count.mockResolvedValue(3);
    prisma.client.websiteEvent.findFirst.mockResolvedValue({
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
    });
  });

  test('rejects a request without an API key', async () => {
    authenticateApiKey.mockResolvedValue(null);

    const response = await GET(request({}));

    expect(response.status).toBe(401);
  });

  test('rejects a key that is not scoped to a website', async () => {
    authenticateApiKey.mockResolvedValue({ websiteId: null });

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'api-key-not-website-scoped' } });
  });

  test('uses the key website and reports a real event count', async () => {
    authenticateApiKey.mockResolvedValue({ websiteId: 'website-a' });

    const response = await GET(request());
    const payload = await response.json();

    expect(payload).toMatchObject({
      installed: true,
      websiteId: 'website-a',
      eventCount: 3,
    });
    expect(prisma.client.websiteEvent.count).toHaveBeenCalledWith({
      where: { websiteId: 'website-a' },
    });
  });

  test('reports not installed when the website has no events', async () => {
    authenticateApiKey.mockResolvedValue({ websiteId: 'website-a' });
    prisma.client.websiteEvent.count.mockResolvedValue(0);
    prisma.client.websiteEvent.findFirst.mockResolvedValue(null);

    const payload = await (await GET(request())).json();

    expect(payload.installed).toBe(false);
    expect(payload.lastEventAt).toBeNull();
  });
});
