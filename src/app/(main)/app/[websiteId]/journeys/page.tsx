import type { Metadata } from 'next';
import { JourneysPage } from '@/features/websites/workbench/reports/journeys/JourneysPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <JourneysPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Journeys',
};
