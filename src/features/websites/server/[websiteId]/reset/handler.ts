import { parseRequest } from '@/lib/request';
import { ok, unauthorized } from '@/lib/response';
import { canDeleteWebsite } from '@/permissions';
import { resetWebsite } from '@/queries/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canDeleteWebsite(auth, websiteId))) {
    return unauthorized();
  }

  await resetWebsite(websiteId);

  return ok();
}
