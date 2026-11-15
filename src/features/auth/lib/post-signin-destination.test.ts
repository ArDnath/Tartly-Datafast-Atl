import { describe, expect, test } from 'vitest';
import { resolveClientPostSignInPath } from './post-signin-destination';

describe('resolveClientPostSignInPath', () => {
  test('preserves a checkout intent for a new account', () => {
    expect(resolveClientPostSignInPath('/checkout?plan=pro&interval=monthly&tier=3', true)).toBe(
      '/onboarding?next=%2Fcheckout%3Fplan%3Dpro%26interval%3Dmonthly%26tier%3D3',
    );
  });

  test('defaults onboarding for a new account with no intent', () => {
    expect(resolveClientPostSignInPath('/app', true)).toBe('/onboarding');
    expect(resolveClientPostSignInPath(null, true)).toBe('/onboarding');
  });

  test('keeps the website when onboarding is required', () => {
    expect(resolveClientPostSignInPath('/onboarding?website=acme.com', true)).toBe(
      '/onboarding?website=acme.com',
    );
  });

  test('sends an existing customer with a website to the add-website flow', () => {
    expect(resolveClientPostSignInPath('/onboarding?website=acme.com', false)).toBe(
      '/app/new?website=acme.com',
    );
  });

  test('sends an existing customer to the requested app route', () => {
    expect(resolveClientPostSignInPath('/app/revenue', false)).toBe('/app/revenue');
  });

  test('rejects an external return URL', () => {
    expect(resolveClientPostSignInPath('https://evil.example/phish', false)).toBe('/app');
  });
});
