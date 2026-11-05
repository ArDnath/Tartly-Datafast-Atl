import type { Metadata } from 'next';
import { DocsPage } from '@/features/docs/DocsPage';
import { DOCS_HOME } from '@/features/docs/content';

export default function () {
  return <DocsPage />;
}

export const metadata: Metadata = {
  title: 'Documentation',
  description: DOCS_HOME.summary,
};
