import { isbot } from 'isbot';
import { serializeError } from 'serialize-error';
import { z } from 'zod';
import { parseCollectorCacheToken } from '@/lib/collector-cache';
import { secret } from '@/lib/crypto';
import { getClientInfo, hasBlockedIp } from '@/lib/detect';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { planHasFeature } from '@/lib/plans';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serverError } from '@/lib/response';
import { releaseReplaySession, reserveReplaySession } from '@/lib/usage';
import { getWebsite } from '@/queries/prisma';
import { saveRecording } from '@/queries/sql';

const schema = z.object({
  type: z.literal('record'),
  payload: z.object({
    website: z.uuid(),
    events: z.array(z.any()).max(200),
    timestamp: z.coerce.number().int().optional(),
  }),
});

export async function POST(request: Request) {
  let reservedReplay: { workspaceId: string; sessionId: string } | null = null;
  let recordingCommitted = false;

  try {
    const { body, error } = await parseRequest(request, schema, { skipAuth: true });

    if (error) {
      return error();
    }

    const { website: websiteId, events, timestamp } = body.payload;

    if (!events?.length) {
      return json({ ok: true });
    }

    // Parse cache token to get session info
    const cacheHeader = request.headers.get('x-talivia-cache');

    if (!cacheHeader) {
      return badRequest({ message: 'Missing session token.' });
    }

    const cache = parseCollectorCacheToken(cacheHeader, websiteId, secret());

    if (!cache) {
      return badRequest({ message: 'Invalid session token.' });
    }

    const { sessionId } = cache;

    // Query directly to avoid stale Redis cache for recordingEnabled
    const website = await getWebsite(websiteId);

    if (!website) {
      return badRequest({ message: 'Website not found.' });
    }

    if (!website.replayEnabled) {
      return json({ ok: false, reason: 'replay_disabled' });
    }

    // Client info for bot/IP checks
    const { ip, userAgent } = await getClientInfo(request, {});

    if (!process.env.DISABLE_BOT_CHECK && isbot(userAgent)) {
      return json({ beep: 'boop' });
    }

    if (hasBlockedIp(ip)) {
      return forbidden();
    }

    // Replay is a plan entitlement and is metered per session, separately
    // from billable events. Starter has no replay entitlement.
    if (!website.workspaceId) {
      return json({ ok: false, reason: 'workspace_required' });
    }

    const entitlements = await getWorkspaceEntitlements(website.workspaceId);

    if (!entitlements?.plan || !planHasFeature(entitlements.plan, 'session_replay')) {
      return json({ ok: false, reason: 'replay_not_in_plan' });
    }

    const replayUsage = await reserveReplaySession({
      workspaceId: website.workspaceId,
      websiteId,
      sessionId,
      limit: entitlements.plan.replaySessionsPerMonth,
    });

    if (!replayUsage.allowed) {
      return json({
        ok: false,
        reason: 'usage_limit_reached',
        limit: replayUsage.limit,
        used: replayUsage.used,
      });
    }

    if (replayUsage.metered) {
      reservedReplay = { workspaceId: website.workspaceId, sessionId };
    }

    // Compute timestamps from events
    const eventTimestamps = events
      .map((e: any) => Number(e?.timestamp))
      .filter((t: number) => Number.isFinite(t) && t > 0);

    const fallbackMs = (timestamp || Math.floor(Date.now() / 1000)) * 1000;
    const minTimestamp = eventTimestamps.length ? Math.min(...eventTimestamps) : fallbackMs;
    const maxTimestamp = eventTimestamps.length ? Math.max(...eventTimestamps) : fallbackMs;

    const startedAt = new Date(minTimestamp);
    const endedAt = new Date(maxTimestamp);

    // Use timestamp-based chunk index for ordering
    const chunkIndex = timestamp || Math.floor(Date.now() / 1000);

    await saveRecording({
      websiteId,
      sessionId,
      chunkIndex,
      events,
      eventCount: events.length,
      startedAt,
      endedAt,
    });

    recordingCommitted = true;

    return json({ ok: true });
  } catch (e) {
    if (reservedReplay && !recordingCommitted) {
      try {
        await releaseReplaySession(reservedReplay);
      } catch {
        // Best effort; the session stays counted rather than blocking replay.
      }
    }

    const error = serializeError(e);

    // eslint-disable-next-line no-console
    console.log(error);

    return serverError({ errorObject: error });
  }
}
