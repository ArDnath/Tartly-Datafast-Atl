import { normalizeUsername } from '@/lib/auth-user';
import prisma from '@/lib/prisma';

/**
 * Legacy per-website membership read used only for websites created before the
 * workspace migration. Every workspace-owned website is authorized through
 * `workspace_membership`, and the per-website member UI/API has been retired.
 */
const websiteMember = () => (prisma.client as any).websiteMember;

export async function getWebsiteMemberForUser(
  websiteId: string,
  user: { id: string; username?: string | null },
) {
  const username = normalizeUsername(user.username);
  const member = await websiteMember().findFirst({
    where: {
      websiteId,
      OR: [{ userId: user.id }, ...(username ? [{ username }] : [])],
    },
  });

  if (member && !member.userId) {
    return websiteMember().update({
      where: {
        id: member.id,
      },
      data: {
        userId: user.id,
      },
    });
  }

  return member;
}
