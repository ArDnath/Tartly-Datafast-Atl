import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import {
  clearSessionCookie,
  getSessionTokenFromRequest,
  serializeSessionCookie,
  SESSION_COOKIE,
} from '@/lib/auth-cookie';

function requestWithCookie(value: string) {
  return new Request('https://app.example.com/api/me', {
    headers: { cookie: value },
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('reads the session token from a cookie header', () => {
  expect(
    getSessionTokenFromRequest(requestWithCookie(`theme=dark; ${SESSION_COOKIE}=abc123; other=1`)),
  ).toBe('abc123');
});

test('returns undefined when the cookie is absent', () => {
  expect(getSessionTokenFromRequest(requestWithCookie('theme=dark'))).toBeUndefined();
});

test('serializes an HttpOnly, SameSite=Lax cookie with a bounded lifetime', () => {
  const cookie = serializeSessionCookie('token', new Date(Date.now() + 60_000));

  expect(cookie).toContain(`${SESSION_COOKIE}=token`);
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).toContain('Path=/');
  expect(cookie).toContain('Max-Age=60');
  expect(cookie).not.toContain('Secure');
});

test('adds Secure in production', () => {
  vi.stubEnv('NODE_ENV', 'production');

  expect(serializeSessionCookie('token', new Date(Date.now() + 60_000))).toContain('Secure');
});

test('clearing the cookie expires it immediately', () => {
  const cookie = clearSessionCookie();

  expect(cookie).toContain(`${SESSION_COOKIE}=`);
  expect(cookie).toContain('Max-Age=0');
  expect(cookie).toContain('HttpOnly');
});
