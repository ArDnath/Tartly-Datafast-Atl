import { cleanupExpiredAuthSessions } from '@/lib/auth-session';
import { cleanupExpiredAuthTokens } from '@/lib/auth-tokens';
import prisma from '@/lib/prisma';

/**
 * Delete expired sessions, email/reset tokens, and rate-limit buckets.
 *
 * This job is global by design: it never takes a tenant ID and never returns
 * row contents, so it cannot be used to probe another workspace.
 */
export async function runAuthMaintenanceJob({
  cleanupSessions = cleanupExpiredAuthSessions,
  cleanupTokens = cleanupExpiredAuthTokens,
  client = prisma.client,
  now = new Date(),
}: {
  cleanupSessions?: () => Promise<unknown>;
  cleanupTokens?: () => Promise<unknown>;
  client?: Pick<typeof prisma.client, 'rateLimitBucket'>;
  now?: Date;
} = {}) {
  await cleanupSessions();
  await cleanupTokens();

  const rateLimits = await client.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  return {
    sessions: 'cleaned',
    tokens: 'cleaned',
    rateLimits: rateLimits.count,
  };
}
