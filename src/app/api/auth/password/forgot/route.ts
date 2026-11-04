import { z } from 'zod';
import { issuePasswordResetToken } from '@/lib/auth-tokens';
import { isSameOriginRequest } from '@/lib/csrf';
import { sendPasswordResetEmail } from '@/lib/email';
import { getPublicOrigin } from '@/lib/get-base-url';
import { getIpAddress } from '@/lib/ip';
import { consumeRateLimit, hashRateLimitSubject, rateLimitKey } from '@/lib/rate-limit';
import { parseRequest } from '@/lib/request';
import { forbidden, json, tooManyRequests } from '@/lib/response';
import { getUserByUsername } from '@/queries/prisma';

const schema = z.object({
  email: z.email().max(255),
});

const IP_LIMIT = { limit: 5, windowSeconds: 60 * 60 };
const EMAIL_LIMIT = { limit: 3, windowSeconds: 60 * 60 };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return forbidden({ code: 'csrf-rejected', message: 'Cross-site request rejected.' });
  }

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const email = body.email.trim().toLowerCase();
  const ip = getIpAddress(request.headers) || 'unknown';

  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit({
      key: rateLimitKey('password-forgot:ip', hashRateLimitSubject(ip)),
      ...IP_LIMIT,
    }),
    consumeRateLimit({
      key: rateLimitKey('password-forgot:email', hashRateLimitSubject(email)),
      ...EMAIL_LIMIT,
    }),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    return tooManyRequests(
      { message: 'Too many reset requests. Try again later.' },
      Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds),
    );
  }

  const user = await getUserByUsername(email);

  // Always return the same response so this endpoint cannot be used to
  // discover which addresses have accounts.
  if (user?.id && !user.deletedAt) {
    try {
      const reset = await issuePasswordResetToken(user.id);
      const baseUrl = getPublicOrigin(request);

      await sendPasswordResetEmail({
        to: user.username,
        resetUrl: `${baseUrl}/reset-password?token=${encodeURIComponent(reset.token)}`,
        expiresAt: reset.expiresAt,
      });
    } catch {
      // Provider failure must not change the response.
    }
  }

  return json({ sent: true });
}
