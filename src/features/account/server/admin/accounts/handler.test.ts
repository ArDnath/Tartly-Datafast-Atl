import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import prisma from '@/lib/prisma';
import { GET } from './handler';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      user: { findMany: vi.fn() },
      workspace: { findMany: vi.fn() },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(prisma.client.user.findMany as any).mockResolvedValue([
    { id: 'u1', username: 'a@example.com', suspendedAt: null },
  ] as any);
  vi.mocked(prisma.client.workspace.findMany as any).mockResolvedValue([
    {
      id: 'w1',
      name: 'Acme',
      slug: 'acme',
      suspendedAt: null,
      owner: { username: 'a@example.com' },
    },
  ] as any);
});

test('rejects a normal authenticated user', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'u1', isPlatformAdmin: false } },
    query: { query: 'acme' },
  } as any);

  const response = await GET(new Request('https://example.com/api/admin/accounts?query=acme'));

  expect(response.status).toBe(403);
  expect(prisma.client.user.findMany).not.toHaveBeenCalled();
});

test('returns only operator fields to a platform admin', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'op', isPlatformAdmin: true } },
    query: { query: 'acme' },
  } as any);

  const response = await GET(new Request('https://example.com/api/admin/accounts?query=acme'));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.users).toEqual([{ id: 'u1', username: 'a@example.com', suspendedAt: null }]);
  expect(body.workspaces[0].ownerUsername).toBe('a@example.com');
  expect(body.workspaces[0].owner).toBeUndefined();
  expect(body.workspaces[0].suspensionReason).toBeUndefined();
});
