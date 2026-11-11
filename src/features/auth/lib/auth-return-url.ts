const DEFAULT_RETURN_URL = '/app';
const INTERNAL_ORIGIN = 'http://internal.local';
const ALLOWED_RETURN_PATHS = ['/app', '/onboarding', '/checkout'];
const MAX_WEBSITE_LENGTH = 255;

function isAllowedReturnPath(pathname: string) {
  return ALLOWED_RETURN_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Accept only same-origin paths that belong to the app. Anything else falls
 * back to the dashboard so an auth link can never become an open redirect.
 */
export function sanitizeAuthReturnUrl(returnUrl?: string | null) {
  if (!returnUrl?.startsWith('/') || returnUrl.startsWith('//') || returnUrl.includes('\\')) {
    return DEFAULT_RETURN_URL;
  }

  let url: URL;

  try {
    url = new URL(returnUrl, INTERNAL_ORIGIN);
  } catch {
    return DEFAULT_RETURN_URL;
  }

  if (url.origin !== INTERNAL_ORIGIN || !isAllowedReturnPath(url.pathname)) {
    return DEFAULT_RETURN_URL;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function sanitizeWebsite(website?: string | null) {
  return website?.trim().slice(0, MAX_WEBSITE_LENGTH) ?? '';
}

/**
 * Carry the website entered on the landing page through Google sign-in so the
 * onboarding form opens with that domain already filled in.
 */
export function withWebsiteReturnUrl(
  returnUrl: string | null | undefined,
  website: string | null | undefined,
) {
  const safeReturnUrl = sanitizeAuthReturnUrl(returnUrl);
  const safeWebsite = sanitizeWebsite(website);

  if (!safeWebsite) {
    return safeReturnUrl;
  }

  const target = new URL(safeReturnUrl, INTERNAL_ORIGIN);

  if (target.pathname !== '/onboarding') {
    return safeReturnUrl;
  }

  target.searchParams.set('website', safeWebsite);

  return `${target.pathname}${target.search}${target.hash}`;
}
