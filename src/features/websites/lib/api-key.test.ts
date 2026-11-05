import { beforeEach, expect, test, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { authenticateApiKey } from './api-key';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      apiKey: { findFirst: vi.fn(), update: vi.fn() },
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getBearerToken: vi.fn(),
}));

vi.mock('@/lib/crypto', () => ({
  hash: vi.fn(() => 'hashed'),
  secret: vi.fn(() => 'secret'),
}));

function request() {
  return new Request('https://example.com/api/developer/verify', {
    headers: { 'x-talivia-api-key': 'tlv_test' },
  });
}

function key(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    keyHash: 'hashed',
    revokedAt: null,
    websiteId: 'website-1',
    userId: 'user-1',
    user: { deletedAt: null, suspendedAt: null },
    website: {
      deletedAt: null,
      workspace: { deletedAt: null, suspendedAt: null },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.client.apiKey.findFirst as any).mockResolvedValue(key());
});

test('accepts a key for a live website and live owner', async () => {
  const result = await authenticateApiKey(request());

  expect(result).toMatchObject({ id: 'key-1' });
  expect(prisma.client.apiKey.update).toHaveBeenCalled();
});

test('rejects a key when the owner is suspended', async () => {
  vi.mocked(prisma.client.apiKey.findFirst as any).mockResolvedValue(
    key({ user: { deletedAt: null, suspendedAt: new Date() } }),
  );

  await expect(authenticateApiKey(request())).resolves.toBeNull();
  expect(prisma.client.apiKey.update).not.toHaveBeenCalled();
});

test('rejects a key when the workspace is suspended or deleted', async () => {
  vi.mocked(prisma.client.apiKey.findFirst as any).mockResolvedValue(
    key({
      website: {
        deletedAt: null,
        workspace: { deletedAt: null, suspendedAt: new Date() },
      },
    }),
  );

  await expect(authenticateApiKey(request())).resolves.toBeNull();
  expect(prisma.client.apiKey.update).not.toHaveBeenCalled();
});

test('rejects a key when the website is deleted', async () => {
  vi.mocked(prisma.client.apiKey.findFirst as any).mockResolvedValue(
    key({ website: { deletedAt: new Date(), workspace: null } }),
  );

  await expect(authenticateApiKey(request())).resolves.toBeNull();
});
