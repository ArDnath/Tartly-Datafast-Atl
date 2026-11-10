import { NextResponse } from 'next/server';
import { withWebsiteReturnUrl } from '@/features/auth/lib/auth-return-url';
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  createGoogleOAuthStateToken,
  getGoogleOAuthConfig,
  serializeGoogleOAuthStateCookie,
} from '../config';
import { redirectToLogin } from '../redirect';

/**
 * Start the Google OAuth redirect flow. The return URL is sealed inside the
 * signed state cookie, so the callback never trusts a query-string redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnUrl = withWebsiteReturnUrl(
    url.searchParams.get('returnUrl'),
    url.searchParams.get('website'),
  );
  const config = getGoogleOAuthConfig(request);

  if (!config) {
    return redirectToLogin(request, 'google-unavailable', [], returnUrl);
  }

  const state = createGoogleOAuthState();
  const stateCookie = serializeGoogleOAuthStateCookie(
    createGoogleOAuthStateToken({ state, returnUrl }),
  );
  const response = NextResponse.redirect(buildGoogleAuthorizationUrl(config, state));

  response.headers.set('Cache-Control', 'no-store');
  response.headers.append('Set-Cookie', stateCookie);

  return response;
}
