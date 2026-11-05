import { beforeEach, expect, test, vi } from 'vitest';
import { consumeEmailVerificationToken } from '@/lib/auth-tokens';
import { POST } from './handler';

vi.mock('@/lib/auth-tokens', () => ({
  consumeEmailVerificationToken: vi.fn(),
}));

function request(token: string, origin?: string) {
  return new Request('https://app.example.com/api/auth/email/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify({ token }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('consumes a valid verification token', async () => {
  vi.mocked(consumeEmailVerificationToken).mockResolvedValue(true);

  const response = await POST(request('c'.repeat(32)));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ verified: true });
});

test('rejects an invalid or expired token', async () => {
  vi.mocked(consumeEmailVerificationToken).mockResolvedValue(false);

  const response = await POST(request('d'.repeat(32)));
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('invalid-verification-token');
});

test('rejects a cross-site request before consuming the token', async () => {
  const response = await POST(request('e'.repeat(32), 'https://evil.example'));

  expect(response.status).toBe(403);
  expect(consumeEmailVerificationToken).not.toHaveBeenCalled();
});
