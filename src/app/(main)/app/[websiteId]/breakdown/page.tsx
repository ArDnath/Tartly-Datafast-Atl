import type { Metadata } from 'next';
import { BreakdownPage } from '@/features/websites/workbench/reports/breakdown/BreakdownPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <BreakdownPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Breakdown',
};
