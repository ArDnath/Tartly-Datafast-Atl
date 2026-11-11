import { normalizeUsername } from '@/lib/auth-user';
import prisma from '@/lib/prisma';
import {
  createPersonalAccount,
  RegistrationError,
  type RegisteredAccount,
} from '@/features/auth/server/registration';
import type { GoogleProfile } from './service';

const USER_SELECT = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  emailVerifiedAt: true,
} as const;

export class GoogleAccountError extends Error {
  code: 'account-unavailable';

  constructor(message = 'This account is not available.') {
    super(message);
    this.code = 'account-unavailable';
  }
}

/**
 * Resolve a Google identity to a local account.
 *
 * Order matters:
 * 1. A known Google subject wins, so renaming an email at Google does not
 *    detach the account.
 * 2. A verified Google email links to an existing password account with the
 *    same normalized email.
 * 3. Otherwise create the user, personal workspace, and OWNER membership.
 *
 * Deleted and suspended users are never revived or linked.
 */
export async function findOrCreateGoogleUser(profile: GoogleProfile) {
  const email = normalizeUsername(profile.email);

  const byGoogleId = await prisma.client.user.findFirst({
    where: {
      googleId: profile.subject,
      deletedAt: null,
      suspendedAt: null,
    },
    select: USER_SELECT,
  });

  if (byGoogleId) {
    return byGoogleId;
  }

  const existing = await prisma.client.user.findUnique({
    where: { username: email },
    select: {
      ...USER_SELECT,
      googleId: true,
      displayName: true,
      logoUrl: true,
      deletedAt: true,
      suspendedAt: true,
    },
  });

  if (existing) {
    if (existing.deletedAt || existing.suspendedAt) {
      throw new GoogleAccountError();
    }

    if (existing.googleId && existing.googleId !== profile.subject) {
      throw new GoogleAccountError();
    }

    return prisma.client.user.update({
      where: { id: existing.id },
      data: {
        googleId: profile.subject,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        displayName: existing.displayName ?? profile.name,
        logoUrl: existing.logoUrl ?? profile.picture,
      },
      select: USER_SELECT,
    });
  }

  try {
    const account = await createPersonalAccount({
      username: email,
      password: null,
      googleId: profile.subject,
      displayName: profile.name,
      emailVerifiedAt: new Date(),
    });

    return toGoogleUser(account);
  } catch (cause) {
    if (cause instanceof RegistrationError) {
      // Two first-time sign-ins can race between the lookup and the insert.
      // The unique constraints guarantee one winner; return that row.
      const raced = await prisma.client.user.findFirst({
        where: {
          OR: [{ googleId: profile.subject }, { username: email }],
          deletedAt: null,
          suspendedAt: null,
        },
        select: USER_SELECT,
      });

      if (raced) {
        return raced;
      }

      throw new GoogleAccountError();
    }

    throw cause;
  }
}

function toGoogleUser(account: RegisteredAccount) {
  return {
    ...account.user,
    emailVerifiedAt: new Date(),
  };
}
