export const ONBOARDING_STEPS = ['website', 'tracker', 'payments'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingResumeState {
  hasWorkspace: boolean;
  onboardingCompletedAt?: string | Date | null;
  hasWebsite: boolean;
  hasPaymentConnection: boolean;
}

/**
 * Pick the step a returning customer should see. A completed workspace goes
 * straight to the dashboard; an abandoned flow resumes at the earliest step
 * that still has no result.
 */
export function resolveOnboardingStep({
  hasWorkspace,
  onboardingCompletedAt,
  hasWebsite,
  hasPaymentConnection,
}: OnboardingResumeState): OnboardingStep | 'complete' {
  if (!hasWorkspace || !hasWebsite) {
    return 'website';
  }

  if (onboardingCompletedAt) {
    return 'complete';
  }

  return hasPaymentConnection ? 'payments' : 'tracker';
}

export function getStepIndex(step: OnboardingStep) {
  return ONBOARDING_STEPS.indexOf(step);
}
