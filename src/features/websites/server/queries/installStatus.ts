import prisma from '@/lib/prisma';

export interface WebsiteInstallStatus {
  id: string;
  name: string;
  domain: string | null;
  connected: boolean;
}

/**
 * One workspace-scoped query for the install reminder. The webs details come
 * from the indexed workspace lookup; the event check uses an EXISTS against
 * the website-event index, so it stops at the first event instead of counting
 * a potentially large history.
 */
export async function getWebsiteInstallStatus(
  workspaceId: string,
): Promise<WebsiteInstallStatus[]> {
  const websites = await prisma.client.website.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      domain: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (websites.length === 0) {
    return [];
  }

  const rows = (await prisma.rawQuery(
    `
    select w.website_id as "websiteId"
    from website w
    where w.workspace_id = {{workspaceId::uuid}}
      and w.deleted_at is null
      and exists (
        select 1
        from website_event e
        where e.website_id = w.website_id
      )
    `,
    { workspaceId },
  )) as { websiteId: string }[];
  const connected = new Set(rows.map(row => row.websiteId));

  return websites.map(website => ({
    ...website,
    connected: connected.has(website.id),
  }));
}
