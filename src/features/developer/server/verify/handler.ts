import { json } from '@/lib/response';
import {
  authenticateDeveloperRequest,
  getInstallationFacts,
} from '@/features/developer/server/context';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/developer/verify`
 *
 * Answers the CLI/MCP question "is the tracker installed?" using the API key's
 * website, never a website ID supplied by the caller.
 */
export async function GET(request: Request) {
  const resolved = await authenticateDeveloperRequest(request);

  if ('response' in resolved) {
    return resolved.response;
  }

  const facts = await getInstallationFacts(
    resolved.context.website.id,
    resolved.context.apiKey.websiteId,
  );

  if (!facts) {
    return json({ installed: false, eventCount: 0, lastEventAt: null });
  }

  return json({
    installed: facts.eventCount > 0,
    websiteId: facts.websiteId,
    eventCount: facts.eventCount,
    lastEventAt: facts.lastEventAt,
  });
}
