import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { AlternativePage } from '@/features/marketing/alternatives/AlternativesPage';
import { getAlternative } from '@/features/marketing/alternatives/alternatives-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getAlternative(slug);

  if (!item) {
    return { title: `Compare | ${BRAND.name}` };
  }

  return {
    title: `${BRAND.name} vs ${item.name}`,
    description: `${item.summary} Source-dated price and feature comparison.`,
  };
}

export default async function ({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getAlternative(slug);

  if (!item) {
    notFound();
  }

  return <AlternativePage slug={item.slug} />;
}
