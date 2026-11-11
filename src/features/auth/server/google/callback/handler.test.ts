import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createAuthResponse } from '@/lib/auth-user';
import { consumeRateLimit } from '@/lib/rate-limit';
import { findOrCreateGoogleUser, GoogleAccountError } from '../account';
import { createGoogleOAuthStateToken, GOOGLE_OAUTH_STATE_COOKIE } from '../config';
import { exchangeGoogleCode, GoogleOAuthError } from '../service';
import { GET } from './handler';

vi.mock('@/lib/auth-user', () => ({
  createAuthResponse: vi.fn(),
}));

vi.mock('@/lib/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit');

  return {
    ...actual,
    consumeRateLimit: vi.fn(),
  };
});

vi.mock('../account', async () => {
  const actual = await vi.importActual<typeof import('../account')>('../account');

  return {
    ...actual,
    findOrCreateGoogleUser: vi.fn(),
  };
});

vi.mock('../service', async () => {
  const actual = await vi.importActual<typeof import('../service')>('../service');

  return {
    ...actual,
    exchangeGoogleCode: vi.fn(),
  };
});

const profile = {
  subject: 'google-subject',
  email: 'founder@example.com',
  emailVerified: true as const,
  name: 'Ada Founder',
  picture: null,
};

function callbackRequest(state: string, query = `state=${encodeURIComponent(state)}&code=code`) {
  const token = createGoogleOAuthStateToken({ state, returnUrl: '/app/revenue' });

  return new Request(`https://tartly.test/api/auth/google/callback?${query}`, {
    headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(token)}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
  vi.stubEnv('APP_URL', 'https://tartly.test');

  vi.mocked(exchangeGoogleCode).mockResolvedValue(profile);
  vi.mocked(findOrCreateGoogleUser).mockResolvedValue({
    id: 'user-1',
    username: 'founder@example.com',
    role: 'user',
    emailVerifiedAt: new Date(),
  });
  vi.mocked(createAuthResponse).mockResolvedValue({
    user: {
      id: 'user-1',
      username: 'founder@example.com',
      role: 'user',
      isAdmin: false,
    },
    sessionCookie: 'rl_session=session-token; Path=/; HttpOnly',
    expiresAt: new Date(),
  });
  vi.mocked(consumeRateLimit).mockResolvedValue({
    allowed: true,
    limit: 30,
    remaining: 29,
    retryAfterSeconds: 0,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('creates a session and returns to the sealed app return URL', async () => {
  const response = await GET(callbackRequest('state-value'));
  const cookies = response.headers.get('set-cookie') || '';

  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe('https://tartly.test/app/revenue');
  expect(cookies).toContain('rl_session=session-token');
  expect(cookies).toContain(`${GOOGLE_OAUTH_STATE_COOKIE}=;`);
  expect(exchangeGoogleCode).toHaveBeenCalledWith({
    config: expect.objectContaining({ clientId: 'google-client-id' }),
    code: 'code',
  });
});

test('rejects a callback whose URL state does not match the signed cookie', async () => {
  const response = await GET(callbackRequest('state-value', 'state=other-state&code=code'));

  expect(response.headers.get('location')).toBe(
    'https://tartly.test/login?error=invalid-state&returnUrl=%2Fapp',
  );
  expect(exchangeGoogleCode).not.toHaveBeenCalled();
});

test('rejects an unverified Google email', async () => {
  vi.mocked(exchangeGoogleCode).mockRejectedValue(
    new GoogleOAuthError('email-not-verified', 'not verified'),
  );

  const response = await GET(callbackRequest('state-value'));

  expect(response.headers.get('location')).toBe(
    'https://tartly.test/login?error=email-not-verified&returnUrl=%2Fapp%2Frevenue',
  );
});

test('rejects a deleted or suspended account', async () => {
  vi.mocked(findOrCreateGoogleUser).mockRejectedValue(new GoogleAccountError());

  const response = await GET(callbackRequest('state-value'));

  expect(response.headers.get('location')).toBe(
    'https://tartly.test/login?error=account-unavailable&returnUrl=%2Fapp%2Frevenue',
  );
});

test('rate limits repeated callback attempts', async () => {
  vi.mocked(consumeRateLimit).mockResolvedValue({
    allowed: false,
    limit: 30,
    remaining: 0,
    retryAfterSeconds: 60,
  });

  const response = await GET(callbackRequest('state-value'));

  expect(response.headers.get('location')).toBe(
    'https://tartly.test/login?error=rate-limited&returnUrl=%2Fapp%2Frevenue',
  );
  expect(exchangeGoogleCode).not.toHaveBeenCalled();
});
