import { startOfMinute, subMinutes } from 'date-fns';
import { z } from 'zod';
import { REALTIME_RANGE } from '@/lib/constants';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { timezoneParam, unitParam } from '@/lib/schema';
import { canViewWebsite } from '@/permissions';
import { getRealtimeData } from '@/features/analytics/server/queries/sql';

const schema = z.object({
  timezone: timezoneParam.optional(),
  unit: unitParam.optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const filters = await getQueryFilters(
    {
      ...query,
      startAt: subMinutes(startOfMinute(new Date()), REALTIME_RANGE).getTime(),
      endAt: Date.now(),
    },
    websiteId,
  );

  const data = await getRealtimeData(websiteId, filters);

  return json(data);
}
