import { z } from 'zod';
import { clearSessionCookie } from '@/lib/auth-cookie';
import { revokeAllAuthSessions } from '@/lib/auth-session';
import { resetPasswordWithToken } from '@/lib/auth-tokens';
import { isSameOriginRequest } from '@/lib/csrf';
import { getIpAddress } from '@/lib/ip';
import { hashPassword } from '@/lib/password';
import { consumeRateLimit, hashRateLimitSubject, rateLimitKey } from '@/lib/rate-limit';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, ok, tooManyRequests } from '@/lib/response';

const schema = z.object({
  token: z.string().min(20).max(512),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return forbidden({ code: 'csrf-rejected', message: 'Cross-site request rejected.' });
  }

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const ip = getIpAddress(request.headers) || 'unknown';
  const limit = await consumeRateLimit({
    key: rateLimitKey('password-reset:ip', hashRateLimitSubject(ip)),
    limit: 10,
    windowSeconds: 60 * 60,
  });

  if (!limit.allowed) {
    return tooManyRequests(
      { message: 'Too many reset attempts. Try again later.' },
      limit.retryAfterSeconds,
    );
  }

  const userId = await resetPasswordWithToken(body.token, hashPassword(body.password));

  if (!userId) {
    return badRequest({
      code: 'invalid-reset-token',
      message: 'This reset link is invalid or has expired.',
    });
  }

  await revokeAllAuthSessions(userId);

  const response = ok();
  response.headers.set('Set-Cookie', clearSessionCookie());

  return response;
}
