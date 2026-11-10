import type { Metadata } from 'next';
import { LandingPage } from '@/features/marketing/landing/LandingPage';
import { BRAND } from '@/lib/brand';
import '@/features/marketing/landing/landing.css';

export default function HomePage() {
  return <LandingPage />;
}

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
};
