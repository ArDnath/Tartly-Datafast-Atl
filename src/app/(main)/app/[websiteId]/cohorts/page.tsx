import type { Metadata } from 'next';
import { CohortsPage } from '@/app/(main)/websites/[websiteId]/cohorts/CohortsPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <CohortsPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Cohorts',
};
