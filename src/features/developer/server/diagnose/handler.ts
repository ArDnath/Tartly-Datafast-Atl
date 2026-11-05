import { diagnoseInstallation } from '@/features/developer/lib/diagnostics';
import {
  authenticateDeveloperRequest,
  getInstallationFacts,
} from '@/features/developer/server/context';
import { json, notFound } from '@/lib/response';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/developer/diagnose`
 *
 * Runs the pure diagnostic rules against real installation facts. It is safe
 * for an agent to call repeatedly: it writes nothing.
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
    return notFound({ code: 'website-not-found' });
  }

  return json({
    website: resolved.context.website,
    facts,
    diagnosis: diagnoseInstallation(facts),
  });
}
