import { expect, test } from 'vitest';
import { sanitizeAuthReturnUrl, withWebsiteReturnUrl } from './auth-return-url';

test('keeps same-origin app and onboarding return URLs', () => {
  expect(sanitizeAuthReturnUrl('/app/revenue')).toBe('/app/revenue');
  expect(sanitizeAuthReturnUrl('/onboarding')).toBe('/onboarding');
  expect(sanitizeAuthReturnUrl('/onboarding?website=acme.com')).toBe(
    '/onboarding?website=acme.com',
  );
  expect(sanitizeAuthReturnUrl('/checkout?plan=pro&interval=annual&tier=3')).toBe(
    '/checkout?plan=pro&interval=annual&tier=3',
  );
});

test('rejects external, protocol-relative, and unrelated return URLs', () => {
  expect(sanitizeAuthReturnUrl('https://evil.example/phish')).toBe('/app');
  expect(sanitizeAuthReturnUrl('//evil.example/phish')).toBe('/app');
  expect(sanitizeAuthReturnUrl('/\\evil.example/phish')).toBe('/app');
  expect(sanitizeAuthReturnUrl('/pricing')).toBe('/app');
  expect(sanitizeAuthReturnUrl(undefined)).toBe('/app');
});

test('carries the landing-page website into onboarding only', () => {
  expect(withWebsiteReturnUrl('/onboarding', 'https://ariyaman.in/path')).toBe(
    '/onboarding?website=https%3A%2F%2Fariyaman.in%2Fpath',
  );
  expect(withWebsiteReturnUrl('/onboarding', '  ariyaman.in  ')).toBe(
    '/onboarding?website=ariyaman.in',
  );
  expect(withWebsiteReturnUrl('/app/revenue', 'ariyaman.in')).toBe('/app/revenue');
  expect(withWebsiteReturnUrl('/onboarding', '')).toBe('/onboarding');
});
