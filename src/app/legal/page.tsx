import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { LegalIndexPage } from '@/features/marketing/legal/LegalPage';

export const metadata: Metadata = {
  title: `Legal | ${BRAND.name}`,
  description: 'Privacy, terms, cookie, DPA, subprocessor, and acceptable-use drafts.',
};

export default function () {
  return <LegalIndexPage />;
}
