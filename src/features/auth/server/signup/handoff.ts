import { withWebsiteReturnUrl } from '@/features/auth/lib/auth-return-url';

const INTERNAL_ORIGIN = 'http://internal.local';

export interface StartHandoffInput {
  requestedReturnUrl?: string | null;
  website?: string | null;
  hasSession: boolean;
  onboardingRequired: boolean;
}

/**
 * Resolve the landing-page "get started" intent.
 *
 * The visitor may be signed in or signed out, and may arrive from the hero
 * (carrying a website) or from a pricing card (carrying a checkout path).
 * One rule set keeps the three entry points consistent:
 *
 * - signed out -> the login screen, with the full intent preserved;
 * - signed in, setup unfinished -> onboarding, with website and next intact;
 * - signed in, setup finished -> checkout or the app; a new website starts the
 *   add-website flow instead of replaying first-run onboarding.
 */
export function resolveStartDestination({
  requestedReturnUrl,
  website,
  hasSession,
  onboardingRequired,
}: StartHandoffInput) {
  const returnUrl = withWebsiteReturnUrl(requestedReturnUrl ?? '/onboarding', website);

  if (!hasSession) {
    return `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  const target = new URL(returnUrl, INTERNAL_ORIGIN);
  const isOnboardingPath = target.pathname === '/onboarding';

  if (onboardingRequired) {
    if (isOnboardingPath) {
      return `${target.pathname}${target.search}${target.hash}`;
    }

    return `/onboarding?next=${encodeURIComponent(returnUrl)}`;
  }

  if (!isOnboardingPath) {
    return returnUrl;
  }

  const carriedWebsite = target.searchParams.get('website');

  return carriedWebsite ? `/app/new?website=${encodeURIComponent(carriedWebsite)}` : '/app';
}
