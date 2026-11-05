import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { forbidden, json } from '@/lib/response';
import prisma from '@/lib/prisma';

const schema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  eventType: z.string().trim().max(100).optional(),
});

/**
 * Recent platform audit events. This is an operator surface, not a tenant
 * surface: workspace OWNER/ADMIN never gets access. IP addresses, user agents,
 * and metadata are deliberately omitted from the list; sensitive values can be
 * requested separately during an investigation.
 */
export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!auth.user?.isPlatformAdmin) {
    return forbidden();
  }

  const events = await prisma.client.auditEvent.findMany({
    where: query.eventType ? { eventType: query.eventType } : undefined,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    select: {
      id: true,
      eventType: true,
      resourceType: true,
      resourceId: true,
      userId: true,
      websiteId: true,
      createdAt: true,
    },
  });

  return json({
    data: events,
    pagination: { limit: query.limit, has_more: events.length === query.limit },
  });
}
