import { z } from 'zod';
import { uuid } from '@/lib/crypto';
import { getWorkspaceEntitlements, getWebsiteLimit } from '@/lib/entitlements';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams } from '@/lib/schema';
import { getWebsiteNameFromDomain, normalizeWebsiteDomainInput } from '@/lib/website-domain';
import { canCreateWebsite } from '@/permissions';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { createWebsite } from '@/queries/prisma';
import {
  countWorkspaceWebsites,
  getDefaultWorkspaceForUser,
  getUserWebsites,
} from '@/queries/prisma/website';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
    workspaceId: z.uuid().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { workspaceId, ...rest } = query;

  if (workspaceId) {
    const access = await requireWorkspaceAccess(auth.user, workspaceId, 'VIEWER');

    if (!access) {
      return unauthorized({ message: 'You cannot view this workspace.' });
    }
  }

  const filters = await getQueryFilters(rest);

  return json(await getUserWebsites(auth.user.id, filters, workspaceId));
}

export async function POST(request: Request) {
  const schema = z.strictObject({
    name: z.string().max(100).optional(),
    domain: z.string().trim().min(1).max(500),
    id: z.uuid().nullable().optional(),
    workspaceId: z.uuid().optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { id } = body;
  const domain = normalizeWebsiteDomainInput(body.domain);
  const name = body.name?.trim() || getWebsiteNameFromDomain(domain);

  if (!domain) {
    return badRequest({ message: 'Domain is required.' });
  }

  if (!(await canCreateWebsite(auth))) {
    return unauthorized();
  }

  const workspaceId = body.workspaceId || (await getDefaultWorkspaceForUser(auth.user.id));

  if (!workspaceId) {
    return badRequest({
      code: 'workspace-required',
      message: 'Choose a workspace before adding a website.',
    });
  }

  const access = await requireWorkspaceAccess(auth.user, workspaceId, 'ADMIN');

  if (!access) {
    return unauthorized({ message: 'You cannot add a website to this workspace.' });
  }

  const entitlements = await getWorkspaceEntitlements(workspaceId);
  const limit = getWebsiteLimit(entitlements);

  if (!entitlements?.plan) {
    return badRequest({
      code: 'plan-required',
      message: 'Choose a plan before adding a website.',
    });
  }

  if ((await countWorkspaceWebsites(workspaceId)) >= limit) {
    return badRequest({
      code: 'website-limit-reached',
      message: `Your ${entitlements.plan.name} plan includes ${limit} website${limit === 1 ? '' : 's'}. Upgrade to add more.`,
    });
  }

  const data: any = {
    id: id ?? uuid(),
    createdBy: auth.user.id,
    name,
    domain,
    userId: auth.user.id,
    workspaceId,
  };

  const website = await createWebsite(data);

  return json(website);
}
