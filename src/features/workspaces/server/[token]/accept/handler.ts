import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { recordAuditEvent } from '@/queries/prisma';
import {
  acceptWorkspaceInvitation,
  InvitationError,
} from '@/features/workspaces/lib/workspace-invitations';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return unauthorized();
  }

  const { token } = await params;

  try {
    const result = (await acceptWorkspaceInvitation({ user: auth.user, token })) as unknown as {
      workspaceId: string;
      role: string;
    };

    await recordAuditEvent({
      auth,
      eventType: 'invitation.accepted',
      request,
      resourceId: result.workspaceId,
      resourceType: 'workspace',
      metadata: { role: result.role },
    });

    return json(result);
  } catch (cause) {
    if (cause instanceof InvitationError) {
      return badRequest({ code: cause.code, message: cause.message });
    }

    throw cause;
  }
}
