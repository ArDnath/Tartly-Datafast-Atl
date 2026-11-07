import { normalizeUsername } from '@/lib/auth-user';
import { ROLES } from '@/lib/constants';
import { hash, uuid } from '@/lib/crypto';
import { hashPassword } from '@/lib/password';
import prisma from '@/lib/prisma';
import { slugifyWorkspaceName } from '@/lib/workspace-auth';
import { getUserByUsername } from '@/queries/prisma';

export class RegistrationError extends Error {
  code: 'username-taken' | 'invalid-username';

  constructor(code: RegistrationError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

export interface RegisteredAccount {
  user: {
    id: string;
    username: string;
    role: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Create the account, its personal workspace, OWNER membership, and initial
 * plan selection in one transaction. A failure at any point leaves no orphan
 * user or workspace behind.
 *
 * Plan status is `incomplete` until platform billing confirms a subscription
 * (Phase 5). The workspace starts its 7-day free trial: trial limits apply and
 * paid entitlements do not.
 */
export async function registerAccount({
  username,
  password,
  workspaceName,
  planId = 'starter',
}: {
  username: string;
  password: string;
  workspaceName?: string;
  planId?: string;
}): Promise<RegisteredAccount> {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    throw new RegistrationError('invalid-username', 'An email address is required.');
  }

  const existing = await getUserByUsername(normalized, { showDeleted: true });

  if (existing) {
    throw new RegistrationError('username-taken', 'An account with that email already exists.');
  }

  const userId = uuid();
  const name = workspaceName?.trim() || `${normalized.split('@')[0]}'s workspace`;
  const slug = `${slugifyWorkspaceName(name)}-${hash(normalized).slice(0, 8)}`;

  let account: unknown;

  try {
    account = await prisma.transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          username: normalized,
          password: hashPassword(password),
          role: ROLES.user,
        },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          id: uuid(),
          name: name.slice(0, 100),
          slug,
          ownerId: user.id,
          planId,
          subscriptionStatus: 'incomplete',
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      await tx.workspaceMembership.create({
        data: {
          id: uuid(),
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { user, workspace };
    });
  } catch (cause: any) {
    if (cause?.code === 'P2002') {
      throw new RegistrationError('username-taken', 'An account with that email already exists.');
    }

    throw cause;
  }

  return account as RegisteredAccount;
}
