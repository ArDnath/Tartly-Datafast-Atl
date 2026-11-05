import type { Metadata } from 'next';
import { LegalIndexPage } from '@/features/marketing/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Privacy, terms, cookie, DPA, subprocessor, and acceptable-use drafts.',
};

export default function () {
  return <LegalIndexPage />;
}
