import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { LandingPage } from '@/features/marketing/LandingPage';
import { BRAND } from '@/lib/brand';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export default function HomePage() {
  return <LandingPage className={dmSans.className} />;
}

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
};
