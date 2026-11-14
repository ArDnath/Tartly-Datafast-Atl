import { sanitizeAuthReturnUrl } from './auth-return-url';

const INTERNAL_ORIGIN = 'http://internal.local';

/**
 * Client-side counterpart of `resolvePostSignInPath`.
 *
 * The login screen already knows whether onboarding is required from
 * `/api/auth/verify`, so it can preserve a checkout or deep-link intent
 * without a second round trip. The server remains authoritative: it repeats
 * this decision after OAuth before issuing the session redirect.
 */
export function resolveClientPostSignInPath(
  requestedReturnUrl: string | null | undefined,
  onboardingRequired: boolean,
) {
  const returnUrl = sanitizeAuthReturnUrl(requestedReturnUrl);

  if (onboardingRequired) {
    if (returnUrl === '/app' || returnUrl === '/app/') {
      return '/onboarding';
    }

    if (returnUrl.startsWith('/onboarding')) {
      return returnUrl;
    }

    return `/onboarding?next=${encodeURIComponent(returnUrl)}`;
  }

  if (!returnUrl.startsWith('/onboarding')) {
    return returnUrl;
  }

  const target = new URL(returnUrl, INTERNAL_ORIGIN);
  const website = target.searchParams.get('website');

  return website ? `/app/new?website=${encodeURIComponent(website)}` : '/app';
}
