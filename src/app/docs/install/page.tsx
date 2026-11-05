import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { DocsPage } from '@/features/docs/DocsPage';

export default function () {
  return <DocsPage install />;
}

export const metadata: Metadata = {
  title: 'Tracker install guides',
  description: `Install the ${BRAND.name} tracker in Next.js, React, Vite, plain HTML, Astro, or Remix.`,
};
