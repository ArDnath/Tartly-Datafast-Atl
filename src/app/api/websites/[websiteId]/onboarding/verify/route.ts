import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { requireWebsiteAccess } from '@/lib/workspace-auth';

export const dynamic = 'force-dynamic';

/**
 * Answers one question for onboarding: has this website received a real event
 * yet? The dashboard polls this endpoint after showing the install snippet.
 *
 * It uses the workspace-scoped access check, not a raw website lookup, so it
 * cannot be used to probe another tenant's installation state.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const access = await requireWebsiteAccess(auth.user, websiteId, 'VIEWER');

  if (!access) {
    return unauthorized();
  }

  const [eventCount, latest] = await Promise.all([
    prisma.client.websiteEvent.count({ where: { websiteId } }),
    prisma.client.websiteEvent.findFirst({
      where: { websiteId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return json({
    installed: eventCount > 0,
    eventCount,
    lastEventAt: latest?.createdAt ?? null,
  });
}
