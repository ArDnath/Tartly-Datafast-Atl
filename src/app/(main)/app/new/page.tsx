import type { Metadata } from 'next';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

/**
 * Adding a website is the first-run setup flow again, not a second wizard.
 * The route stays inside the signed-in shell so the existing session, workspace
 * and billing guards still apply; the flow itself renders the same full-height
 * canvas and step components as /onboarding.
 */
export default function Page() {
  return <OnboardingFlow mode="add-website" />;
}

export const metadata: Metadata = {
  title: 'Add website',
};
