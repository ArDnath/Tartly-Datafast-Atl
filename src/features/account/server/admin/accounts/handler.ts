import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { forbidden, json } from '@/lib/response';
import prisma from '@/lib/prisma';

const schema = z.object({
  query: z.string().trim().min(2).max(255),
});

/**
 * Platform-admin account lookup for abuse controls.
 *
 * Returns only the fields an operator needs to identify an account and act on
 * it. It never returns password hashes, session tokens, provider credentials,
 * or customer event data. Workspace membership does not grant access here.
 */
export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!auth.user?.isPlatformAdmin) {
    return forbidden();
  }

  const search = query.query;
  const [users, workspaces] = await Promise.all([
    prisma.client.user.findMany({
      where: { username: { contains: search, mode: 'insensitive' } },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        deletedAt: true,
        suspendedAt: true,
        suspensionReason: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.client.workspace.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        planId: true,
        createdAt: true,
        deletedAt: true,
        suspendedAt: true,
        suspensionReason: true,
        owner: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return json({
    query: search,
    users,
    workspaces: workspaces.map(({ owner, ...workspace }) => ({
      ...workspace,
      ownerUsername: owner?.username ?? null,
    })),
  });
}
