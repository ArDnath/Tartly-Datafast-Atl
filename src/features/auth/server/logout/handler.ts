import { checkAuth } from '@/lib/auth';
import { clearSessionCookie, getSessionTokenFromRequest } from '@/lib/auth-cookie';
import { revokeAuthSession } from '@/lib/auth-session';
import redis from '@/lib/redis';
import { ok } from '@/lib/response';

/**
 * Logout is idempotent: it revokes the current cookie session when present,
 * clears the cookie, and also drops a legacy Redis-backed API session.
 */
export async function POST(request: Request) {
  const sessionToken = getSessionTokenFromRequest(request);

  if (sessionToken) {
    await revokeAuthSession(sessionToken);
  }

  const auth = await checkAuth(request).catch(() => null);

  if (redis.enabled && auth?.authKey) {
    await redis.client.del(auth.authKey);
  }

  const response = ok();
  response.headers.set('Set-Cookie', clearSessionCookie());

  return response;
}
