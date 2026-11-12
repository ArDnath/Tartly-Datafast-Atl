import type { Metadata } from 'next';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

interface OnboardingPageProps {
  searchParams: Promise<{ website?: string | string[]; next?: string | string[] }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { website, next } = await searchParams;
  const initialWebsite = typeof website === 'string' ? website : undefined;
  const nextPath = typeof next === 'string' ? next : undefined;

  return <OnboardingFlow initialWebsite={initialWebsite} nextPath={nextPath} />;
}

export const metadata: Metadata = {
  title: 'Set up tracking',
  robots: {
    index: false,
    follow: false,
  },
};
