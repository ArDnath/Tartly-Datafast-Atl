import type { Metadata } from 'next';
import { FunnelsPage } from '@/features/analytics/workbench/reports/funnels/FunnelsPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <FunnelsPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Funnels',
};
