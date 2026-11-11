import { expect, test } from 'vitest';
import { getStepIndex, resolveOnboardingStep } from './steps';

test('starts a new customer at the website step', () => {
  expect(
    resolveOnboardingStep({
      hasWorkspace: false,
      hasWebsite: false,
      hasPaymentConnection: false,
    }),
  ).toBe('website');
});

test('resumes an abandoned flow at the tracker step', () => {
  expect(
    resolveOnboardingStep({
      hasWorkspace: true,
      onboardingCompletedAt: null,
      hasWebsite: true,
      hasPaymentConnection: false,
    }),
  ).toBe('tracker');
});

test('resumes at revenue when a provider is already connected', () => {
  expect(
    resolveOnboardingStep({
      hasWorkspace: true,
      onboardingCompletedAt: null,
      hasWebsite: true,
      hasPaymentConnection: true,
    }),
  ).toBe('payments');
});

test('sends a completed workspace to the dashboard', () => {
  expect(
    resolveOnboardingStep({
      hasWorkspace: true,
      onboardingCompletedAt: '2026-11-09T10:00:00.000Z',
      hasWebsite: true,
      hasPaymentConnection: true,
    }),
  ).toBe('complete');
});

test('exposes a stable step order for the progress bar', () => {
  expect(['website', 'tracker', 'payments'].map(step => getStepIndex(step as any))).toEqual([
    0, 1, 2,
  ]);
});
