import type { Metadata } from 'next';
import { ReplaysPage } from '@/features/analytics/workbench/replays/ReplaysPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <ReplaysPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Session replay',
};
