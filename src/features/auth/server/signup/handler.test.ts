import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GET } from './handler';

beforeEach(() => {
  vi.stubEnv('APP_URL', 'https://tartly.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('sends signup straight to Google with the website in onboarding', () => {
  const response = GET(
    new Request('https://tartly.test/signup?website=https%3A%2F%2Fariyaman.in&trial=1'),
  );
  const location = new URL(response.headers.get('location') ?? '');

  expect(response.status).toBe(307);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(location.origin).toBe('https://tartly.test');
  expect(location.pathname).toBe('/api/auth/google');
  expect(location.searchParams.get('returnUrl')).toBe(
    '/onboarding?website=https%3A%2F%2Fariyaman.in',
  );
});

test('defaults signup to onboarding when no website is provided', () => {
  const response = GET(new Request('https://tartly.test/signup?trial=1'));
  const location = new URL(response.headers.get('location') ?? '');

  expect(location.pathname).toBe('/api/auth/google');
  expect(location.searchParams.get('returnUrl')).toBe('/onboarding');
});

test('does not forward an external return URL', () => {
  const response = GET(
    new Request('https://tartly.test/signup?returnUrl=https%3A%2F%2Fevil.example'),
  );
  const location = new URL(response.headers.get('location') ?? '');

  expect(location.searchParams.get('returnUrl')).toBe('/app');
});
