import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { LandingPage } from '@/features/marketing/LandingPage';

export default function HomePage() {
  return <LandingPage />;
}

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
};
