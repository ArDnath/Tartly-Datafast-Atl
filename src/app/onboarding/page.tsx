import type { Metadata } from 'next';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

interface OnboardingPageProps {
  searchParams: Promise<{ website?: string | string[] }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { website } = await searchParams;
  const initialWebsite = typeof website === 'string' ? website : undefined;

  return <OnboardingFlow initialWebsite={initialWebsite} />;
}

export const metadata: Metadata = {
  title: 'Set up tracking',
  robots: {
    index: false,
    follow: false,
  },
};
