import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { DELETE, GET, PATCH } from './handler';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/workspace-auth', () => ({ requireWorkspaceAccess: vi.fn() }));
vi.mock('@/queries/prisma', () => ({ recordAuditEvent: vi.fn() }));

const prisma = vi.hoisted(() => ({
  client: {
    workspace: { update: vi.fn() },
    workspaceMembership: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    workspaceInvitation: { deleteMany: vi.fn() },
    website: { updateMany: vi.fn() },
  },
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma.client)),
}));

vi.mock('@/lib/prisma', () => ({ default: prisma }));

const access = {
  workspaceId: 'workspace-1',
  role: 'OWNER' as const,
  workspace: {
    id: 'workspace-1',
    name: 'Acme',
    slug: 'acme',
    logoUrl: null,
    ownerId: 'user-1',
    planId: 'starter',
    subscriptionStatus: 'active',
  },
};

function params(workspaceId = 'workspace-1') {
  return { params: Promise.resolve({ workspaceId }) };
}

function request(method = 'DELETE') {
  return new Request('https://app.example.com/api/workspaces/workspace-1', { method });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {},
    query: {},
  } as any);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(access as any);
  (prisma.client.workspaceMembership.findUnique as any).mockResolvedValue(null);
  (prisma.client.workspaceMembership.update as any).mockResolvedValue({ id: 'membership-1' });
  (prisma.client.workspaceMembership.updateMany as any).mockResolvedValue({ count: 1 });
  (prisma.client.workspaceMembership.deleteMany as any).mockResolvedValue({ count: 1 });
  (prisma.client.workspaceInvitation.deleteMany as any).mockResolvedValue({ count: 1 });
  (prisma.client.website.updateMany as any).mockResolvedValue({ count: 1 });
  (prisma.client.workspace.update as any).mockResolvedValue({ id: 'workspace-1' });
});

test('returns 404 when the user is not a member', async () => {
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

  const response = await GET(request('GET'), params());

  expect(response.status).toBe(404);
});

test('deletes a workspace only with the exact slug confirmation', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { confirmation: 'wrong' },
    query: {},
  } as any);

  const rejected = await DELETE(request(), params());

  expect(rejected.status).toBe(403);
  expect(prisma.client.website.updateMany).not.toHaveBeenCalled();

  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { confirmation: 'acme' },
    query: {},
  } as any);

  const accepted = await DELETE(request(), params());

  expect(accepted.status).toBe(200);
  expect(prisma.client.website.updateMany).toHaveBeenCalledWith({
    where: { workspaceId: 'workspace-1', deletedAt: null },
    data: { deletedAt: expect.any(Date) },
  });
  expect(prisma.client.workspaceMembership.deleteMany).toHaveBeenCalledWith({
    where: { workspaceId: 'workspace-1' },
  });
});

test('requires OWNER to delete', async () => {
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

  const response = await DELETE(request(), params());

  expect(response.status).toBe(404);
  expect(requireWorkspaceAccess).toHaveBeenCalledWith(expect.anything(), 'workspace-1', 'OWNER');
  expect(prisma.transaction).not.toHaveBeenCalled();
});

test('refuses to transfer ownership to a non-member', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { transferToUserId: '00000000-0000-4000-8000-000000000099' },
    query: {},
  } as any);

  const response = await PATCH(request('PATCH'), params());

  expect(response.status).toBe(400);
  expect(prisma.transaction).not.toHaveBeenCalled();
});

test('updates a workspace photo', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { logoUrl: 'data:image/png;base64,AAAA' },
    query: {},
  } as any);

  const response = await PATCH(request('PATCH'), params());

  expect(response.status).toBe(200);
  expect(prisma.client.workspace.update).toHaveBeenCalledWith({
    where: { id: 'workspace-1' },
    data: { logoUrl: 'data:image/png;base64,AAAA' },
    select: { id: true },
  });
});

test('transfers ownership to an existing member and demotes the old owner', async () => {
  (prisma.client.workspaceMembership.findUnique as any).mockResolvedValue({ userId: 'user-2' });
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { transferToUserId: '00000000-0000-4000-8000-000000000002' },
    query: {},
  } as any);

  const response = await PATCH(request('PATCH'), params());

  expect(response.status).toBe(200);
  expect(prisma.client.workspace.update).toHaveBeenCalledWith({
    where: { id: 'workspace-1' },
    data: { ownerId: '00000000-0000-4000-8000-000000000002' },
    select: { id: true },
  });
  expect(prisma.client.workspaceMembership.updateMany).toHaveBeenCalledWith({
    where: { workspaceId: 'workspace-1', userId: 'user-1' },
    data: { role: 'ADMIN' },
  });
});
