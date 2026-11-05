import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { pagingParams } from '@/lib/schema';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getUserWebsites } from '@/queries/prisma';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    workspaceId: z.uuid().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { workspaceId, ...rest } = query;

  if (workspaceId) {
    const access = await requireWorkspaceAccess(auth.user, workspaceId, 'VIEWER');

    if (!access) {
      return unauthorized({ message: 'You cannot view this workspace.' });
    }
  }

  const filters = await getQueryFilters(rest);

  return json(await getUserWebsites(auth.user.id, filters, workspaceId));
}
