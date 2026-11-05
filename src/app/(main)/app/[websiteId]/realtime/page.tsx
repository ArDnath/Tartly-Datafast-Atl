import type { Metadata } from 'next';
import { RealtimePage } from '@/features/analytics/workbench/realtime/RealtimePage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <RealtimePage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Realtime',
};
