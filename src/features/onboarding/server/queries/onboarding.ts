import { getWebsiteNameFromDomain } from '@/features/websites/lib/website-domain';
import { uuid } from '@/lib/crypto';
import { getWebsiteLimit, getWorkspaceEntitlements } from '@/lib/entitlements';
import prisma from '@/lib/prisma';
import { createWorkspaceForUser, slugifyWorkspaceName } from '@/lib/workspace-auth';
import { countWorkspaceWebsites, createWebsite } from '@/queries/prisma';

export class OnboardingError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}

export interface OnboardingWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  planId: string | null;
  subscriptionStatus: string;
  onboardingCompletedAt: Date | null;
}

export interface OnboardingWebsite {
  id: string;
  name: string;
  domain: string | null;
  workspaceId: string | null;
}

const WORKSPACE_SELECT = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  planId: true,
  subscriptionStatus: true,
  onboardingCompletedAt: true,
} as const;

/** The first workspace the user owns, including one left mid-onboarding. */
export async function findOwnedWorkspace(userId: string): Promise<OnboardingWorkspace | null> {
  return prisma.client.workspace.findFirst({
    where: {
      ownerId: userId,
      deletedAt: null,
      suspendedAt: null,
    },
    orderBy: { createdAt: 'asc' },
    select: WORKSPACE_SELECT,
  });
}

/**
 * Derive a quiet, human workspace name from the website the customer typed.
 * The workspace is never shown as a setup step, so this only has to be sane in
 * settings and invitations.
 */
export function getWorkspaceNameFromDomain(domain: string) {
  const labels = domain.split('.');
  const label = (labels[0] === 'www' ? labels[1] : labels[0])?.replace(/[^a-z0-9-]/gi, '') || '';

  if (!label) {
    return 'My workspace';
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getOnboardingWorkspaceSlug(name: string, userId: string) {
  const base = slugifyWorkspaceName(name).slice(0, 70) || 'workspace';

  return `${base}-${userId.replace(/-/g, '').slice(0, 10)}`;
}

/**
 * Resolve the workspace behind the first onboarding step. A brand-new customer
 * gets one created without ever seeing a workspace form; a customer returning
 * to an abandoned flow reuses the workspace that is still incomplete.
 */
export async function ensureOnboardingWorkspace(
  userId: string,
  domain: string,
): Promise<{ workspace: OnboardingWorkspace; created: boolean }> {
  const owned = await findOwnedWorkspace(userId);

  if (owned) {
    if (owned.onboardingCompletedAt) {
      throw new OnboardingError(
        'already-onboarded',
        'Your workspace is already set up. Open the dashboard to continue.',
        409,
      );
    }

    return { workspace: owned, created: false };
  }

  const name = getWorkspaceNameFromDomain(domain);
  const slug = getOnboardingWorkspaceSlug(name, userId);

  try {
    const workspace = await createWorkspaceForUser({ userId, name, slug });

    return { workspace, created: true };
  } catch (error) {
    // A double submit can race the deterministic slug. The unique constraint
    // means the workspace exists, so return the row that won instead of
    // creating a second workspace or failing the request.
    if (isUniqueConstraintError(error)) {
      const existing = await findOwnedWorkspace(userId);

      if (existing) {
        return { workspace: existing, created: false };
      }
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

export async function findOnboardingWebsite(
  workspaceId: string,
  domain: string,
): Promise<OnboardingWebsite | null> {
  return prisma.client.website.findFirst({
    where: {
      workspaceId,
      domain,
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      domain: true,
      workspaceId: true,
    },
  });
}

export async function createOnboardingWebsite(
  workspaceId: string,
  userId: string,
  domain: string,
): Promise<OnboardingWebsite> {
  const existing = await findOnboardingWebsite(workspaceId, domain);

  if (existing) {
    return existing;
  }

  const entitlements = await getWorkspaceEntitlements(workspaceId);

  if (!entitlements?.plan) {
    throw new OnboardingError(
      'plan-required',
      'This workspace is not available. Refresh the page or contact support.',
    );
  }

  const limit = getWebsiteLimit(entitlements);

  if ((await countWorkspaceWebsites(workspaceId)) >= limit) {
    throw new OnboardingError(
      'website-limit-reached',
      `Your ${entitlements.plan.name} plan includes ${limit} website${limit === 1 ? '' : 's'}.`,
    );
  }

  return createWebsite({
    id: uuid(),
    createdBy: userId,
    name: getWebsiteNameFromDomain(domain),
    domain,
    userId,
    workspaceId,
  });
}

export async function markOnboardingComplete(workspaceId: string) {
  return prisma.client.workspace.update({
    where: { id: workspaceId },
    data: { onboardingCompletedAt: new Date() },
    select: { id: true, onboardingCompletedAt: true },
  });
}
