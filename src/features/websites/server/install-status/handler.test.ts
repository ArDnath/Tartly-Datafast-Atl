import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { unauthorized } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { GET } from './handler';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/workspace-auth', () => ({
  requireWorkspaceAccess: vi.fn(),
}));

const findMany = vi.hoisted(() => vi.fn());
const rawQuery = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      website: {
        findMany,
      },
    },
    rawQuery,
  },
}));

const workspaceId = 'a4b9f5e0-1d13-4f42-9f06-2ecd6f53d8df';
const connectedId = '50f07dc0-ea8f-4d75-9ddd-b074922b3681';
const pendingId = '7d3d7e8e-6c2a-4d79-a1a4-1f6c3d5f2c3a';

async function callHandler() {
  return GET(
    new Request(`https://tartly.in/api/websites/install-status?workspaceId=${workspaceId}`),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: { workspaceId },
    error: null,
  } as any);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({
    workspaceId,
    role: 'VIEWER',
    workspace: { id: workspaceId },
  } as any);
  findMany.mockResolvedValue([
    { id: connectedId, name: 'Connected', domain: 'connected.example' },
    { id: pendingId, name: 'Pending', domain: 'pending.example' },
  ]);
  rawQuery.mockResolvedValue([{ websiteId: connectedId }]);
});

test('rejects an unauthenticated request before reading websites', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: null,
    error: () => unauthorized(),
  } as any);

  const response = await callHandler();

  expect(response.status).toBe(401);
  expect(findMany).not.toHaveBeenCalled();
});

test('rejects a workspace the user cannot view', async () => {
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

  const response = await callHandler();

  expect(response.status).toBe(401);
  expect(findMany).not.toHaveBeenCalled();
  expect(rawQuery).not.toHaveBeenCalled();
});

test('returns the workspace websites with event-backed connection flags', async () => {
  const response = await callHandler();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(findMany).toHaveBeenCalledWith({
    where: { workspaceId, deletedAt: null },
    select: { id: true, name: true, domain: true },
    orderBy: { createdAt: 'asc' },
  });
  expect(body.data).toEqual([
    { id: connectedId, name: 'Connected', domain: 'connected.example', connected: true },
    { id: pendingId, name: 'Pending', domain: 'pending.example', connected: false },
  ]);
});

test('scopes the event check with a parameter, not string interpolation', async () => {
  await callHandler();

  const [sql, params] = vi.mocked(rawQuery).mock.calls[0];

  expect(sql).toContain('w.workspace_id = {{workspaceId::uuid}}');
  expect(sql).toContain('exists');
  expect(params).toEqual({ workspaceId });
  expect(sql).not.toContain(workspaceId);
});

test('skips the event query when the workspace has no websites', async () => {
  findMany.mockResolvedValue([]);

  const response = await callHandler();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.data).toEqual([]);
  expect(rawQuery).not.toHaveBeenCalled();
});
