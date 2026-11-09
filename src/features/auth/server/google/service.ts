import { z } from 'zod';
import type { GoogleOAuthConfig } from './config';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const REQUEST_TIMEOUT_MS = 10_000;

export type GoogleOAuthErrorCode =
  | 'token-exchange-failed'
  | 'invalid-profile'
  | 'email-not-verified';

export class GoogleOAuthError extends Error {
  code: GoogleOAuthErrorCode;

  constructor(code: GoogleOAuthErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface GoogleProfile {
  subject: string;
  email: string;
  emailVerified: true;
  name: string | null;
  picture: string | null;
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * Exchange the authorization code and read the verified OpenID profile.
 *
 * The userinfo endpoint is called with the access token Google just issued
 * over TLS. This avoids trusting an unverified ID-token payload; `email` and
 * `email_verified` come from Google's authenticated userinfo response.
 */
export async function exchangeGoogleCode({
  config,
  code,
  fetchImpl = fetch,
}: {
  config: GoogleOAuthConfig;
  code: string;
  fetchImpl?: FetchLike;
}): Promise<GoogleProfile> {
  const tokenResponse = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!tokenResponse.ok) {
    throw new GoogleOAuthError('token-exchange-failed', 'Google rejected the authorization code.');
  }

  const token = (await tokenResponse.json().catch(() => null)) as {
    access_token?: unknown;
  } | null;
  const accessToken = typeof token?.access_token === 'string' ? token.access_token : '';

  if (!accessToken) {
    throw new GoogleOAuthError('token-exchange-failed', 'Google returned no access token.');
  }

  const profileResponse = await fetchImpl(GOOGLE_USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!profileResponse.ok) {
    throw new GoogleOAuthError('invalid-profile', 'Google did not return a profile.');
  }

  const profile = (await profileResponse.json().catch(() => null)) as {
    sub?: unknown;
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
    picture?: unknown;
  } | null;

  const subject = typeof profile?.sub === 'string' ? profile.sub.trim() : '';
  const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : '';

  if (!subject || subject.length > 255 || !z.email().safeParse(email).success) {
    throw new GoogleOAuthError('invalid-profile', 'Google returned an incomplete profile.');
  }

  if (profile?.email_verified !== true) {
    throw new GoogleOAuthError('email-not-verified', 'Google has not verified this email address.');
  }

  return {
    subject,
    email,
    emailVerified: true,
    name:
      typeof profile?.name === 'string' && profile.name.trim()
        ? profile.name.trim().slice(0, 255)
        : null,
    picture: typeof profile?.picture === 'string' ? profile.picture.slice(0, 2183) : null,
  };
}
