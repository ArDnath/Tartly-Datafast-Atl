import type { Metadata } from 'next';
import { WebsiteLayoutRoute } from '@/features/analytics/workbench/WebsiteLayoutRoute';
import { BRAND } from '@/lib/brand';

export default async function ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  return <WebsiteLayoutRoute websiteId={websiteId}>{children}</WebsiteLayoutRoute>;
}

export const metadata: Metadata = {
  title: {
    template: `%s | ${BRAND.name}`,
    default: `Websites | ${BRAND.name}`,
  },
};
