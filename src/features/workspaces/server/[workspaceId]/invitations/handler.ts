import { z } from 'zod';
import { getPublicOrigin } from '@/lib/get-base-url';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import {
  createWorkspaceInvitation,
  InvitationError,
  listWorkspaceInvitations,
} from '@/features/workspaces/lib/workspace-invitations';

const createSchema = z.object({
  email: z.email().max(320),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

function invitationError(cause: unknown) {
  if (cause instanceof InvitationError) {
    return badRequest({ code: cause.code, message: cause.message });
  }

  throw cause;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { workspaceId } = await params;
  const invitations = await listWorkspaceInvitations({ user: auth.user, workspaceId });

  if (!invitations) {
    return unauthorized();
  }

  return json(invitations);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, createSchema);

  if (error) {
    return error();
  }

  const { workspaceId } = await params;

  try {
    const invitation = await createWorkspaceInvitation({
      user: auth.user,
      workspaceId,
      email: body.email,
      role: body.role,
      origin: getPublicOrigin(request),
    });

    return json(invitation);
  } catch (cause) {
    return invitationError(cause);
  }
}
