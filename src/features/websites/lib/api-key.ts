import { randomBytes } from 'node:crypto';
import { getBearerToken } from '@/lib/auth';
import { hash, secret } from '@/lib/crypto';
import { getWorkspaceMembership } from '@/lib/workspace-auth';
import prisma from '@/lib/prisma';

export function createApiKeyToken() {
  const token = randomBytes(24).toString('base64url');

  return `tlv_${token}`;
}

export function hashApiKey(value: string) {
  return hash(value, secret());
}

function getApiKeyToken(request: Request) {
  return request.headers.get('x-talivia-api-key') || getBearerToken(request);
}

export async function authenticateApiKey(request: Request) {
  const token = getApiKeyToken(request);

  if (!token) {
    return null;
  }

  const apiKey = await prisma.client.apiKey.findFirst({
    where: {
      keyHash: hashApiKey(token),
      revokedAt: null,
    },
    include: {
      user: { select: { deletedAt: true, suspendedAt: true } },
      website: {
        select: {
          deletedAt: true,
          workspaceId: true,
          workspace: { select: { deletedAt: true, suspendedAt: true } },
        },
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  // API keys are machine credentials for one website. A key without a live
  // website scope must never reach a handler that trusts `apiKey.websiteId`.
  if (!apiKey.websiteId || !apiKey.website || apiKey.website.deletedAt) {
    return null;
  }

  // A key is only as live as its owner and tenant. Suspending a user or a
  // workspace must not leave a machine credential working.
  if (apiKey.user && (apiKey.user.deletedAt || apiKey.user.suspendedAt)) {
    return null;
  }

  if (
    apiKey.website.workspace &&
    (apiKey.website.workspace.deletedAt || apiKey.website.workspace.suspendedAt)
  ) {
    return null;
  }

  // New keys record the creator. If that person has since been removed from
  // the workspace, the key must stop working immediately.
  if (apiKey.userId && apiKey.website.workspaceId) {
    const membership = await getWorkspaceMembership(apiKey.userId, apiKey.website.workspaceId);

    if (!membership) {
      return null;
    }
  }

  await prisma.client.apiKey.update({
    where: {
      id: apiKey.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return apiKey;
}
