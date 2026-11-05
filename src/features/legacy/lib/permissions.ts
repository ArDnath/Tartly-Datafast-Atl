import type { Auth } from '@/lib/types';
import { getBoard } from '@/queries/prisma/board';
import { getLink } from '@/queries/prisma/link';
import { getPixel } from '@/queries/prisma/pixel';
import { getTeamUser } from '@/queries/prisma';

/**
 * Read access for the frozen board/link/pixel features. These entities are
 * legacy-only and their write endpoints are disabled, so only the view checks
 * remain. Public shares are authorized before this module runs.
 */
export async function canViewBoard({ user }: Auth, boardId: string) {
  if (!user) {
    return false;
  }

  const board = await getBoard(boardId);

  if (!board) {
    return false;
  }

  if (board.userId) {
    return user.id === board.userId;
  }

  if (board.teamId) {
    const teamUser = await getTeamUser(board.teamId, user.id);

    return !!teamUser;
  }

  return false;
}

export async function canViewLink({ user, shareToken }: Auth, linkId: string) {
  if (shareToken?.linkId === linkId || shareToken?.websiteId === linkId) {
    return true;
  }

  if (!user) {
    return false;
  }

  const link = await getLink(linkId);

  if (link.userId) {
    return user.id === link.userId;
  }

  if (link.teamId) {
    const teamUser = await getTeamUser(link.teamId, user.id);

    return !!teamUser;
  }

  return false;
}

export async function canViewPixel({ user, shareToken }: Auth, pixelId: string) {
  if (shareToken?.pixelId === pixelId || shareToken?.websiteId === pixelId) {
    return true;
  }

  if (!user) {
    return false;
  }

  const pixel = await getPixel(pixelId);

  if (pixel.userId) {
    return user.id === pixel.userId;
  }

  if (pixel.teamId) {
    const teamUser = await getTeamUser(pixel.teamId, user.id);

    return !!teamUser;
  }

  return false;
}
