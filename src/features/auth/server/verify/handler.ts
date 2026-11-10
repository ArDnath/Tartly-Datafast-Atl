import { isOnboardingRequired } from '@/features/auth/server/post-signin';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';

export async function POST(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return json(auth.user);
  }

  return json({
    ...auth.user,
    onboardingRequired: await isOnboardingRequired(auth.user.id),
  });
}
