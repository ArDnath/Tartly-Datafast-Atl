import { expect, test } from 'vitest';
import { DOMAIN_REGEX } from './constants';

test('accepts hostnames, ports, and localhost', () => {
  for (const value of [
    'example.com',
    'sub.example.co.uk',
    'my-site.example',
    'xn--bcher-kva.example',
    'a_b.example.com',
    'localhost',
    'localhost:3000',
  ]) {
    expect(DOMAIN_REGEX.test(value), value).toBe(true);
  }
});

test('rejects schemes, empty labels, spaces, and trailing dots', () => {
  for (const value of [
    '',
    'example',
    'https://example.com',
    'example..com',
    '.example.com',
    'example.com.',
    'exa mple.com',
  ]) {
    expect(DOMAIN_REGEX.test(value), value).toBe(false);
  }
});

test('does not backtrack exponentially on long hyphen runs', () => {
  const hostile = `${'a-'.repeat(5000)}.`;
  const started = Date.now();

  expect(DOMAIN_REGEX.test(hostile)).toBe(false);
  expect(Date.now() - started).toBeLessThan(1000);
});
