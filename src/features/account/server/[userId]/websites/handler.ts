import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams } from '@/lib/schema';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getUserWebsites } from '@/queries/prisma/website';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
    workspaceId: z.uuid().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { userId } = await params;
  const { workspaceId, ...rest } = query;

  // A user can only list their own website collection. Tenant data is never
  // reachable by swapping a user ID, even for platform admins.
  if (auth.user.id !== userId) {
    return unauthorized();
  }

  if (workspaceId) {
    const access = await requireWorkspaceAccess(auth.user, workspaceId, 'VIEWER');

    if (!access) {
      return unauthorized({ message: 'You cannot view this workspace.' });
    }
  }

  const filters = await getQueryFilters(rest);

  return json(await getUserWebsites(userId, filters, workspaceId));
}
