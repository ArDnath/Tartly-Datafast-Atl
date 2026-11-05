import type { Metadata } from 'next';
import { EventsPage } from '@/app/(main)/websites/[websiteId]/events/EventsPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <EventsPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Events',
};
