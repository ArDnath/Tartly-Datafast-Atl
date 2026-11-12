import {
  buildPreflightResponse,
  getFirstPartyScriptUrl,
  isLocalWebsiteHost,
  normalizePreflightDomain,
} from '@/features/analytics/lib/preflight';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { consumeRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { parseRequest } from '@/lib/request';
import { json, tooManyRequests, unauthorized } from '@/lib/response';
import { safeFetch } from '@/lib/safe-fetch';
import { requireWebsiteAccess } from '@/lib/workspace-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_TIMEOUT_MS = 5_000;
const SCRIPT_TIMEOUT_MS = 3_000;
const MAX_HTML_BYTES = 256 * 1024;

function logResult({
  websiteId,
  result,
}: {
  websiteId: string;
  result: ReturnType<typeof buildPreflightResponse>;
}) {
  logger.info('install.preflight.checked', {
    websiteId,
    reachable: result.reachable,
    scriptBlocked: result.csp.scriptBlocked,
    connectBlocked: result.csp.connectBlocked,
    host: result.host.id,
    recommendedMode: result.recommendedMode,
  });
}

/**
 * Inspect the website's configured domain for a policy that would block the
 * standard tracker. The request body is never consulted: only the
 * workspace-scoped website row supplies the URL.
 *
 * Expected failures (unreachable, WAF, malformed CSP, timeout) return HTTP 200
 * with `recommendedMode: "standard"` so onboarding is never blocked. The
 * preflight is rate limited per workspace because it performs outbound DNS and
 * HTTP requests.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const access = await requireWebsiteAccess(auth.user, websiteId, 'ADMIN');

  if (!access) {
    return unauthorized();
  }

  const rateLimit = await consumeRateLimit({
    key: rateLimitKey('install-preflight:workspace', access.workspaceId),
    limit: 10,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return tooManyRequests(
      {
        code: 'install-preflight-rate-limited',
        message: 'Too many install checks. Wait a moment and try again.',
      },
      rateLimit.retryAfterSeconds,
    );
  }

  const website = await prisma.client.website.findFirst({
    where: {
      id: websiteId,
      workspaceId: access.workspaceId,
      deletedAt: null,
    },
    select: { id: true, domain: true },
  });

  if (!website) {
    return unauthorized();
  }

  try {
    const domain = normalizePreflightDomain(website.domain);

    if (!domain || isLocalWebsiteHost(domain)) {
      const result = buildPreflightResponse({
        domain: website.domain,
        site: null,
        firstParty: null,
      });

      logResult({ websiteId, result });

      return json(result);
    }

    const [site, firstParty] = await Promise.all([
      safeFetch(`https://${domain}/`, {
        timeoutMs: SITE_TIMEOUT_MS,
        maxBodyBytes: MAX_HTML_BYTES,
        stopAtHeadEnd: true,
      }),
      safeFetch(getFirstPartyScriptUrl(domain), {
        timeoutMs: SCRIPT_TIMEOUT_MS,
        readBody: false,
        maxRedirects: 2,
      }),
    ]);

    const result = buildPreflightResponse({ domain, site, firstParty });

    logResult({ websiteId, result });

    return json(result);
  } catch (cause) {
    // An unexpected parser or fetch failure must not block onboarding. The
    // customer sees the standard install with a neutral note instead.
    logger.warn('install.preflight.failed', {
      websiteId,
      error: cause instanceof Error ? cause.name : 'unknown',
    });

    return json(
      buildPreflightResponse({
        domain: website.domain,
        site: null,
        firstParty: null,
      }),
    );
  }
}
