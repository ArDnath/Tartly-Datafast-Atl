import { z } from 'zod';
import prisma from '@/lib/prisma';
import { revokeAllAuthSessions } from '@/lib/auth-session';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, notFound } from '@/lib/response';
import { recordAuditEvent } from '@/queries/prisma';

const schema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

type SuspensionTarget = 'user' | 'workspace';

interface SuspensionRow {
  id: string;
  suspendedAt: Date | null;
  suspensionReason: string | null;
}

async function readTarget(target: SuspensionTarget, id: string): Promise<SuspensionRow | null> {
  if (target === 'user') {
    return prisma.client.user.findUnique({
      where: { id },
      select: { id: true, suspendedAt: true, suspensionReason: true },
    });
  }

  return prisma.client.workspace.findUnique({
    where: { id },
    select: { id: true, suspendedAt: true, suspensionReason: true },
  });
}

async function updateTarget(
  target: SuspensionTarget,
  id: string,
  data: { suspendedAt: Date | null; suspensionReason: string | null },
) {
  if (target === 'user') {
    await prisma.client.user.update({ where: { id }, data, select: { id: true } });
    return;
  }

  await prisma.client.workspace.update({ where: { id }, data, select: { id: true } });
}

export function createSuspensionHandler(target: SuspensionTarget) {
  return {
    async GET(request: Request, { params }: { params: Promise<Record<string, string>> }) {
      const { auth, error } = await parseRequest(request);

      if (error) {
        return error();
      }

      if (!auth.user?.isPlatformAdmin) {
        return forbidden();
      }

      const resolved = await params;
      const id = resolved[`${target}Id`];

      if (!id) {
        return badRequest();
      }

      const row = await readTarget(target, id);

      if (!row) {
        return notFound();
      }

      return json({
        id: row.id,
        suspendedAt: row.suspendedAt,
        suspensionReason: row.suspensionReason,
      });
    },

    async POST(request: Request, { params }: { params: Promise<Record<string, string>> }) {
      const { auth, body, error } = await parseRequest(request, schema);

      if (error) {
        return error();
      }

      if (!auth.user?.isPlatformAdmin) {
        return forbidden();
      }

      const resolved = await params;
      const id = resolved[`${target}Id`];

      if (!id) {
        return badRequest();
      }

      const existing = await readTarget(target, id);

      if (!existing) {
        return notFound();
      }

      const suspendedAt = body.suspended ? new Date() : null;

      await updateTarget(target, id, {
        suspendedAt,
        suspensionReason: body.suspended ? (body.reason ?? null) : null,
      });

      if (target === 'user' && body.suspended) {
        await revokeAllAuthSessions(id);
      }

      await recordAuditEvent({
        auth,
        eventType: `${target}.${body.suspended ? 'suspended' : 'unsuspended'}`,
        metadata: { reason: body.reason ?? null },
        request,
        resourceId: id,
        resourceType: target,
      });

      return json({
        id,
        suspendedAt,
        suspensionReason: body.suspended ? (body.reason ?? null) : null,
      });
    },
  };
}
