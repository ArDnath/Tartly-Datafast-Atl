import crypto from 'node:crypto';
import { SESSION_TTL_SECONDS } from '@/lib/auth-cookie';
import { hash, uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

/**
 * Durable, server-side sessions.
 *
 * Only a SHA-512 hash of the random session token is stored. A database leak
 * therefore does not hand out live sessions. Revoking a row invalidates the
 * cookie immediately, and password changes revoke every session for the user.
 */

export { SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth-cookie';

const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string) {
  return hash(token);
}

export interface CreatedAuthSession {
  id: string;
  token: string;
  expiresAt: Date;
}

export interface AuthSessionRequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

export async function createAuthSession(
  userId: string,
  context: AuthSessionRequestContext = {},
): Promise<CreatedAuthSession> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const id = uuid();

  await prisma.client.authSession.create({
    data: {
      id,
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      ipHash: context.ip ? hash(context.ip) : null,
      userAgent: context.userAgent?.slice(0, 500) || null,
    },
  });

  return { id, token, expiresAt };
}

export interface ResolvedAuthSession {
  id: string;
  userId: string;
}

/**
 * Return the session that owns this token, or null when it is expired or
 * revoked. Never throws for an unknown token.
 */
export async function resolveAuthSession(token: string): Promise<ResolvedAuthSession | null> {
  if (!token) {
    return null;
  }

  const session = await prisma.client.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (
    !session.lastUsedAt ||
    Date.now() - session.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS
  ) {
    await prisma.client.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
      select: { id: true },
    });
  }

  return { id: session.id, userId: session.userId };
}

export async function revokeAuthSession(token: string) {
  if (!token) {
    return;
  }

  await prisma.client.authSession.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAuthSessionById(sessionId: string) {
  await prisma.client.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke every live session for a user. Used after a password change/reset and
 * account deletion. Pass `exceptToken` to keep the current device signed in.
 */
export async function revokeAllAuthSessions(userId: string, exceptToken?: string) {
  await prisma.client.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptToken ? { tokenHash: { not: hashSessionToken(exceptToken) } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function cleanupExpiredAuthSessions() {
  await prisma.client.authSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}
