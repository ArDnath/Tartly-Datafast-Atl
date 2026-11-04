import { z } from 'zod';
import { isAppConfigurationError } from '@/lib/app-config';
import { createAuthResponse, normalizeUsername } from '@/lib/auth-user';
import { assertAppSecret } from '@/lib/crypto';
import { isSameOriginRequest } from '@/lib/csrf';
import { getIpAddress } from '@/lib/ip';
import { checkPassword } from '@/lib/password';
import {
  consumeRateLimit,
  hashRateLimitSubject,
  rateLimitKey,
} from '@/lib/rate-limit';
import { parseRequest } from '@/lib/request';
import { appConfigurationError, forbidden, json, tooManyRequests, unauthorized } from '@/lib/response';
import { getUserByUsername } from '@/queries/prisma';

const schema = z.object({
  username: z.string().trim().min(1).max(255).regex(/^\S+$/),
  password: z.string().min(1).max(72),
});

const IP_LIMIT = { limit: 30, windowSeconds: 15 * 60 };
const ACCOUNT_LIMIT = { limit: 10, windowSeconds: 15 * 60 };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return forbidden({ code: 'csrf-rejected', message: 'Cross-site request rejected.' });
  }

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  try {
    assertAppSecret();
  } catch (cause) {
    if (isAppConfigurationError(cause)) {
      return appConfigurationError();
    }

    throw cause;
  }

  const username = normalizeUsername(body.username);
  const ip = getIpAddress(request.headers) || 'unknown';

  const [ipLimit, accountLimit] = await Promise.all([
    consumeRateLimit({
      key: rateLimitKey('login:ip', hashRateLimitSubject(ip)),
      ...IP_LIMIT,
    }),
    consumeRateLimit({
      key: rateLimitKey('login:account', hashRateLimitSubject(username || 'unknown')),
      ...ACCOUNT_LIMIT,
    }),
  ]);

  if (!ipLimit.allowed || !accountLimit.allowed) {
    return tooManyRequests(
      {
        message: 'Too many sign-in attempts. Try again later.',
      },
      Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds),
    );
  }

  const user = username ? await getUserByUsername(username, { includePassword: true }) : null;

  if (!user?.password || !checkPassword(body.password, user.password)) {
    return unauthorized({
      code: 'invalid-credentials',
      message: 'Invalid credentials',
    });
  }

  const auth = await createAuthResponse(user, request);
  const response = await json({ user: auth.user });

  if (auth.sessionCookie) {
    response.headers.set('Set-Cookie', auth.sessionCookie);
  }

  return response;
}
