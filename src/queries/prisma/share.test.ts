import { beforeEach, expect, test, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getShareByCode } from './share';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      share: {
        findUnique: vi.fn(),
      },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('the public resolver refuses an expired share slug', async () => {
  vi.mocked(prisma.client.share.findUnique).mockResolvedValue({
    id: 'share-1',
    slug: 'old-link',
    expiresAt: new Date('2026-11-14T00:00:00.000Z'),
  } as any);

  await expect(getShareByCode('old-link')).resolves.toBeNull();
});

test('the public resolver returns a live share slug', async () => {
  const share = {
    id: 'share-1',
    slug: 'live-link',
    expiresAt: new Date(Date.now() + 60_000),
  };

  vi.mocked(prisma.client.share.findUnique).mockResolvedValue(share as any);

  await expect(getShareByCode('live-link')).resolves.toBe(share);
});
