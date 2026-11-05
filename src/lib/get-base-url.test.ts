import { afterEach, expect, test, vi } from 'vitest';
import { getBaseUrl, getPublicOrigin } from './get-base-url';

function createHeaders(entries: Record<string, string>) {
  return {
    get(name: string) {
      return entries[name.toLowerCase()] ?? null;
    },
  };
}

test('prefers forwarded host and protocol', () => {
  const url = getBaseUrl(
    createHeaders({
      'x-forwarded-host': 'analytics.example.com',
      'x-forwarded-proto': 'https',
      host: 'localhost:3000',
    }),
  );

  expect(url.toString()).toBe('https://analytics.example.com/');
});

test('falls back to host header', () => {
  const url = getBaseUrl(
    createHeaders({
      host: 'analytics.example.com',
    }),
  );

  expect(url.toString()).toBe('https://analytics.example.com/');
});

test('uses http for localhost hosts', () => {
  const url = getBaseUrl(
    createHeaders({
      host: 'localhost:3000',
    }),
  );

  expect(url.toString()).toBe('http://localhost:3000/');
});

test('falls back to the local self-host origin when host is missing', () => {
  const url = getBaseUrl(createHeaders({}));

  expect(url.toString()).toBe('http://localhost:3000/');
});

test('uses the request origin when proxy headers are unavailable', () => {
  const request = new Request('https://analytics.example.com/api/connect');

  expect(getBaseUrl(request).toString()).toBe('https://analytics.example.com/');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('email links prefer APP_URL over a spoofed forwarded host', () => {
  vi.stubEnv('APP_URL', 'https://revenuelens.app');

  const request = new Request('https://internal.local/api/auth/password/forgot', {
    headers: { 'x-forwarded-host': 'evil.example' },
  });

  expect(getPublicOrigin(request)).toBe('https://revenuelens.app');
});

test('email links fall back to the request origin without APP_URL', () => {
  vi.stubEnv('APP_URL', '');

  expect(
    getPublicOrigin(new Request('http://localhost:3000/api/auth/password/forgot')),
  ).toBe('http://localhost:3000');
});
