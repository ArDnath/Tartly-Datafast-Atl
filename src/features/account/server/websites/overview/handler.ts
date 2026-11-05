import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, withDateRange } from '@/lib/schema';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getWebsiteAccess } from '@/permissions';
import { getUserWebsiteOverview } from '@/queries/prisma';

export async function GET(request: Request) {
  const schema = withDateRange({
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
  const overview = await getUserWebsiteOverview(auth.user.id, filters, workspaceId);
  const data = await Promise.all(
    overview.data.map(async website => ({
      ...website,
      access: await getWebsiteAccess(auth, website.id),
    })),
  );

  return json({ ...overview, data });
}
