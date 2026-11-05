import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/features/marketing/legal/LegalPage';
import { getLegalDocument } from '@/features/marketing/legal/legal-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) {
    return { title: 'Legal' };
  }

  return {
    title: document.title,
    description: document.summary,
  };
}

export default async function ({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) {
    notFound();
  }

  return <LegalPage document={document} />;
}
