import { issueEmailVerificationToken } from '@/lib/auth-tokens';
import { sendEmailVerificationEmail } from '@/lib/email';
import { getPublicOrigin } from '@/lib/get-base-url';
import { consumeRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { parseRequest } from '@/lib/request';
import { json, tooManyRequests, unauthorized } from '@/lib/response';

export async function POST(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth.user?.id) {
    return unauthorized();
  }

  if (auth.user.emailVerifiedAt) {
    return json({ sent: false, alreadyVerified: true });
  }

  const limit = await consumeRateLimit({
    key: rateLimitKey('email-verify:resend', auth.user.id),
    limit: 3,
    windowSeconds: 60 * 60,
  });

  if (!limit.allowed) {
    return tooManyRequests(
      { message: 'Too many verification emails. Try again later.' },
      limit.retryAfterSeconds,
    );
  }

  const verification = await issueEmailVerificationToken(auth.user.id);
  const baseUrl = getPublicOrigin(request);

  await sendEmailVerificationEmail({
    to: auth.user.username,
    verifyUrl: `${baseUrl}/verify-email?token=${encodeURIComponent(verification.token)}`,
    expiresAt: verification.expiresAt,
  });

  return json({ sent: true, expiresAt: verification.expiresAt });
}
