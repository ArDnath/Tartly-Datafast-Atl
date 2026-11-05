import { beforeEach, describe, expect, test, vi } from 'vitest';

const { parseRequest, prisma } = vi.hoisted(() => ({
  parseRequest: vi.fn(),
  prisma: { client: { user: { findFirst: vi.fn() } } },
}));

vi.mock('@/lib/request', () => ({ parseRequest }));
vi.mock('@/lib/prisma', () => ({ default: prisma }));

import { GET } from './handler';

describe('GET /api/me/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseRequest.mockResolvedValue({ auth: { user: { id: 'user-1' } }, error: undefined });
    prisma.client.user.findFirst.mockResolvedValue({
      id: 'user-1',
      username: 'founder@example.com',
      displayName: 'Founder',
      role: 'user',
      emailVerifiedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      workspaceMemberships: [
        {
          role: 'OWNER',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          workspace: {
            id: 'workspace-1',
            name: 'Acme',
            slug: 'acme',
            planId: 'pro',
            subscriptionStatus: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            websites: [
              {
                id: 'website-1',
                name: 'Acme app',
                domain: 'acme.test',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
              },
            ],
          },
        },
      ],
      authSessions: [
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          lastUsedAt: null,
          expiresAt: new Date('2026-02-01T00:00:00.000Z'),
        },
      ],
    });
  });

  test('returns an attachment with the account and workspace data', async () => {
    const response = await GET(new Request('http://localhost/api/me/export'));
    const payload = await response.json();

    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(payload.account.email).toBe('founder@example.com');
    expect(payload.workspaces[0].websites[0].domain).toBe('acme.test');
  });

  test('never includes credential material', async () => {
    const response = await GET(new Request('http://localhost/api/me/export'));
    const text = await response.text();

    for (const forbidden of ['password', 'tokenHash', 'invitationTokenHash', 'apiKey', 'secret']) {
      expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  test('rejects an unauthenticated request', async () => {
    parseRequest.mockResolvedValue({
      auth: null,
      error: () => new Response(null, { status: 401 }),
    });

    const response = await GET(new Request('http://localhost/api/me/export'));

    expect(response.status).toBe(401);
  });
});
