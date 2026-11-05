import type { Metadata } from 'next';
import { SessionsPage } from '@/features/analytics/workbench/sessions/SessionsPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <SessionsPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Visitors',
};
