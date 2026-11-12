import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, notFound } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getWorkspaceBillingAccess } from '@/features/billing/server/access/service';

const schema = z.object({
  workspaceId: z.uuid(),
});

/**
 * Compact billing state for the app shell. Every member may read it so the
 * paywall can explain why a workspace is locked; only the owner can act on it.
 */
export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const access = await requireWorkspaceAccess(auth.user, query.workspaceId, 'VIEWER');

  if (!access) {
    return notFound({ message: 'Workspace not found.' });
  }

  const billing = await getWorkspaceBillingAccess(query.workspaceId);

  if (!billing) {
    return notFound({ message: 'Workspace not found.' });
  }

  return json({ ...billing, role: access.role });
}
