import { beforeEach, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  tx: {
    emailVerificationToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    passwordResetToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(state.tx)),
  },
}));

const {
  consumeEmailVerificationToken,
  hashOpaqueToken,
  issueEmailVerificationToken,
  issuePasswordResetToken,
  resetPasswordWithToken,
} = await import('./auth-tokens');

beforeEach(() => {
  vi.clearAllMocks();
  state.tx.emailVerificationToken.updateMany.mockResolvedValue({ count: 0 });
  state.tx.emailVerificationToken.create.mockResolvedValue({});
  state.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
  state.tx.passwordResetToken.create.mockResolvedValue({});
  state.tx.user.update.mockResolvedValue({ id: 'user-1' });
});

test('stores only a hash of the verification token', async () => {
  const issued = await issueEmailVerificationToken('user-1');
  const stored = state.tx.emailVerificationToken.create.mock.calls[0][0].data;

  expect(stored.tokenHash).toBe(hashOpaqueToken(issued.token));
  expect(stored.tokenHash).not.toContain(issued.token);
  expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
});

test('rotates previous verification tokens before issuing a new one', async () => {
  await issueEmailVerificationToken('user-1');

  expect(state.tx.emailVerificationToken.updateMany).toHaveBeenCalledWith({
    where: { userId: 'user-1', consumedAt: null },
    data: { consumedAt: expect.any(Date) },
  });
});

test('a valid verification token marks the email verified', async () => {
  state.tx.emailVerificationToken.findUnique.mockResolvedValue({
    id: 'token-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  });
  state.tx.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });

  await expect(consumeEmailVerificationToken('raw-token')).resolves.toBe(true);
  expect(state.tx.user.update).toHaveBeenCalledWith({
    where: { id: 'user-1' },
    data: { emailVerifiedAt: expect.any(Date) },
    select: { id: true },
  });
});

test('an expired verification token is rejected', async () => {
  state.tx.emailVerificationToken.findUnique.mockResolvedValue({
    id: 'token-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() - 1000),
    consumedAt: null,
  });

  await expect(consumeEmailVerificationToken('raw-token')).resolves.toBe(false);
  expect(state.tx.user.update).not.toHaveBeenCalled();
});

test('a consumed verification token cannot be replayed', async () => {
  state.tx.emailVerificationToken.findUnique.mockResolvedValue({
    id: 'token-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: new Date(),
  });

  await expect(consumeEmailVerificationToken('raw-token')).resolves.toBe(false);
  expect(state.tx.emailVerificationToken.updateMany).not.toHaveBeenCalled();
});

test('a reset token replaces the password exactly once', async () => {
  state.tx.passwordResetToken.findUnique.mockResolvedValue({
    id: 'token-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  });
  state.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

  await expect(resetPasswordWithToken('raw-token', 'new-hash')).resolves.toBe('user-1');
  expect(state.tx.user.update).toHaveBeenCalledWith({
    where: { id: 'user-1' },
    data: { password: 'new-hash' },
    select: { id: true },
  });
  expect(state.tx.passwordResetToken.create).not.toHaveBeenCalled();
});

test('a reused reset token returns null', async () => {
  state.tx.passwordResetToken.findUnique.mockResolvedValue({
    id: 'token-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: new Date(),
  });

  await expect(resetPasswordWithToken('raw-token', 'new-hash')).resolves.toBeNull();
});

test('reset tokens expire after one hour', async () => {
  const issued = await issuePasswordResetToken('user-1');

  expect(issued.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000);
  expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now() + 50 * 60 * 1000);
});
