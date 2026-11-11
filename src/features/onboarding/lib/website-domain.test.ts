import { expect, test } from 'vitest';
import { normalizeWebsiteDomain } from './website-domain';

test('normalizes a full URL to its hostname', () => {
  expect(normalizeWebsiteDomain('https://ariyaman.in')).toBe('ariyaman.in');
  expect(normalizeWebsiteDomain('http://ariyaman.in/pricing?from=landing')).toBe('ariyaman.in');
});

test('trims and lowercases a bare domain', () => {
  expect(normalizeWebsiteDomain('  ARIYAMAN.IN  ')).toBe('ariyaman.in');
});

test('leaves an empty value empty', () => {
  expect(normalizeWebsiteDomain('')).toBe('');
});
