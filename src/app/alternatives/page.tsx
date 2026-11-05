import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { AlternativesIndexPage } from '@/features/marketing/alternatives/AlternativesPage';

export const metadata: Metadata = {
  title: `Compare ${BRAND.name} with other analytics tools`,
  description:
    'Source-dated comparisons with Plausible, Fathom, Umami, Simple Analytics, DataFast, and Talivia.',
};

export default function () {
  return <AlternativesIndexPage />;
}
