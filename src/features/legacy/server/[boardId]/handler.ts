import { legacyFeatureDisabled } from '@/features/legacy/lib/legacy-features';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewBoard } from '@/features/legacy/lib/permissions';
import { getBoard } from '@/queries/prisma/board';

export async function GET(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { boardId } = await params;

  if (!(await canViewBoard(auth, boardId))) {
    return unauthorized();
  }

  const board = await getBoard(boardId);

  return json(board);
}

export async function POST() {
  return legacyFeatureDisabled('Boards');
}

export async function DELETE() {
  return legacyFeatureDisabled('Boards');
}
