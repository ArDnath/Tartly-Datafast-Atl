import type { Metadata } from 'next';
import { RetentionPage } from '@/app/(main)/websites/[websiteId]/(reports)/retention/RetentionPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <RetentionPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Retention',
};
