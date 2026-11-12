import { normalizeUsername } from '@/lib/auth-user';
import { ROLES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { hashPassword } from '@/lib/password';
import prisma from '@/lib/prisma';
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
}

export interface PersonalAccountInput {
  username: string;
  /** Present for password accounts. Google accounts store null. */
  password?: string | null;
  googleId?: string | null;
  displayName?: string | null;
  emailVerifiedAt?: Date | null;
}

/**
 * Create the account only.
 *
 * A workspace is deliberately NOT created here. New accounts finish signing
 * in first and then create their workspace inside `/onboarding`, where they
 * choose its name, photo, and the first website. This keeps the workspace
 * record tied to a real, user-confirmed action instead
 * of a placeholder name derived from the email.
 *
 * Invited users already have a membership by the time they sign in and are
 * routed straight to the app by `resolvePostSignInPath`.
 */
export async function createPersonalAccount({
  username,
  password = null,
  googleId = null,
  displayName = null,
  emailVerifiedAt = null,
}: PersonalAccountInput): Promise<RegisteredAccount> {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    throw new RegistrationError('invalid-username', 'An email address is required.');
  }

  try {
    const user = await prisma.client.user.create({
      data: {
        id: uuid(),
        username: normalized,
        password: password === null ? null : hashPassword(password),
        googleId,
        displayName: displayName?.slice(0, 255) || null,
        emailVerifiedAt,
        role: ROLES.user,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    return { user };
  } catch (cause: any) {
    if (cause?.code === 'P2002') {
      throw new RegistrationError('username-taken', 'An account with that email already exists.');
    }

    throw cause;
  }
}

export async function registerAccount({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<RegisteredAccount> {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    throw new RegistrationError('invalid-username', 'An email address is required.');
  }

  const existing = await getUserByUsername(normalized, { showDeleted: true });

  if (existing) {
    throw new RegistrationError('username-taken', 'An account with that email already exists.');
  }

  return createPersonalAccount({ username: normalized, password });
}
