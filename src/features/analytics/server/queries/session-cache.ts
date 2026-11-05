import type { Session } from '@/generated/prisma/client';
import redis from '@/lib/redis';
import { getWebsiteSession } from './sql';

export async function fetchSession(websiteId: string, sessionId: string): Promise<Session> {
  let session = null;

  if (redis.enabled) {
    session = await redis.client.fetch(
      // Include the website ID in the key: a session ID must never be
      // resolvable through another tenant's cache entry.
      `session:${websiteId}:${sessionId}`,
      () => getWebsiteSession(websiteId, sessionId),
      86400,
    );
  } else {
    session = await getWebsiteSession(websiteId, sessionId);
  }

  if (!session || session.websiteId !== websiteId) {
    return null;
  }

  return session;
}
