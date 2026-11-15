import { describe, expect, test } from 'vitest';
import { resolveStartDestination } from './handoff';

describe('resolveStartDestination', () => {
  test('sends a signed-out visitor to login and carries the website', () => {
    expect(
      resolveStartDestination({
        requestedReturnUrl: '/onboarding',
        website: 'https://ariyaman.in/path?q=1',
        hasSession: false,
        onboardingRequired: false,
      }),
    ).toBe(
      '/login?returnUrl=%2Fonboarding%3Fwebsite%3Dhttps%253A%252F%252Fariyaman.in%252Fpath%253Fq%253D1',
    );
  });

  test('defaults a signed-out visitor to onboarding', () => {
    expect(
      resolveStartDestination({
        hasSession: false,
        onboardingRequired: false,
      }),
    ).toBe('/login?returnUrl=%2Fonboarding');
  });

  test('keeps a signed-in unfinished customer in onboarding with the website', () => {
    expect(
      resolveStartDestination({
        requestedReturnUrl: '/onboarding',
        website: 'acme.com',
        hasSession: true,
        onboardingRequired: true,
      }),
    ).toBe('/onboarding?website=acme.com');
  });

  test('carries a checkout intent through first-run onboarding', () => {
    expect(
      resolveStartDestination({
        requestedReturnUrl: '/checkout?plan=pro&interval=annual&tier=3',
        hasSession: true,
        onboardingRequired: true,
      }),
    ).toBe('/onboarding?next=%2Fcheckout%3Fplan%3Dpro%26interval%3Dannual%26tier%3D3');
  });

  test('sends an existing customer with a website into the add-website flow', () => {
    expect(
      resolveStartDestination({
        requestedReturnUrl: '/onboarding',
        website: 'https://new.example.com/landing',
        hasSession: true,
        onboardingRequired: false,
      }),
    ).toBe('/app/new?website=https%3A%2F%2Fnew.example.com%2Flanding');
  });

  test('sends an existing customer without a website to the app', () => {
    expect(
      resolveStartDestination({
        hasSession: true,
        onboardingRequired: false,
      }),
    ).toBe('/app');
  });

  test('keeps a checkout intent for an existing customer', () => {
    expect(
      resolveStartDestination({
        requestedReturnUrl: '/checkout?plan=starter&interval=monthly&tier=3',
        hasSession: true,
        onboardingRequired: false,
      }),
    ).toBe('/checkout?plan=starter&interval=monthly&tier=3');
  });

  test('does not forward an external return URL', () => {
    expect(
      resolveStartDestination({
        requestedReturnUrl: 'https://evil.example/phish',
        hasSession: true,
        onboardingRequired: false,
      }),
    ).toBe('/app');
  });
});
