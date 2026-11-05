import { redirect } from 'next/navigation';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  redirect(`/app/${websiteId}/diagnostics`);
}
