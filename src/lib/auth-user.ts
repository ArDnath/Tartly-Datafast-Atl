import { serializeSessionCookie } from '@/lib/auth-cookie';
import { createAuthSession } from '@/lib/auth-session';
import { ROLES } from '@/lib/constants';
import { getIpAddress } from '@/lib/ip';
import { isPlatformAdmin } from '@/lib/platform-admin';

export function normalizeUsername(value?: string | null) {
  return value?.trim().toLowerCase();
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    role: string;
    createdAt?: Date;
    emailVerifiedAt?: Date | null;
    isAdmin: boolean;
    isPlatformAdmin?: boolean;
  };
  /** Set-Cookie value for the HttpOnly session cookie. */
  sessionCookie: string;
  expiresAt: Date;
}

/**
 * Create the durable browser session and the cookie that carries it.
 *
 * The raw token is never placed in the response body: JavaScript cannot read
 * it, and login responses contain only the public user record.
 */
export async function createAuthResponse(
  user: {
    id: string;
    username: string;
    role: string;
    createdAt?: Date;
    emailVerifiedAt?: Date | null;
  },
  request: Request,
): Promise<AuthResponse> {
  const session = await createAuthSession(user.id, {
    ip: getIpAddress(request.headers),
    userAgent: request.headers.get('user-agent'),
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      isAdmin: user.role === ROLES.admin,
      isPlatformAdmin: isPlatformAdmin(user),
    },
    sessionCookie: serializeSessionCookie(session.token, session.expiresAt),
    expiresAt: session.expiresAt,
  };
}
