import { parseRequest } from '@/lib/request';
import { json, notFound } from '@/lib/response';
import { previewWorkspaceInvitation } from '@/lib/workspace-invitations';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { error } = await parseRequest(request, undefined, { skipAuth: true });

  if (error) {
    return error();
  }

  const { token } = await params;
  const invitation = await previewWorkspaceInvitation(token);

  if (!invitation) {
    return notFound({ message: 'This invitation is not valid.' });
  }

  return json(invitation);
}
