import { canUseWebsiteFeature, canUseWorkspaceFeature } from '@/lib/feature-access';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { reportResultSchema } from '@/lib/schema';
import { getShareableWebsite } from '@/queries/prisma';
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

  // A share token is read-only, but the Pro entitlement still applies to the
  // report it exposes. A signed-in member is resolved from their membership.
  const journeysAllowed = auth.shareToken
    ? await (async () => {
        const website = await getShareableWebsite(websiteId);
        return website?.workspaceId
          ? canUseWorkspaceFeature(website.workspaceId, 'journeys')
          : false;
      })()
    : await canUseWebsiteFeature(auth, websiteId, 'journeys');

  if (!journeysAllowed) {
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
