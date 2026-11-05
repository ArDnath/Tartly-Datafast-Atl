import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import { recordAuditEvent } from '@/queries/prisma';
import {
  MemberError,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from '@/features/workspaces/lib/workspace-members';

const updateSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

function memberError(cause: unknown) {
  if (cause instanceof MemberError) {
    return badRequest({ code: cause.code, message: cause.message });
  }

  throw cause;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, updateSchema);

  if (error) {
    return error();
  }

  const { workspaceId, memberId } = await params;

  try {
    const result = await updateWorkspaceMemberRole({
      user: auth.user,
      workspaceId,
      memberId,
      role: body.role,
    });

    await recordAuditEvent({
      auth,
      eventType: 'member.role_changed',
      metadata: { role: body.role },
      request,
      resourceId: memberId,
      resourceType: 'workspace_member',
    });

    return json(result);
  } catch (cause) {
    return memberError(cause);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { workspaceId, memberId } = await params;

  try {
    await removeWorkspaceMember({ user: auth.user, workspaceId, memberId });

    await recordAuditEvent({
      auth,
      eventType: 'member.removed',
      request,
      resourceId: memberId,
      resourceType: 'workspace_member',
    });

    return json({ ok: true });
  } catch (cause) {
    if (cause instanceof MemberError) {
      return badRequest({ code: cause.code, message: cause.message });
    }

    throw cause;
  }
}
