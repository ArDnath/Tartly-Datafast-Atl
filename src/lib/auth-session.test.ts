import { beforeEach, expect, test, vi } from 'vitest';
import { hashSessionToken } from './auth-session';

const authSession = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      authSession,
    },
  },
}));

const {
  createAuthSession,
  resolveAuthSession,
  revokeAuthSession,
  revokeAllAuthSessions,
  SESSION_TTL_SECONDS,
} = await import('./auth-session');

beforeEach(() => {
  vi.clearAllMocks();
  authSession.create.mockResolvedValue({});
  authSession.update.mockResolvedValue({});
  authSession.updateMany.mockResolvedValue({ count: 1 });
});

test('stores only a hash of the session token', async () => {
  const session = await createAuthSession('00000000-0000-4000-8000-000000000001', {
    ip: '203.0.113.9',
    userAgent: 'vitest',
  });

  const stored = authSession.create.mock.calls[0][0].data;

  expect(session.token).toHaveLength(43);
  expect(stored.tokenHash).toBe(hashSessionToken(session.token));
  expect(stored.tokenHash).not.toContain(session.token);
  expect(stored.expiresAt.getTime()).toBeGreaterThan(
    Date.now() + (SESSION_TTL_SECONDS - 60) * 1000,
  );
  expect(stored.userAgent).toBe('vitest');
});

test('does not store the raw IP address', async () => {
  await createAuthSession('user-1', { ip: '203.0.113.9' });

  expect(authSession.create.mock.calls[0][0].data.ipHash).not.toBe('203.0.113.9');
});

test('rejects expired sessions', async () => {
  authSession.findUnique.mockResolvedValue({
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() - 1000),
    revokedAt: null,
    lastUsedAt: new Date(),
  });

  await expect(resolveAuthSession('token')).resolves.toBeNull();
});

test('rejects revoked sessions', async () => {
  authSession.findUnique.mockResolvedValue({
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: new Date(),
    lastUsedAt: new Date(),
  });

  await expect(resolveAuthSession('token')).resolves.toBeNull();
});

test('resolves a live session without rewriting lastUsedAt on every request', async () => {
  authSession.findUnique.mockResolvedValue({
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    lastUsedAt: new Date(),
  });

  await expect(resolveAuthSession('token')).resolves.toEqual({
    id: 'session-1',
    userId: 'user-1',
  });
  expect(authSession.update).not.toHaveBeenCalled();
});

test('revokes by token hash, never by the raw token', async () => {
  await revokeAuthSession('raw-token');

  expect(authSession.updateMany).toHaveBeenCalledWith({
    where: { tokenHash: hashSessionToken('raw-token'), revokedAt: null },
    data: { revokedAt: expect.any(Date) },
  });
});

test('password changes revoke every other session', async () => {
  await revokeAllAuthSessions('user-1', 'current-token');

  expect(authSession.updateMany).toHaveBeenCalledWith({
    where: {
      userId: 'user-1',
      revokedAt: null,
      tokenHash: { not: hashSessionToken('current-token') },
    },
    data: { revokedAt: expect.any(Date) },
  });
});
