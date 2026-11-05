import { beforeEach, describe, expect, test, vi } from 'vitest';

const transaction = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction,
  },
}));

vi.mock('@/queries/prisma', () => ({
  getUserByUsername: vi.fn(),
}));

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
}));

const { getUserByUsername } = await import('@/queries/prisma');
const { registerAccount, RegistrationError } = await import('./registration');

function fakeTx() {
  return {
    user: {
      create: vi.fn(async ({ data }: any) => ({
        id: data.id,
        username: data.username,
        role: data.role,
      })),
    },
    workspace: {
      create: vi.fn(async ({ data }: any) => ({
        id: data.id,
        name: data.name,
        slug: data.slug,
      })),
    },
    workspaceMembership: {
      create: vi.fn(async () => ({ id: 'membership-1' })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserByUsername).mockResolvedValue(null);
  transaction.mockImplementation(async (fn: any) => fn(fakeTx()));
});

describe('registerAccount', () => {
  test('creates the user, workspace, and OWNER membership in one transaction', async () => {
    const tx = fakeTx();
    transaction.mockImplementation(async (fn: any) => fn(tx));

    const account = await registerAccount({
      username: 'Founder@Example.com',
      password: 'correct horse battery',
      workspaceName: 'Acme Studio',
    });

    expect(account.user.username).toBe('founder@example.com');
    expect(account.workspace.name).toBe('Acme Studio');
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'founder@example.com',
          password: 'hashed:correct horse battery',
        }),
      }),
    );
    expect(tx.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Acme Studio',
          planId: 'starter',
          subscriptionStatus: 'incomplete',
        }),
      }),
    );
    expect(tx.workspaceMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'OWNER' }),
      }),
    );
  });

  test('rejects a duplicate account before opening a transaction', async () => {
    vi.mocked(getUserByUsername).mockResolvedValue({ id: 'existing' } as any);

    await expect(
      registerAccount({ username: 'founder@example.com', password: 'long-enough-password' }),
    ).rejects.toBeInstanceOf(RegistrationError);
    expect(transaction).not.toHaveBeenCalled();
  });

  test('propagates a mid-transaction failure instead of returning a partial account', async () => {
    const tx = fakeTx();
    tx.workspaceMembership.create.mockRejectedValue(new Error('membership write failed'));
    transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(
      registerAccount({ username: 'founder@example.com', password: 'long-enough-password' }),
    ).rejects.toThrow('membership write failed');
  });
});
