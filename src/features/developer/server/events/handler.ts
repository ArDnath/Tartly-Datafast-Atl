import prisma from '@/lib/prisma';
import { json } from '@/lib/response';
import { authenticateDeveloperRequest } from '@/features/developer/server/context';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

/**
 * `GET /api/developer/events?limit=20`
 *
 * Returns recent pageviews for the key's website. Event properties are omitted
 * so the endpoint cannot become a bulk export path.
 */
export async function GET(request: Request) {
  const resolved = await authenticateDeveloperRequest(request);

  if ('response' in resolved) {
    return resolved.response;
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));

  const events = await prisma.client.websiteEvent.findMany({
    where: { websiteId: resolved.context.website.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      urlPath: true,
      eventType: true,
      eventName: true,
      referrerDomain: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      hostname: true,
    },
  });

  return json({
    websiteId: resolved.context.website.id,
    limit,
    data: events,
  });
}
