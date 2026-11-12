const INTERNAL_ORIGIN = 'http://internal.local';
const ALLOWED_PREFIXES = ['/app', '/checkout'];

/**
 * Onboarding may hand control to a checkout or a deep app route after setup.
 * Accept only internal paths under those two prefixes; everything else falls
 * back to the normal post-onboarding dashboard.
 */
export function sanitizeOnboardingNextPath(value?: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return null;
  }

  if (url.origin !== INTERNAL_ORIGIN) {
    return null;
  }

  const allowed = ALLOWED_PREFIXES.some(
    prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );

  return allowed ? `${url.pathname}${url.search}${url.hash}` : null;
}
