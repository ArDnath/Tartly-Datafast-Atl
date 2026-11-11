import { NextResponse } from 'next/server';
import { sanitizeAuthReturnUrl } from '@/features/auth/lib/auth-return-url';
import { getPublicOrigin } from '@/lib/get-base-url';

export type GoogleLoginError =
  | 'google-unavailable'
  | 'access-denied'
  | 'invalid-state'
  | 'rate-limited'
  | 'google-failed'
  | 'account-unavailable'
  | 'email-not-verified';

function withNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');

  return response;
}

function appendCookies(response: NextResponse, cookies: string[]) {
  for (const cookie of cookies) {
    response.headers.append('Set-Cookie', cookie);
  }

  return response;
}

export function redirectToLogin(
  request: Request,
  error: GoogleLoginError,
  cookies: string[] = [],
  returnUrl?: string,
) {
  const url = new URL('/login', getPublicOrigin(request));
  url.searchParams.set('error', error);
  url.searchParams.set('returnUrl', sanitizeAuthReturnUrl(returnUrl));

  return withNoStore(appendCookies(NextResponse.redirect(url), cookies));
}

export function redirectAfterSignIn(
  request: Request,
  returnUrl: string | undefined,
  cookies: string[],
) {
  const url = new URL(sanitizeAuthReturnUrl(returnUrl), getPublicOrigin(request));

  return withNoStore(appendCookies(NextResponse.redirect(url), cookies));
}
