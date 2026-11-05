import { z } from 'zod';
import { uuid } from '@/lib/crypto';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import {
  createWorkspaceForUser,
  getUserWorkspaces,
  slugifyWorkspaceName,
} from '@/lib/workspace-auth';
import prisma from '@/lib/prisma';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  return json(await getUserWorkspaces(auth.user.id));
}

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, createSchema);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return unauthorized();
  }

  // Until platform billing exists, a second owned workspace would create a
  // second Starter allowance without a subscription. Owners can join other
  // workspaces by invitation; self-service ownership limits land with billing.
  const owned = await prisma.client.workspace.count({
    where: { ownerId: auth.user.id, deletedAt: null },
  });

  if (owned > 0) {
    return badRequest({
      code: 'workspace-limit',
      message: 'You already have a workspace. Join another by invitation.',
    });
  }

  const slug = body.slug || `${slugifyWorkspaceName(body.name)}-${uuid().slice(0, 8)}`;

  const existing = await prisma.client.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    return badRequest({ message: 'That workspace URL is already taken.' });
  }

  const workspace = await createWorkspaceForUser({
    userId: auth.user.id,
    name: body.name,
    slug,
  });

  return json({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    planId: workspace.planId,
    subscriptionStatus: workspace.subscriptionStatus,
    role: 'OWNER',
  });
}
