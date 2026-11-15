import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  // Never return the session token, bearer token, or cached auth key. The
  // HttpOnly cookie is the credential; a response body must not undo that.
  const response = await json({ user: auth.user });
  response.headers.set('Cache-Control', 'no-store');

  return response;
}
