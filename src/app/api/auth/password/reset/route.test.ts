import { beforeEach, expect, test, vi } from 'vitest';
import { revokeAllAuthSessions } from '@/lib/auth-session';
import { resetPasswordWithToken } from '@/lib/auth-tokens';
import { POST } from './route';

vi.mock('@/lib/auth-tokens', () => ({
  resetPasswordWithToken: vi.fn(),
}));

vi.mock('@/lib/auth-session', () => ({
  revokeAllAuthSessions: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: vi.fn(async () => ({
    allowed: true,
    limit: 10,
    remaining: 9,
    retryAfterSeconds: 0,
  })),
  hashRateLimitSubject: (value: string) => `hashed:${value}`,
  rateLimitKey: (...parts: string[]) => parts.join(':'),
}));

function request(token: string, password = 'new-password-1') {
  return new Request('https://app.example.com/api/auth/password/reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('resets the password, revokes every session, and clears the cookie', async () => {
  vi.mocked(resetPasswordWithToken).mockResolvedValue('user-1');

  const response = await POST(request('a'.repeat(32)));

  expect(response.status).toBe(200);
  expect(resetPasswordWithToken).toHaveBeenCalledWith('a'.repeat(32), expect.any(String));
  expect(revokeAllAuthSessions).toHaveBeenCalledWith('user-1');
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
});

test('rejects an invalid or expired token', async () => {
  vi.mocked(resetPasswordWithToken).mockResolvedValue(null);

  const response = await POST(request('b'.repeat(32)));
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('invalid-reset-token');
  expect(revokeAllAuthSessions).not.toHaveBeenCalled();
});
