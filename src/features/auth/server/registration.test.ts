import { beforeEach, describe, expect, test, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  client: {
    user: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@/queries/prisma', () => ({
  getUserByUsername: vi.fn(),
}));

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
}));

const { getUserByUsername } = await import('@/queries/prisma');
const { registerAccount, RegistrationError } = await import('./registration');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserByUsername).mockResolvedValue(null);
  prismaMock.client.user.create.mockImplementation(async ({ data }: any) => ({
    id: 'user-1',
    username: data.username,
    role: data.role,
  }));
});

describe('registerAccount', () => {
  test('creates only the account; the workspace is created in onboarding', async () => {
    const account = await registerAccount({
      username: 'Founder@Example.com',
      password: 'correct horse battery',
    });

    expect(account.user.username).toBe('founder@example.com');
    expect(prismaMock.client.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'founder@example.com',
          password: 'hashed:correct horse battery',
        }),
      }),
    );
    expect(account).not.toHaveProperty('workspace');
  });

  test('rejects a duplicate account before trying to insert', async () => {
    vi.mocked(getUserByUsername).mockResolvedValue({ id: 'existing' } as any);

    await expect(
      registerAccount({ username: 'founder@example.com', password: 'long-enough-password' }),
    ).rejects.toBeInstanceOf(RegistrationError);
    expect(prismaMock.client.user.create).not.toHaveBeenCalled();
  });

  test('reports a unique-constraint race as a taken account', async () => {
    prismaMock.client.user.create.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    await expect(
      registerAccount({ username: 'founder@example.com', password: 'long-enough-password' }),
    ).rejects.toBeInstanceOf(RegistrationError);
  });
});
