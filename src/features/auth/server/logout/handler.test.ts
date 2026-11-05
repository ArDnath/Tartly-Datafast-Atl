import { beforeEach, expect, test, vi } from 'vitest';
import { checkAuth } from '@/lib/auth';
import { revokeAuthSession } from '@/lib/auth-session';
import redis from '@/lib/redis';
import { POST } from './handler';

vi.mock('@/lib/auth', () => ({
  checkAuth: vi.fn(),
}));

vi.mock('@/lib/auth-session', () => ({
  revokeAuthSession: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: true,
    client: {
      del: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkAuth).mockResolvedValue(null);
});

test('revokes the cookie session and clears the cookie', async () => {
  const response = await POST(
    new Request('https://analytics.example.com/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: 'rl_session=session-token',
      },
    }),
  );

  expect(response.status).toBe(200);
  expect(revokeAuthSession).toHaveBeenCalledWith('session-token');
  expect(response.headers.get('set-cookie')).toContain('rl_session=;');
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
});

test('deletes a legacy Redis session key referenced by the bearer token', async () => {
  vi.mocked(checkAuth).mockResolvedValue({
    authKey: 'auth:session-key',
  } as any);

  const response = await POST(
    new Request('https://analytics.example.com/api/auth/logout', {
      method: 'POST',
      headers: {
        authorization: 'Bearer signed-auth-token',
      },
    }),
  );

  expect(response.status).toBe(200);
  expect(redis.client.del).toHaveBeenCalledWith('auth:session-key');
  expect(redis.client.del).not.toHaveBeenCalledWith('signed-auth-token');
});

test('logout is idempotent when there is no session', async () => {
  const response = await POST(
    new Request('https://analytics.example.com/api/auth/logout', { method: 'POST' }),
  );

  expect(response.status).toBe(200);
  expect(revokeAuthSession).not.toHaveBeenCalled();
  expect(redis.client.del).not.toHaveBeenCalled();
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
});
