import { createAuthResponse } from '@/lib/auth-user';
import { getCookieFromRequest } from '@/lib/auth-cookie';
import { getIpAddress } from '@/lib/ip';
import { logger } from '@/lib/logger';
import { consumeRateLimit, hashRateLimitSubject, rateLimitKey } from '@/lib/rate-limit';
import { findOrCreateGoogleUser, GoogleAccountError } from '../account';
import {
  clearGoogleOAuthStateCookie,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE,
  readGoogleOAuthStateToken,
  secureCompare,
} from '../config';
import { redirectAfterSignIn, redirectToLogin } from '../redirect';
import { exchangeGoogleCode, GoogleOAuthError } from '../service';
import { resolvePostSignInPath } from '../../post-signin';

const CALLBACK_IP_LIMIT = { limit: 30, windowSeconds: 15 * 60 };

function fail(
  request: Request,
  error: Parameters<typeof redirectToLogin>[1],
  cause?: unknown,
  returnUrl?: string,
) {
  if (cause) {
    logger.warn('auth.google_sign_in_failed', {
      code: error,
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }

  return redirectToLogin(request, error, [clearGoogleOAuthStateCookie()], returnUrl);
}

/**
 * Google OAuth callback.
 *
 * The signed state cookie and the URL state must match before Google's error
 * or code parameters are trusted. The session is created only after Google
 * returns a verified email address.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnedState = url.searchParams.get('state');
  const stateCookie = getCookieFromRequest(request, GOOGLE_OAUTH_STATE_COOKIE);
  const state = stateCookie ? readGoogleOAuthStateToken(stateCookie) : null;

  if (!state || !returnedState || !secureCompare(state.state, returnedState)) {
    return fail(request, 'invalid-state');
  }

  if (url.searchParams.get('error')) {
    return fail(request, 'access-denied', undefined, state.returnUrl);
  }

  const config = getGoogleOAuthConfig(request);

  if (!config) {
    return fail(request, 'google-unavailable', undefined, state.returnUrl);
  }

  const code = url.searchParams.get('code');

  if (!code) {
    return fail(request, 'google-failed', undefined, state.returnUrl);
  }

  const ip = getIpAddress(request.headers) || 'unknown';
  const limit = await consumeRateLimit({
    key: rateLimitKey('oauth:google:ip', hashRateLimitSubject(ip)),
    ...CALLBACK_IP_LIMIT,
  });

  if (!limit.allowed) {
    return fail(request, 'rate-limited', undefined, state.returnUrl);
  }

  try {
    const profile = await exchangeGoogleCode({ config, code });
    const user = await findOrCreateGoogleUser(profile);
    const auth = await createAuthResponse(user, request);

    logger.info('auth.google_sign_in', { userId: user.id });

    // New accounts have no workspace yet. Send them to onboarding instead of
    // the old auto-created-workspace dashboard.
    const destination = await resolvePostSignInPath(user.id, state.returnUrl);

    return redirectAfterSignIn(request, destination, [
      auth.sessionCookie,
      clearGoogleOAuthStateCookie(),
    ]);
  } catch (cause) {
    if (cause instanceof GoogleOAuthError) {
      return fail(
        request,
        cause.code === 'email-not-verified' ? 'email-not-verified' : 'google-failed',
        cause,
        state.returnUrl,
      );
    }

    if (cause instanceof GoogleAccountError) {
      return fail(request, 'account-unavailable', cause, state.returnUrl);
    }

    return fail(request, 'google-failed', cause, state.returnUrl);
  }
}
