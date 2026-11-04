import { z } from 'zod';
import { isAppConfigurationError } from '@/lib/app-config';
import { createAuthResponse } from '@/lib/auth-user';
import { assertAppSecret } from '@/lib/crypto';
import { RegistrationError, registerAccount } from '@/lib/registration';
import { parseRequest } from '@/lib/request';
import { appConfigurationError, badRequest, json } from '@/lib/response';

const schema = z.object({
  username: z.email().max(255),
  password: z.string().min(8).max(72),
  workspaceName: z.string().trim().min(1).max(100).optional(),
});

export async function POST(request: Request) {
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

  try {
    const account = await registerAccount(body);

    return json(await createAuthResponse(account.user));
  } catch (cause) {
    if (cause instanceof RegistrationError) {
      return badRequest({ code: cause.code, message: cause.message });
    }

    throw cause;
  }
}
