import { parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import { recordAuditEvent } from '@/queries/prisma';
import {
  InvitationError,
  revokeWorkspaceInvitation,
} from '@/features/workspaces/lib/workspace-invitations';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; invitationId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { workspaceId, invitationId } = await params;

  try {
    await revokeWorkspaceInvitation({
      user: auth.user,
      workspaceId,
      invitationId,
    });

    await recordAuditEvent({
      auth,
      eventType: 'invitation.revoked',
      request,
      resourceId: invitationId,
      resourceType: 'workspace_invitation',
    });

    return json({ ok: true });
  } catch (cause) {
    if (cause instanceof InvitationError) {
      return badRequest({ code: cause.code, message: cause.message });
    }

    throw cause;
  }
}
