import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import { MemberError, removeWorkspaceMember, updateWorkspaceMemberRole } from '@/features/workspaces/lib/workspace-members';

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
    return json(
      await updateWorkspaceMemberRole({
        user: auth.user,
        workspaceId,
        memberId,
        role: body.role,
      }),
    );
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

    return json({ ok: true });
  } catch (cause) {
    if (cause instanceof MemberError) {
      return badRequest({ code: cause.code, message: cause.message });
    }

    throw cause;
  }
}
