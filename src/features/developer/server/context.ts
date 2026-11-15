import { authenticateApiKey } from '@/features/websites/lib/api-key';
import { getWorkspaceEntitlements, entitlementsHaveFeature } from '@/lib/entitlements';
import prisma from '@/lib/prisma';
import { forbidden, json, notFound, unauthorized } from '@/lib/response';

export interface DeveloperContext {
  apiKey: NonNullable<Awaited<ReturnType<typeof authenticateApiKey>>>;
  website: {
    id: string;
    name: string;
    domain: string | null;
  };
}

/**
 * Resolve a developer request from a website-scoped API key.
 *
 * There is deliberately no user/session fallback here. The CLI and MCP server
 * must use a key that is already limited to one website, so a leaked shell
 * credential cannot read another tenant's data.
 */
export async function authenticateDeveloperRequest(
  request: Request,
): Promise<{ context: DeveloperContext } | { response: Response }> {
  const apiKey = await authenticateApiKey(request);

  if (!apiKey) {
    return { response: unauthorized({ code: 'invalid-api-key' }) };
  }

  if (!apiKey.websiteId) {
    return {
      response: unauthorized({
        code: 'api-key-not-website-scoped',
        message: 'Create a website API key to use the developer tools.',
      }),
    };
  }

  const website = await prisma.client.website.findFirst({
    where: { id: apiKey.websiteId, deletedAt: null },
    select: { id: true, name: true, domain: true, workspaceId: true },
  });

  if (!website) {
    return { response: notFound({ code: 'website-not-found' }) };
  }

  // API keys are also used by the Manual payment API, which is a Starter
  // feature. Gate the developer read tools here rather than key creation, so a
  // Starter customer can still connect payments.
  if (website.workspaceId) {
    const entitlements = await getWorkspaceEntitlements(website.workspaceId);

    if (!entitlementsHaveFeature(entitlements, 'api_access')) {
      return {
        response: forbidden({
          code: 'plan_feature_required',
          feature: 'api_access',
          message: 'Developer API access is included in the Pro plan.',
        }),
      };
    }
  }

  return { context: { apiKey, website } };
}

export async function getInstallationFacts(websiteId: string, apiKeyWebsiteId: string | null) {
  const [website, eventCount, latest] = await Promise.all([
    prisma.client.website.findFirst({
      where: { id: websiteId, deletedAt: null },
      select: { id: true, domain: true },
    }),
    prisma.client.websiteEvent.count({ where: { websiteId } }),
    prisma.client.websiteEvent.findFirst({
      where: { websiteId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  if (!website) {
    return null;
  }

  return {
    websiteId: website.id,
    websiteDomain: website.domain,
    apiKeyWebsiteId,
    eventCount,
    lastEventAt: latest?.createdAt ?? null,
  };
}

export { json, unauthorized, notFound };
