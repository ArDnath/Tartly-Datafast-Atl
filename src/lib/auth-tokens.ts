import crypto from 'node:crypto';
import { hash, uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

/**
 * Single-use, expiring email tokens for verification and password reset.
 *
 * Only hashes are stored; the plaintext token exists in the email link and in
 * memory long enough to send it. Consumption and the state change it unlocks
 * happen in one transaction so a token cannot be replayed.
 */

export const EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60;
export const PASSWORD_RESET_TTL_MINUTES = 60;

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string) {
  return hash(token);
}

export async function issueEmailVerificationToken(userId: string): Promise<IssuedToken> {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);
  const tokenHash = hashOpaqueToken(token);

  await prisma.transaction(async tx => {
    await tx.emailVerificationToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await tx.emailVerificationToken.create({
      data: {
        id: uuid(),
        userId,
        tokenHash,
        expiresAt,
      },
    });
  });

  return { token, expiresAt };
}

export async function consumeEmailVerificationToken(token: string): Promise<boolean> {
  const tokenHash = hashOpaqueToken(token);

  return (await prisma.transaction(async tx => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });

    if (!record || record.consumedAt || record.expiresAt.getTime() <= Date.now()) {
      return false;
    }

    const consumed = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    if (consumed.count !== 1) {
      return false;
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
      select: { id: true },
    });

    return true;
  })) as unknown as boolean;
}

export async function issuePasswordResetToken(userId: string): Promise<IssuedToken> {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  const tokenHash = hashOpaqueToken(token);

  await prisma.transaction(async tx => {
    await tx.passwordResetToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await tx.passwordResetToken.create({
      data: {
        id: uuid(),
        userId,
        tokenHash,
        expiresAt,
      },
    });
  });

  return { token, expiresAt };
}

/**
 * Consume a reset token and replace the password in one transaction. Returns
 * the user ID so the caller can revoke sessions, or null when the token is
 * unknown, expired, or already used.
 */
export async function resetPasswordWithToken(
  token: string,
  passwordHash: string,
): Promise<string | null> {
  const tokenHash = hashOpaqueToken(token);

  return (await prisma.transaction(async tx => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });

    if (!record || record.consumedAt || record.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    if (consumed.count !== 1) {
      return null;
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
      select: { id: true },
    });

    return record.userId;
  })) as unknown as string | null;
}

export async function cleanupExpiredAuthTokens() {
  const now = new Date();

  await prisma.client.$transaction([
    prisma.client.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.client.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
}
