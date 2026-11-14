import { z } from 'zod';
import { createApiKeyToken, hashApiKey } from '@/features/websites/lib/api-key';
import { canUseWebsiteFeature } from '@/lib/feature-access';
import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { canManageWebsiteIntegrations, canViewWebsite } from '@/permissions';
import { recordAuditEvent } from '@/queries/prisma';

const schema = z.object({
  name: z.string().min(1).max(100),
});

function serializeApiKey(apiKey: any) {
  return {
    id: apiKey.id,
    name: apiKey.name,
    lastUsedAt: apiKey.lastUsedAt,
    revokedAt: apiKey.revokedAt,
    createdAt: apiKey.createdAt,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  if (!(await canUseWebsiteFeature(auth, websiteId, 'api_access'))) {
    return forbidden({
      code: 'plan_feature_required',
      feature: 'api_access',
      message: 'API keys are included in the Pro plan.',
    });
  }

  const keys = await prisma.client.apiKey.findMany({
    where: {
      websiteId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return json({ data: keys.map(serializeApiKey) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canManageWebsiteIntegrations(auth, websiteId))) {
    return unauthorized();
  }

  if (!(await canUseWebsiteFeature(auth, websiteId, 'api_access'))) {
    return forbidden({
      code: 'plan_feature_required',
      feature: 'api_access',
      message: 'API keys are included in the Pro plan.',
    });
  }

  const key = createApiKeyToken();
  const apiKey = await prisma.client.apiKey.create({
    data: {
      websiteId,
      userId: auth.user.id,
      name: body.name,
      keyHash: hashApiKey(key),
    },
  });

  await recordAuditEvent({
    auth,
    eventType: 'api_key.created',
    metadata: { name: body.name },
    request,
    resourceId: apiKey.id,
    resourceType: 'api_key',
    websiteId,
  });

  return json({ ...serializeApiKey(apiKey), key });
}
