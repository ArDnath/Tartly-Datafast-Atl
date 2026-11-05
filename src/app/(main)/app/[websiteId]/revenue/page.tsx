import type { Metadata } from 'next';
import { RevenuePage } from '@/app/(main)/websites/[websiteId]/(reports)/revenue/RevenuePage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <RevenuePage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Revenue',
};
