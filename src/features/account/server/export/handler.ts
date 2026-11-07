import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { unauthorized } from '@/lib/response';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/me/export`
 *
 * A portable JSON copy of the signed-in user's account data. It deliberately
 * excludes password hashes, session tokens, invitation tokens, provider
 * credentials, and other people's data. Payment-provider revenue rows are not
 * included because they belong to a website tenant, not to the account holder;
 * use the website export for those.
 */
export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return unauthorized();
  }

  const user = (await prisma.client.user.findFirst({
    where: { id: auth.user.id, deletedAt: null },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      workspaceMemberships: {
        select: {
          role: true,
          createdAt: true,
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              planId: true,
              subscriptionStatus: true,
              createdAt: true,
              websites: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  name: true,
                  domain: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      authSessions: {
        where: { revokedAt: null },
        select: { createdAt: true, lastUsedAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })) as any;

  if (!user) {
    return unauthorized();
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    account: {
      id: user.id,
      email: user.username,
      displayName: user.displayName,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    workspaces: user.workspaceMemberships.map(membership => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      planId: membership.workspace.planId,
      subscriptionStatus: membership.workspace.subscriptionStatus,
      joinedAt: membership.createdAt,
      websites: membership.workspace.websites,
    })),
    activeSessions: user.authSessions.map(session => ({
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      // No token, IP hash, or user agent is returned.
    })),
    notes: [
      "Credential material, session tokens, invitation tokens, provider credentials, and other members' data are never exported.",
      "Analytics events and replay payloads are available from each website's export tools, subject to plan retention.",
    ],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="tartly-account-${user.id}.json"`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
