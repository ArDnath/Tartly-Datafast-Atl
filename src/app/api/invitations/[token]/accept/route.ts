import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { acceptWorkspaceInvitation, InvitationError } from '@/lib/workspace-invitations';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return unauthorized();
  }

  const { token } = await params;

  try {
    return json(await acceptWorkspaceInvitation({ user: auth.user, token }));
  } catch (cause) {
    if (cause instanceof InvitationError) {
      return badRequest({ code: cause.code, message: cause.message });
    }

    throw cause;
  }
}
