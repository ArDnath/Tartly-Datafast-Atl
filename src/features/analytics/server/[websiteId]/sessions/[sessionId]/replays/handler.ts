import { getQueryFilters, parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams, withDateRange } from '@/lib/schema';
import { canUseWebsiteFeature } from '@/lib/feature-access';
import { canViewWebsite } from '@/permissions';
import { getSessionReplays } from '@/features/analytics/server/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; sessionId: string }> },
) {
  const schema = withDateRange({
    ...pagingParams,
    ...searchParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId, sessionId } = await params;

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

  const filters = await getQueryFilters(query, websiteId);

  const data = await getSessionReplays(websiteId, filters, sessionId);

  return json(data);
}
