import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsPage } from '@/features/docs/DocsPage';
import { getRevenueGuide } from '@/features/docs/content';

export default async function ({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getRevenueGuide(slug);

  if (!guide) {
    notFound();
  }

  return <DocsPage guide={guide} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getRevenueGuide(slug);

  if (!guide) {
    return { title: 'Not found' };
  }

  return {
    title: `${guide.title} revenue guide`,
    description: guide.summary,
  };
}
