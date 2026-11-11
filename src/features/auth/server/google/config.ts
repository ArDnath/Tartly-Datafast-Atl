import crypto from 'node:crypto';
import { shouldUseSecureCookie } from '@/lib/auth-cookie';
import { secret } from '@/lib/crypto';
import { getPublicOrigin } from '@/lib/get-base-url';
import { createSecureToken, parseSecureToken } from '@/lib/jwt';
import { sanitizeAuthReturnUrl } from '@/features/auth/lib/auth-return-url';

export const GOOGLE_OAUTH_STATE_COOKIE = 'rl_google_oauth';
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_SCOPE = 'openid email profile';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleOAuthState {
  state: string;
  returnUrl: string;
}

type RequestLike = { headers: Headers; url: string };

/**
 * Read Google OAuth credentials from the environment. Returning null keeps a
 * missing credential a configuration error on the login page instead of a
 * 500 that leaks infrastructure details.
 */
export function getGoogleOAuthConfig(request: RequestLike): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${getPublicOrigin(request)}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function createGoogleOAuthState() {
  return crypto.randomBytes(32).toString('base64url');
}

export function buildGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    state,
    prompt: 'select_account',
    include_granted_scopes: 'true',
  });

  return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

/**
 * The state value travels in the URL; the signed, encrypted companion travels
 * in an HttpOnly cookie. A callback is valid only when both match, which
 * blocks login-CSRF without adding a server-side state store.
 */
export function createGoogleOAuthStateToken({ state, returnUrl }: GoogleOAuthState) {
  return createSecureToken(
    {
      purpose: 'google-oauth',
      state,
      returnUrl: sanitizeAuthReturnUrl(returnUrl),
    },
    secret(),
    { expiresIn: GOOGLE_OAUTH_STATE_TTL_SECONDS },
  );
}

export function readGoogleOAuthStateToken(token: string): GoogleOAuthState | null {
  const payload = parseSecureToken(token, secret()) as Record<string, unknown> | null;

  if (
    !payload ||
    payload.purpose !== 'google-oauth' ||
    typeof payload.state !== 'string' ||
    !payload.state
  ) {
    return null;
  }

  return {
    state: payload.state,
    returnUrl: sanitizeAuthReturnUrl(
      typeof payload.returnUrl === 'string' ? payload.returnUrl : undefined,
    ),
  };
}

export function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function serializeGoogleOAuthStateCookie(value: string) {
  return [
    `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/api/auth/google',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${GOOGLE_OAUTH_STATE_TTL_SECONDS}`,
    ...(shouldUseSecureCookie() ? ['Secure'] : []),
  ].join('; ');
}

export function clearGoogleOAuthStateCookie() {
  return [
    `${GOOGLE_OAUTH_STATE_COOKIE}=`,
    'Path=/api/auth/google',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(shouldUseSecureCookie() ? ['Secure'] : []),
  ].join('; ');
}
