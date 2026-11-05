import { z } from 'zod';
import { clearSessionCookie } from '@/lib/auth-cookie';
import { revokeAllAuthSessions } from '@/lib/auth-session';
import { hash, uuid } from '@/lib/crypto';
import { checkPassword, hashPassword } from '@/lib/password';
import { parseRequest } from '@/lib/request';
import { badRequest, ok } from '@/lib/response';
import prisma from '@/lib/prisma';
import { getUser, recordAuditEvent } from '@/queries/prisma';

const schema = z.object({
  password: z.string().min(1).max(72),
  confirmation: z.literal('DELETE'),
});

/**
 * Soft-delete the account and every workspace the user owns.
 *
 * Analytics payload rows are intentionally not hard-deleted here: a bulk
 * delete of event/replay rows is a long-running, destructive operation that
 * belongs in the retention worker with a dry-run and an audit trail. Soft
 * deletion removes every path to the data immediately; the purge job is
 * tracked in Phase 7/10 of docs/PHASES.md.
 */
export async function DELETE(request: Request) {
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const user = await getUser(auth.user.id, { includePassword: true });

  if (!user?.password || !checkPassword(body.password, user.password)) {
    return badRequest({
      code: 'invalid-current-password',
      message: 'Password is incorrect.',
    });
  }

  const now = new Date();

  await prisma.transaction(async tx => {
    await tx.workspace.updateMany({
      where: { ownerId: user.id, deletedAt: null },
      data: { deletedAt: now },
    });

    await tx.workspaceMembership.deleteMany({
      where: { userId: user.id },
    });

    await tx.workspaceInvitation.deleteMany({
      where: { invitedBy: user.id },
    });

    // Release the email address for a future signup while keeping an
    // auditable, non-identifying tombstone row.
    await tx.user.update({
      where: { id: user.id },
      data: {
        username: `deleted-${hash(user.id, uuid()).slice(0, 24)}@invalid.local`,
        password: hashPassword(uuid()),
        role: 'user',
        deletedAt: now,
      },
      select: { id: true },
    });
  });

  await revokeAllAuthSessions(user.id);

  await recordAuditEvent({
    auth,
    eventType: 'account.deleted',
    request,
    resourceId: user.id,
    resourceType: 'user',
  });

  const response = ok();
  response.headers.set('Set-Cookie', clearSessionCookie());

  return response;
}
