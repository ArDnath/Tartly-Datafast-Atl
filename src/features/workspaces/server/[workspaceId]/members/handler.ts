import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { listWorkspaceMembers } from '@/features/workspaces/lib/workspace-members';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { workspaceId } = await params;
  const members = await listWorkspaceMembers({ user: auth.user, workspaceId });

  if (!members) {
    return unauthorized();
  }

  return json(members);
}
