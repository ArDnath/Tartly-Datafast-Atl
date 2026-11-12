import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getWebsiteInstallStatus } from '../queries/installStatus';

const schema = z.strictObject({
  workspaceId: z.uuid(),
});

/**
 * Read-only install status for the signed-in shell. The workspace check is the
 * authorization boundary; the query itself is also scoped to that workspace.
 */
export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const access = await requireWorkspaceAccess(auth.user, query.workspaceId, 'VIEWER');

  if (!access) {
    return unauthorized({ message: 'You cannot view this workspace.' });
  }

  return json({ data: await getWebsiteInstallStatus(query.workspaceId) });
}
