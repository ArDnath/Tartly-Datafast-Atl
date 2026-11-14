import { beforeEach, expect, test, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getUserWebsites } from './website';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      user: {
        findUnique: vi.fn(),
      },
      workspaceMembership: {
        findMany: vi.fn(async () => []),
      },
    },
    getSearchParameters: vi.fn(() => ({})),
    pagedQuery: vi.fn(async () => ({ data: [], count: 0 })),
  },
}));

const prismaMock = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.client.user.findUnique.mockResolvedValue({
    username: 'shared@example.com',
  });
});

test('getUserWebsites includes websites shared to the user by id or username', async () => {
  await getUserWebsites('user-1', { search: 'taisly' } as any);

  const [, criteria] = prismaMock.pagedQuery.mock.calls[0];

  expect(criteria.where.OR).toEqual([
    { workspaceId: { in: [] } },
    {
      workspaceId: null,
      OR: [
        { userId: 'user-1' },
        {
          members: {
            some: {
              OR: [{ userId: 'user-1' }, { username: 'shared@example.com' }],
            },
          },
        },
      ],
    },
  ]);
  expect(prismaMock.client.workspaceMembership.findMany).toHaveBeenCalledWith({
    where: {
      userId: 'user-1',
      workspace: { deletedAt: null, suspendedAt: null },
    },
    select: { workspaceId: true },
  });
});

test('getUserWebsites includes workspace membership and narrows to an authorized workspace', async () => {
  prismaMock.client.workspaceMembership.findMany.mockResolvedValue([
    { workspaceId: 'workspace-a' },
  ]);

  await getUserWebsites('user-1', { search: 'taisly' } as any, 'workspace-a');

  const [, criteria] = prismaMock.pagedQuery.mock.calls[0];

  expect(criteria.where.workspaceId).toBe('workspace-a');
  expect(criteria.where.OR).toContainEqual({ workspaceId: { in: ['workspace-a'] } });
});
