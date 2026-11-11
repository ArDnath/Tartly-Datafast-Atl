import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { GoogleOAuthConfig } from './config';
import { exchangeGoogleCode } from './service';

const config: GoogleOAuthConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'https://tartly.test/api/auth/google/callback',
};

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('exchanges the code and returns the verified Google profile', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token' }))
    .mockResolvedValueOnce(
      jsonResponse({
        sub: 'google-subject',
        email: '  Founder@Example.com ',
        email_verified: true,
        name: '  Ada Founder  ',
        picture: 'https://example.com/avatar.png',
      }),
    );

  const profile = await exchangeGoogleCode({ config, code: 'authorization-code' });

  expect(profile).toEqual({
    subject: 'google-subject',
    email: 'founder@example.com',
    emailVerified: true,
    name: 'Ada Founder',
    picture: 'https://example.com/avatar.png',
  });

  const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
  expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
  expect(tokenInit.method).toBe('POST');
  expect(String(tokenInit.body)).toContain('code=authorization-code');
  expect(String(tokenInit.body)).toContain('redirect_uri=https%3A%2F%2Ftartly.test');

  const [userInfoUrl, userInfoInit] = fetchMock.mock.calls[1];
  expect(userInfoUrl).toBe('https://openidconnect.googleapis.com/v1/userinfo');
  expect(userInfoInit.headers).toEqual({ authorization: 'Bearer access-token' });
});

test('rejects a token endpoint failure', async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid_grant' }, 400));

  await expect(exchangeGoogleCode({ config, code: 'expired-code' })).rejects.toMatchObject({
    code: 'token-exchange-failed',
  });
});

test('rejects a token response without an access token', async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse({ token_type: 'Bearer' }));

  await expect(exchangeGoogleCode({ config, code: 'authorization-code' })).rejects.toMatchObject({
    code: 'token-exchange-failed',
  });
});

test('rejects an unverified or incomplete profile', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token' }))
    .mockResolvedValueOnce(
      jsonResponse({ sub: 'google-subject', email: 'founder@example.com', email_verified: false }),
    );

  await expect(exchangeGoogleCode({ config, code: 'authorization-code' })).rejects.toMatchObject({
    code: 'email-not-verified',
  });

  fetchMock.mockReset();
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token' }))
    .mockResolvedValueOnce(jsonResponse({ email: 'not-an-email', email_verified: true }));

  await expect(exchangeGoogleCode({ config, code: 'authorization-code' })).rejects.toMatchObject({
    code: 'invalid-profile',
  });
});

test('rejects a failed userinfo request', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token' }))
    .mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401));

  await expect(exchangeGoogleCode({ config, code: 'authorization-code' })).rejects.toMatchObject({
    code: 'invalid-profile',
  });
});
