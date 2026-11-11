import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, notFound, serverError, unauthorized } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/queries/prisma';
import { markOnboardingComplete } from '../queries/onboarding';

const schema = z.strictObject({
  workspaceId: z.uuid(),
});

/**
 * Marks the setup flow finished for the owner. The welcome overlay is a
 * one-shot UI handoff; this record is what stops the customer being sent back
 * into onboarding on the next sign-in.
 */
export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return unauthorized();
  }

  const access = await requireWorkspaceAccess(auth.user, body.workspaceId, 'OWNER');

  if (!access) {
    return notFound({ message: 'Workspace not found.' });
  }

  try {
    const workspace = await markOnboardingComplete(body.workspaceId);

    await recordAuditEvent({
      auth,
      eventType: 'workspace.onboarding_completed',
      metadata: { source: 'onboarding' },
      request,
      resourceId: body.workspaceId,
      resourceType: 'workspace',
    });

    return json({
      workspaceId: workspace.id,
      onboardingCompletedAt: workspace.onboardingCompletedAt,
    });
  } catch (cause) {
    return serverError({ errorObject: cause });
  }
}
