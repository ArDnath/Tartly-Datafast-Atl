import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, notFound } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getWorkspaceBillingState } from '@/features/billing/server/service';

const schema = z.object({
  workspaceId: z.uuid(),
});

/** Billing state is visible to every member; only the owner can change it. */
export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const access = await requireWorkspaceAccess(auth.user, query.workspaceId, 'VIEWER');

  if (!access) {
    return notFound({ message: 'Workspace not found.' });
  }

  return json({
    workspaceId: query.workspaceId,
    role: access.role,
    ...(await getWorkspaceBillingState(query.workspaceId)),
  });
}
