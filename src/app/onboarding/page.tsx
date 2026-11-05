import type { Metadata } from 'next';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

export default function () {
  return <OnboardingFlow />;
}

export const metadata: Metadata = {
  title: 'Set up your workspace',
  robots: {
    index: false,
    follow: false,
  },
};
