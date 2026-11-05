import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { notFound } from 'next/navigation';
import { WebsiteLayout } from '@/features/analytics/workbench/WebsiteLayout';
import { isWebsiteId } from '@/lib/app-route';
import { getWebsite } from '@/queries/prisma';

export default async function ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  if (!isWebsiteId(websiteId)) {
    notFound();
  }

  const website = await getWebsite(websiteId);

  if (!website || website.deletedAt) {
    notFound();
  }

  return <WebsiteLayout websiteId={websiteId}>{children}</WebsiteLayout>;
}

export const metadata: Metadata = {
  title: {
    template: `%s | ${BRAND.name}`,
    default: `Websites | ${BRAND.name}`,
  },
};
