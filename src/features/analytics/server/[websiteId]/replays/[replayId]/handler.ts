import { parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { canUseWebsiteFeature } from '@/lib/feature-access';
import { canViewWebsite } from '@/permissions';
import { getReplayChunks } from '@/features/analytics/server/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; replayId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, replayId } = await params;

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

  const chunks = await getReplayChunks(websiteId, replayId);

  const allEvents = chunks.flatMap(chunk => chunk.events).sort((a, b) => a.timestamp - b.timestamp);
  const sessionId = chunks.length > 0 ? chunks[0].sessionId : null;
  const startedAt = chunks.length > 0 ? chunks[0].startedAt : null;
  const endedAt = chunks.length > 0 ? chunks[chunks.length - 1].endedAt : null;

  return json({
    sessionId,
    events: allEvents,
    startedAt,
    endedAt,
    eventCount: allEvents.length,
    chunkCount: chunks.length,
  });
}
