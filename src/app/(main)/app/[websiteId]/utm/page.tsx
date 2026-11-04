import type { Metadata } from 'next';
import { UTMPage } from '@/app/(main)/websites/[websiteId]/(reports)/utm/UTMPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <UTMPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'UTM',
};
