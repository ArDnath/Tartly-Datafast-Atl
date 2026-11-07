import type { Metadata } from 'next';
import { Domine } from 'next/font/google';
import { LandingPage } from '@/features/marketing/landing/LandingPage';
import { BRAND } from '@/lib/brand';
import '@/features/marketing/landing/landing.css';

const domine = Domine({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-domine-family',
});

export default function HomePage() {
  return (
    <div className={domine.variable}>
      <LandingPage />
    </div>
  );
}

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
};
