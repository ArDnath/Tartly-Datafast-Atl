import { parseRequest } from '@/lib/request';
import { forbidden, json } from '@/lib/response';
import { getActivationFunnel } from '@/features/account/server/queries/activation';

/**
 * Platform-admin activation funnel. This is not a tenant endpoint: a workspace
 * OWNER/ADMIN never gets access just because they lead a workspace.
 */
export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth.user?.isPlatformAdmin) {
    return forbidden();
  }

  return json(await getActivationFunnel());
}
