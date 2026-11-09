import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  buildGoogleAuthorizationUrl,
  clearGoogleOAuthStateCookie,
  createGoogleOAuthState,
  createGoogleOAuthStateToken,
  getGoogleOAuthConfig,
  readGoogleOAuthStateToken,
  secureCompare,
  serializeGoogleOAuthStateCookie,
} from './config';

const request = new Request('https://tartly.test/api/auth/google');

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
  vi.stubEnv('GOOGLE_REDIRECT_URI', '');
  vi.stubEnv('APP_URL', 'https://tartly.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('derives the redirect URI from APP_URL and builds the Google consent URL', () => {
  const config = getGoogleOAuthConfig(request);
  expect(config).toEqual({
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    redirectUri: 'https://tartly.test/api/auth/google/callback',
  });

  if (!config) {
    throw new Error('Expected Google OAuth config');
  }

  const url = new URL(buildGoogleAuthorizationUrl(config, 'state-value'));

  expect(url.origin).toBe('https://accounts.google.com');
  expect(url.searchParams.get('client_id')).toBe('google-client-id');
  expect(url.searchParams.get('redirect_uri')).toBe('https://tartly.test/api/auth/google/callback');
  expect(url.searchParams.get('response_type')).toBe('code');
  expect(url.searchParams.get('scope')).toBe('openid email profile');
  expect(url.searchParams.get('state')).toBe('state-value');
  expect(url.searchParams.get('prompt')).toBe('select_account');
});

test('returns null instead of throwing when credentials are missing', () => {
  vi.stubEnv('GOOGLE_CLIENT_ID', '');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '');

  expect(getGoogleOAuthConfig(request)).toBeNull();
});

test('round-trips the signed state and only keeps app return URLs', () => {
  const state = createGoogleOAuthState();
  const token = createGoogleOAuthStateToken({
    state,
    returnUrl: 'https://evil.example/steal',
  });

  expect(readGoogleOAuthStateToken(token)).toEqual({ state, returnUrl: '/app' });
});

test('rejects a tampered state token', () => {
  const token = createGoogleOAuthStateToken({ state: 'state-value', returnUrl: '/app' });
  const tampered = `${token.slice(0, -2)}aa`;

  expect(readGoogleOAuthStateToken(tampered)).toBeNull();
});

test('compares state values in constant time', () => {
  expect(secureCompare('abc', 'abc')).toBe(true);
  expect(secureCompare('abc', 'abd')).toBe(false);
  expect(secureCompare('abc', 'ab')).toBe(false);
});

test('serializes an HttpOnly state cookie scoped to the callback path', () => {
  const cookie = serializeGoogleOAuthStateCookie('signed-value');

  expect(cookie).toContain('rl_google_oauth=signed-value');
  expect(cookie).toContain('Path=/api/auth/google');
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).toContain('Max-Age=600');
  expect(clearGoogleOAuthStateCookie()).toContain('Max-Age=0');
});
