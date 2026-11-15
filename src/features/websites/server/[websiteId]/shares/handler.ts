import { z } from 'zod';
import { ENTITY_TYPE } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { canUseWebsiteFeature } from '@/lib/feature-access';
import { getRandomChars } from '@/features/websites/lib/generate';
import { parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { getShareExpiry } from '@/lib/share-policy';
import { anyObjectParam, filterParams, pagingParams } from '@/lib/schema';
import { canManageWebsiteIntegrations } from '@/permissions';
import { createShare, getSharesByEntityId } from '@/queries/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    ...filterParams,
    ...pagingParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;
  const { page, pageSize, search } = query;

  if (!(await canManageWebsiteIntegrations(auth, websiteId))) {
    return unauthorized();
  }

  const data = await getSharesByEntityId(websiteId, {
    page,
    pageSize,
    search,
  });

  return json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    name: z.string().max(200),
    parameters: anyObjectParam.optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;
  const { name, parameters } = body;
  const shareParameters = parameters ?? {};

  if (!(await canManageWebsiteIntegrations(auth, websiteId))) {
    return unauthorized();
  }

  if (!(await canUseWebsiteFeature(auth, websiteId, 'client_reporting'))) {
    return forbidden({
      code: 'plan_feature_required',
      feature: 'client_reporting',
      message: 'Client reporting links are included in the Pro plan.',
    });
  }

  const slug = getRandomChars(16);

  const share = await createShare({
    id: uuid(),
    entityId: websiteId,
    shareType: ENTITY_TYPE.website,
    name,
    slug,
    parameters: shareParameters,
    expiresAt: getShareExpiry(),
  });

  return json(share);
}
