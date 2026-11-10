import { beforeEach, describe, expect, test, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  client: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const createPersonalAccountMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@/features/auth/server/registration', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/server/registration')>(
    '@/features/auth/server/registration',
  );

  return {
    ...actual,
    createPersonalAccount: createPersonalAccountMock,
  };
});

const { findOrCreateGoogleUser, GoogleAccountError } = await import('./account');
const { RegistrationError } = await import('@/features/auth/server/registration');

const profile = {
  subject: 'google-subject',
  email: 'Founder@Example.com',
  emailVerified: true as const,
  name: 'Ada Founder',
  picture: 'https://example.com/avatar.png',
};

const googleUser = {
  id: 'user-1',
  username: 'founder@example.com',
  role: 'user',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  emailVerifiedAt: new Date('2026-02-01T00:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.client.user.findFirst.mockResolvedValue(null);
  prismaMock.client.user.findUnique.mockResolvedValue(null);
  prismaMock.client.user.update.mockResolvedValue(googleUser);
});

describe('findOrCreateGoogleUser', () => {
  test('returns an existing account by Google subject before looking at email', async () => {
    prismaMock.client.user.findFirst.mockResolvedValue(googleUser);

    await expect(findOrCreateGoogleUser(profile)).resolves.toBe(googleUser);
    expect(prismaMock.client.user.findUnique).not.toHaveBeenCalled();
  });

  test('links a verified Google email to an existing password account', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue({
      ...googleUser,
      googleId: null,
      displayName: null,
      logoUrl: null,
      deletedAt: null,
      suspendedAt: null,
      emailVerifiedAt: null,
    });

    await findOrCreateGoogleUser(profile);

    expect(prismaMock.client.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          googleId: 'google-subject',
          displayName: 'Ada Founder',
          logoUrl: 'https://example.com/avatar.png',
        }),
      }),
    );
  });

  test('creates a passwordless account for a new user', async () => {
    createPersonalAccountMock.mockResolvedValue({
      user: { id: 'user-2', username: 'founder@example.com', role: 'user' },
    });

    const user = await findOrCreateGoogleUser(profile);

    expect(user.id).toBe('user-2');
    expect(createPersonalAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'founder@example.com',
        password: null,
        googleId: 'google-subject',
        displayName: 'Ada Founder',
        emailVerifiedAt: expect.any(Date),
      }),
    );
  });

  test('never revives a deleted or suspended account', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue({
      ...googleUser,
      googleId: null,
      displayName: null,
      logoUrl: null,
      deletedAt: new Date(),
      suspendedAt: null,
    });

    await expect(findOrCreateGoogleUser(profile)).rejects.toBeInstanceOf(GoogleAccountError);
  });

  test('rejects an email already linked to a different Google subject', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue({
      ...googleUser,
      googleId: 'another-subject',
      displayName: null,
      logoUrl: null,
      deletedAt: null,
      suspendedAt: null,
    });

    await expect(findOrCreateGoogleUser(profile)).rejects.toBeInstanceOf(GoogleAccountError);
  });

  test('returns the winning row when two first-time sign-ins race', async () => {
    createPersonalAccountMock.mockRejectedValue(
      new RegistrationError('username-taken', 'already exists'),
    );
    prismaMock.client.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...googleUser, id: 'user-race' });

    await expect(findOrCreateGoogleUser(profile)).resolves.toMatchObject({ id: 'user-race' });
  });

  test('does not swallow unrelated account creation failures', async () => {
    createPersonalAccountMock.mockRejectedValue(new Error('database offline'));

    await expect(findOrCreateGoogleUser(profile)).rejects.toThrow('database offline');
  });
});
