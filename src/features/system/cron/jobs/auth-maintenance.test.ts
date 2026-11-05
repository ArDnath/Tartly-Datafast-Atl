import { expect, test, vi } from 'vitest';
import { runAuthMaintenanceJob } from './auth-maintenance';

test('cleans sessions, tokens, and expired rate-limit buckets', async () => {
  const cleanupSessions = vi.fn().mockResolvedValue(undefined);
  const cleanupTokens = vi.fn().mockResolvedValue(undefined);
  const client = {
    rateLimitBucket: {
      deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
    },
  };
  const now = new Date('2026-11-05T03:15:00Z');

  const result = await runAuthMaintenanceJob({
    cleanupSessions,
    cleanupTokens,
    client: client as any,
    now,
  });

  expect(cleanupSessions).toHaveBeenCalledTimes(1);
  expect(cleanupTokens).toHaveBeenCalledTimes(1);
  expect(client.rateLimitBucket.deleteMany).toHaveBeenCalledWith({
    where: { expiresAt: { lt: now } },
  });
  expect(result.rateLimits).toBe(4);
});
