import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  session: null as { id: string; userId: string } | null,
  onboardingRequired: false,
}));

vi.mock('@/lib/auth-cookie', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth-cookie')>('@/lib/auth-cookie');

  return { ...actual, getSessionTokenFromRequest: () => 'session-token' };
});

vi.mock('@/lib/auth-session', () => ({
  resolveAuthSession: vi.fn(async () => authState.session),
}));

vi.mock('@/features/auth/server/post-signin', () => ({
  isOnboardingRequired: vi.fn(async () => authState.onboardingRequired),
}));

const { GET } = await import('./handler');

beforeEach(() => {
  vi.stubEnv('APP_URL', 'https://tartly.test');
  authState.session = null;
  authState.onboardingRequired = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('sends a signed-out signup to login with the website in onboarding', async () => {
  const response = await GET(
    new Request('https://tartly.test/signup?website=https%3A%2F%2Fariyaman.in'),
  );
  const location = new URL(response.headers.get('location') ?? '');
  const returnUrl = location.searchParams.get('returnUrl');

  expect(response.status).toBe(307);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(location.origin).toBe('https://tartly.test');
  expect(location.pathname).toBe('/login');
  expect(returnUrl).toBe('/onboarding?website=https%3A%2F%2Fariyaman.in');
});

test('defaults signed-out signup to onboarding', async () => {
  const response = await GET(new Request('https://tartly.test/signup'));
  const location = new URL(response.headers.get('location') ?? '');

  expect(location.pathname).toBe('/login');
  expect(location.searchParams.get('returnUrl')).toBe('/onboarding');
});

test('skips the provider round trip for a signed-in unfinished customer', async () => {
  authState.session = { id: 'session-1', userId: 'user-1' };
  authState.onboardingRequired = true;

  const response = await GET(new Request('https://tartly.test/signup?website=acme.com'));
  const location = new URL(response.headers.get('location') ?? '');

  expect(location.pathname).toBe('/onboarding');
  expect(location.searchParams.get('website')).toBe('acme.com');
});

test('sends a signed-in customer with a new website to the add-website flow', async () => {
  authState.session = { id: 'session-1', userId: 'user-1' };

  const response = await GET(new Request('https://tartly.test/signup?website=new.example.com'));
  const location = new URL(response.headers.get('location') ?? '');

  expect(location.pathname).toBe('/app/new');
  expect(location.searchParams.get('website')).toBe('new.example.com');
});

test('does not forward an external return URL', async () => {
  const response = await GET(
    new Request('https://tartly.test/signup?returnUrl=https%3A%2F%2Fevil.example'),
  );
  const location = new URL(response.headers.get('location') ?? '');

  expect(location.pathname).toBe('/login');
  expect(location.searchParams.get('returnUrl')).toBe('/app');
});
