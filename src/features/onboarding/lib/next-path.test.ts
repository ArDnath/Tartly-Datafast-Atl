import { expect, test } from 'vitest';
import { sanitizeOnboardingNextPath } from './next-path';

test('allows app and checkout destinations across onboarding', () => {
  expect(sanitizeOnboardingNextPath('/checkout?plan=pro&tier=3')).toBe('/checkout?plan=pro&tier=3');
  expect(sanitizeOnboardingNextPath('/app/revenue?range=7day')).toBe('/app/revenue?range=7day');
});

test('rejects external, protocol-relative, and unrelated next paths', () => {
  expect(sanitizeOnboardingNextPath('https://evil.example/phish')).toBeNull();
  expect(sanitizeOnboardingNextPath('//evil.example/phish')).toBeNull();
  expect(sanitizeOnboardingNextPath('/\\evil.example/phish')).toBeNull();
  expect(sanitizeOnboardingNextPath('/pricing')).toBeNull();
  expect(sanitizeOnboardingNextPath(undefined)).toBeNull();
});
