import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams } from '@/lib/schema';
import { canUseWebsiteFeature } from '@/lib/feature-access';
import { canViewWebsite } from '@/permissions';
import { getSavedReplays } from '@/features/analytics/server/queries/sessionReplay';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  if (!(await canUseWebsiteFeature(auth, websiteId, 'session_replay'))) {
    return forbidden({
      code: 'plan_feature_required',
      feature: 'session_replay',
      message: 'Session replay is included in the Pro plan.',
    });
  }

  const data = await getSavedReplays(websiteId, query);

  return json(data);
}
