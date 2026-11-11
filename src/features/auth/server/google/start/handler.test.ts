import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GOOGLE_OAUTH_STATE_COOKIE } from '../config';
import { GET } from './handler';

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
  vi.stubEnv('GOOGLE_REDIRECT_URI', '');
  vi.stubEnv('APP_URL', 'https://tartly.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('redirects to Google with the callback and a signed state cookie', async () => {
  const response = await GET(
    new Request('https://tartly.test/api/auth/google?returnUrl=%2Fapp%2Frevenue'),
  );
  const location = response.headers.get('location');

  expect(response.status).toBe(307);
  expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
  expect(location).toContain('client_id=google-client-id');
  expect(location).toContain(
    'redirect_uri=https%3A%2F%2Ftartly.test%2Fapi%2Fauth%2Fgoogle%2Fcallback',
  );
  expect(location).toContain('state=');
  expect(response.headers.get('set-cookie')).toContain(`${GOOGLE_OAUTH_STATE_COOKIE}=`);
  expect(response.headers.get('cache-control')).toBe('no-store');
});

test('returns to login with a readable error when credentials are missing', async () => {
  vi.stubEnv('GOOGLE_CLIENT_ID', '');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '');

  const response = await GET(new Request('https://tartly.test/api/auth/google'));

  expect(response.headers.get('location')).toBe(
    'https://tartly.test/login?error=google-unavailable&returnUrl=%2Fapp',
  );
});
