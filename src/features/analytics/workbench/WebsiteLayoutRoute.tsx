import { notFound } from 'next/navigation';
import { isWebsiteId } from '@/lib/app-route';
import { getWebsite } from '@/queries/prisma';
import { WebsiteLayout } from './WebsiteLayout';

/**
 * Resolves the website shell for a route. Keeping this outside the router
 * keeps the layout file a thin mount point and makes the lookup testable.
 */
export async function WebsiteLayoutRoute({
  websiteId,
  children,
}: {
  websiteId: string;
  children: React.ReactNode;
}) {
  if (!isWebsiteId(websiteId)) {
    notFound();
  }

  const website = await getWebsite(websiteId);

  if (!website || website.deletedAt) {
    notFound();
  }

  return <WebsiteLayout websiteId={websiteId}>{children}</WebsiteLayout>;
}
