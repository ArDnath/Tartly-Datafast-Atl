import { z } from 'zod';
import { normalizeWebsiteDomainInput } from '@/features/websites/lib/website-domain';
import { parseRequest } from '@/lib/request';
import { badRequest, json, serverError, unauthorized } from '@/lib/response';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/queries/prisma';
import {
  createOnboardingWebsite,
  ensureOnboardingWorkspace,
  OnboardingError,
} from '../queries/onboarding';

const schema = z.strictObject({
  domain: z.string().trim().min(1).max(500),
});

function onboardingErrorResponse(error: unknown) {
  if (error instanceof OnboardingError) {
    return Response.json(
      {
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      },
      { status: error.status },
    );
  }

  return serverError({ errorObject: error });
}

/**
 * Creates the invisible workspace and the first website in one call. The
 * onboarding UI never asks for a workspace name, so the workspace is derived
 * from the domain; the website is also used as the tracker target.
 */
export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return unauthorized();
  }

  const domain = normalizeWebsiteDomainInput(body.domain);

  if (!domain?.includes('.')) {
    return badRequest({
      message: 'Enter the domain you want to track, for example acme.com.',
    });
  }

  try {
    const { workspace, created } = await ensureOnboardingWorkspace(auth.user.id, domain);
    const access = await requireWorkspaceAccess(auth.user, workspace.id, 'ADMIN');

    if (!access) {
      return unauthorized({ message: 'You cannot add a website to this workspace.' });
    }

    if (created) {
      await recordAuditEvent({
        auth,
        eventType: 'workspace.created',
        metadata: {
          name: workspace.name,
          slug: workspace.slug,
          source: 'onboarding',
          hasLogo: false,
        },
        request,
        resourceId: workspace.id,
        resourceType: 'workspace',
      });
    }

    const website = await createOnboardingWebsite(workspace.id, auth.user.id, domain);

    return json({
      workspace: {
        ...workspace,
        role: access.role,
      },
      website,
    });
  } catch (cause) {
    return onboardingErrorResponse(cause);
  }
}
