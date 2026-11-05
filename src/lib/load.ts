import type { Website } from '@/generated/prisma/client';
import redis from '@/lib/redis';
import { getWebsite } from '@/queries/prisma';

export async function fetchWebsite(websiteId: string): Promise<Website> {
  let website = null;

  if (redis.enabled) {
    website = await redis.client.fetch(`website:${websiteId}`, () => getWebsite(websiteId), 86400);
  } else {
    website = await getWebsite(websiteId);
  }

  if (!website || website.deletedAt) {
    return null;
  }

  return website;
}
