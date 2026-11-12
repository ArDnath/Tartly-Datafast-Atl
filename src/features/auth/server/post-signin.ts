import { sanitizeAuthReturnUrl } from '@/features/auth/lib/auth-return-url';
import prisma from '@/lib/prisma';

/**
 * A user must finish onboarding when they have no live membership, or when the
 * only workspace they own has not completed the setup flow. Invited members
 * (`ADMIN`, `MEMBER`, `VIEWER`) are never sent back through it.
 */
export async function isOnboardingRequired(userId: string) {
  if (!userId) {
    return false;
  }

  const memberships = await prisma.client.workspaceMembership.findMany({
    where: {
      userId,
      workspace: { deletedAt: null, suspendedAt: null },
    },
    select: {
      role: true,
      workspace: {
        select: { onboardingCompletedAt: true },
      },
    },
  });

  if (memberships.length === 0) {
    return true;
  }

  return memberships.every(
    membership => membership.role === 'OWNER' && !membership.workspace.onboardingCompletedAt,
  );
}

export async function resolvePostSignInPath(userId: string, returnUrl?: string | null) {
  const safeReturnUrl = sanitizeAuthReturnUrl(returnUrl);

  // An explicit onboarding destination (including the landing-page handoff
  // that carries a website) is always honoured.
  if (safeReturnUrl.startsWith('/onboarding')) {
    return safeReturnUrl;
  }

  if (!(await isOnboardingRequired(userId))) {
    return safeReturnUrl;
  }

  // Keep an intent such as a pricing-card checkout or a deep link across the
  // first-run setup. Onboarding performs the same allowlist check before it
  // navigates, so this cannot become an open redirect.
  return safeReturnUrl === '/app'
    ? '/onboarding'
    : `/onboarding?next=${encodeURIComponent(safeReturnUrl)}`;
}
