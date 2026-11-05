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
      auditEvent: { findMany: vi.fn() },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.client.auditEvent.findMany as any).mockResolvedValue([
    {
      id: 'audit-1',
      eventType: 'workspace.suspended',
      resourceType: 'workspace',
      resourceId: 'workspace-1',
      userId: 'operator-1',
      websiteId: null,
      createdAt: new Date('2026-11-06T00:00:00.000Z'),
    },
  ]);
});

test('rejects a normal authenticated user', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1', isPlatformAdmin: false } },
    query: { limit: 50 },
  } as any);

  const response = await GET(new Request('https://example.com/api/admin/audit'));

  expect(response.status).toBe(403);
  expect(prisma.client.auditEvent.findMany).not.toHaveBeenCalled();
});

test('returns audit rows without IP, user agent, or metadata', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'operator-1', isPlatformAdmin: true } },
    query: { limit: 50 },
  } as any);

  const response = await GET(new Request('https://example.com/api/admin/audit'));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.data[0]).toMatchObject({
    id: 'audit-1',
    eventType: 'workspace.suspended',
  });
  expect(body.data[0].ipAddress).toBeUndefined();
  expect(body.data[0].userAgent).toBeUndefined();
  expect(body.data[0].metadata).toBeUndefined();
  expect(prisma.client.auditEvent.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      select: expect.not.objectContaining({ ipAddress: true }),
    }),
  );
});
