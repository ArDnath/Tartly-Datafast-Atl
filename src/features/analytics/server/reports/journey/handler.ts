import { canUseWebsiteFeature } from '@/lib/feature-access';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { reportResultSchema } from '@/lib/schema';
import { canViewWebsite } from '@/permissions';
import { getJourney } from '@/features/analytics/server/queries/sql';

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, reportResultSchema);

  if (error) {
    return error();
  }

  const { websiteId, parameters, filters } = body;
  const { eventType } = parameters;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  // A share token is read-only and already scoped by the share; a signed-in
  // member needs Pro for journey reports.
  if (!auth.shareToken && !(await canUseWebsiteFeature(auth, websiteId, 'journeys'))) {
    return forbidden({
      code: 'plan_feature_required',
      feature: 'journeys',
      message: 'Journey reports are included in the Pro plan.',
    });
  }

  if (eventType) {
    filters.eventType = eventType;
  }

  const queryFilters = await getQueryFilters(filters, websiteId);

  const data = await getJourney(websiteId, parameters, queryFilters);

  return json(data);
}
