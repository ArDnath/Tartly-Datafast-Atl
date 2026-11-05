import type { Metadata } from 'next';
import { ComparePage } from '@/features/analytics/workbench/compare/ComparePage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <ComparePage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Compare',
};
