import { beforeEach, expect, test, vi } from 'vitest';
import { issuePasswordResetToken } from '@/lib/auth-tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { getUserByUsername } from '@/queries/prisma';
import { POST } from './handler';

vi.mock('@/queries/prisma', () => ({
  getUserByUsername: vi.fn(),
}));

vi.mock('@/lib/auth-tokens', () => ({
  issuePasswordResetToken: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: vi.fn(async () => ({
    allowed: true,
    limit: 5,
    remaining: 4,
    retryAfterSeconds: 0,
  })),
  hashRateLimitSubject: (value: string) => `hashed:${value}`,
  rateLimitKey: (...parts: string[]) => parts.join(':'),
}));

function request(email: string) {
  return new Request('https://app.example.com/api/auth/password/forgot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(issuePasswordResetToken).mockResolvedValue({
    token: 'reset-token',
    expiresAt: new Date(Date.now() + 60_000),
  });
});

test('sends a single-use reset link for an existing account', async () => {
  vi.mocked(getUserByUsername).mockResolvedValue({
    id: 'user-1',
    username: 'owner@example.com',
    role: 'user',
    deletedAt: null,
  } as any);

  const response = await POST(request('owner@example.com'));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ sent: true });
  expect(issuePasswordResetToken).toHaveBeenCalledWith('user-1');
  expect(sendPasswordResetEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'owner@example.com',
      resetUrl: 'https://app.example.com/reset-password?token=reset-token',
    }),
  );
});

test('does not reveal whether an unknown email exists', async () => {
  vi.mocked(getUserByUsername).mockResolvedValue(null);

  const response = await POST(request('unknown@example.com'));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ sent: true });
  expect(issuePasswordResetToken).not.toHaveBeenCalled();
  expect(sendPasswordResetEmail).not.toHaveBeenCalled();
});

test('rejects a cross-site request', async () => {
  const response = await POST(
    new Request('https://app.example.com/api/auth/password/forgot', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
      },
      body: JSON.stringify({ email: 'owner@example.com' }),
    }),
  );

  expect(response.status).toBe(403);
});
