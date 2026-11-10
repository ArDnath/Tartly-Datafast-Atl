import { z } from 'zod';
import { isAppConfigurationError } from '@/lib/app-config';
import { issueEmailVerificationToken } from '@/lib/auth-tokens';
import { createAuthResponse } from '@/lib/auth-user';
import { assertAppSecret } from '@/lib/crypto';
import { isSameOriginRequest } from '@/lib/csrf';
import { sendEmailVerificationEmail } from '@/lib/email';
import { getPublicOrigin } from '@/lib/get-base-url';
import { getIpAddress } from '@/lib/ip';
import { consumeRateLimit, hashRateLimitSubject, rateLimitKey } from '@/lib/rate-limit';
import { RegistrationError, registerAccount } from '@/features/auth/server/registration';
import { isDisposableEmail } from '@/features/auth/lib/disposable-email';
import { parseRequest } from '@/lib/request';
import {
  appConfigurationError,
  badRequest,
  forbidden,
  json,
  tooManyRequests,
} from '@/lib/response';

const schema = z.object({
  username: z.email().max(255),
  password: z.string().min(8).max(72),
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

  try {
    assertAppSecret();
  } catch (cause) {
    if (isAppConfigurationError(cause)) {
      return appConfigurationError();
    }

    throw cause;
  }

  const ip = getIpAddress(request.headers) || 'unknown';
  const email = body.username.trim().toLowerCase();

  if (isDisposableEmail(email)) {
    return badRequest({
      code: 'disposable-email',
      message: 'Use a permanent email address. Disposable inboxes cannot receive account mail.',
    });
  }

  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit({
      key: rateLimitKey('register:ip', hashRateLimitSubject(ip)),
      ...IP_LIMIT,
    }),
    consumeRateLimit({
      key: rateLimitKey('register:email', hashRateLimitSubject(email)),
      ...EMAIL_LIMIT,
    }),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    return tooManyRequests(
      { message: 'Too many sign-up attempts. Try again later.' },
      Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds),
    );
  }

  try {
    const account = await registerAccount(body);
    const auth = await createAuthResponse(account.user, request);

    // Email verification is best-effort during account creation: the account
    // and session are already valid, and a provider outage must not strand the
    // user. The resend endpoint is authenticated and rate limited.
    try {
      const verification = await issueEmailVerificationToken(account.user.id);
      const baseUrl = getPublicOrigin(request);

      await sendEmailVerificationEmail({
        to: account.user.username,
        verifyUrl: `${baseUrl}/verify-email?token=${encodeURIComponent(verification.token)}`,
        expiresAt: verification.expiresAt,
      });
    } catch {
      // Never fail signup because the email provider is unavailable.
    }

    const response = await json({ user: auth.user });

    if (auth.sessionCookie) {
      response.headers.set('Set-Cookie', auth.sessionCookie);
    }

    return response;
  } catch (cause) {
    if (cause instanceof RegistrationError) {
      return badRequest({ code: cause.code, message: cause.message });
    }

    throw cause;
  }
}
