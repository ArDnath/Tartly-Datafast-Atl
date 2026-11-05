import { randomBytes } from 'node:crypto';
import { getBearerToken } from '@/lib/auth';
import { hash, secret } from '@/lib/crypto';
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
          workspace: { select: { deletedAt: true, suspendedAt: true } },
        },
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  // A key is only as live as its owner and tenant. Suspending a user or a
  // workspace must not leave a machine credential working.
  if (apiKey.user && (apiKey.user.deletedAt || apiKey.user.suspendedAt)) {
    return null;
  }

  if (apiKey.website) {
    if (apiKey.website.deletedAt) {
      return null;
    }

    if (
      apiKey.website.workspace &&
      (apiKey.website.workspace.deletedAt || apiKey.website.workspace.suspendedAt)
    ) {
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
