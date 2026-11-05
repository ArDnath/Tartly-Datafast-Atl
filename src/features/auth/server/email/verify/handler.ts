import { z } from 'zod';
import { consumeEmailVerificationToken } from '@/lib/auth-tokens';
import { isSameOriginRequest } from '@/lib/csrf';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json } from '@/lib/response';

const schema = z.object({
  token: z.string().min(20).max(512),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return forbidden({ code: 'csrf-rejected', message: 'Cross-site request rejected.' });
  }

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const verified = await consumeEmailVerificationToken(body.token);

  if (!verified) {
    return badRequest({
      code: 'invalid-verification-token',
      message: 'This verification link is invalid or has expired.',
    });
  }

  return json({ verified: true });
}
