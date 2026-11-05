import type { Metadata } from 'next';
import { WebsitePage } from '@/features/websites/workbench/WebsitePage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <WebsitePage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Overview',
};
