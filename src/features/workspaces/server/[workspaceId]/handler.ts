import { z } from 'zod';
import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, notFound, ok } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/queries/prisma';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  transferToUserId: z.uuid().optional(),
});

const deleteSchema = z.object({
  confirmation: z.string().min(1).max(100),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { workspaceId } = await params;
  const access = await requireWorkspaceAccess(auth.user, workspaceId, 'VIEWER');

  if (!access) {
    return notFound({ message: 'Workspace not found.' });
  }

  return json({
    ...access.workspace,
    role: access.role,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, updateSchema);

  if (error) {
    return error();
  }

  const { workspaceId } = await params;
  const isTransfer = Boolean(body.transferToUserId);
  const access = await requireWorkspaceAccess(
    auth.user,
    workspaceId,
    isTransfer ? 'OWNER' : 'ADMIN',
  );

  if (!access) {
    return notFound({ message: 'Workspace not found.' });
  }

  if (body.name) {
    await prisma.client.workspace.update({
      where: { id: workspaceId },
      data: { name: body.name },
      select: { id: true },
    });
  }

  if (body.transferToUserId) {
    if (body.transferToUserId === access.workspace.ownerId) {
      return badRequest({ message: 'That user already owns this workspace.' });
    }

    const membership = await prisma.client.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: body.transferToUserId,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      return badRequest({ message: 'The new owner must already be a member.' });
    }

    await prisma.transaction(async tx => {
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { ownerId: body.transferToUserId },
        select: { id: true },
      });

      await tx.workspaceMembership.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: body.transferToUserId as string,
          },
        },
        data: { role: 'OWNER' },
        select: { id: true },
      });

      await tx.workspaceMembership.updateMany({
        where: {
          workspaceId,
          userId: access.workspace.ownerId,
        },
        data: { role: 'ADMIN' },
      });
    });
  }

  const updated = await requireWorkspaceAccess(auth.user, workspaceId, 'VIEWER');

  await recordAuditEvent({
    auth,
    eventType: isTransfer ? 'workspace.transferred' : 'workspace.updated',
    request,
    resourceId: workspaceId,
    resourceType: 'workspace',
    metadata: {
      nameChanged: Boolean(body.name),
      transferredTo: body.transferToUserId ?? null,
    },
  });

  return json({ ...updated?.workspace, role: updated?.role });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, deleteSchema);

  if (error) {
    return error();
  }

  const { workspaceId } = await params;
  const access = await requireWorkspaceAccess(auth.user, workspaceId, 'OWNER');

  if (!access) {
    return notFound({ message: 'Workspace not found.' });
  }

  if (body.confirmation !== access.workspace.slug) {
    return forbidden({
      code: 'confirmation-required',
      message: 'Type the workspace slug to confirm deletion.',
    });
  }

  const now = new Date();

  await prisma.transaction(async tx => {
    await tx.website.updateMany({
      where: { workspaceId, deletedAt: null },
      data: { deletedAt: now },
    });

    await tx.workspaceInvitation.deleteMany({
      where: { workspaceId },
    });

    await tx.workspaceMembership.deleteMany({
      where: { workspaceId },
    });

    await tx.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: now },
      select: { id: true },
    });
  });

  await recordAuditEvent({
    auth,
    eventType: 'workspace.deleted',
    request,
    resourceId: workspaceId,
    resourceType: 'workspace',
    metadata: { slug: access.workspace.slug },
  });

  return ok();
}
