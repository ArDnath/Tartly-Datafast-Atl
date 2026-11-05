import { afterEach, expect, test, vi } from 'vitest';
import { isPlatformAdmin } from './platform-admin';

afterEach(() => {
  vi.unstubAllEnvs();
});

const admin = { id: 'user-1', username: 'owner@example.com', role: 'admin' };

test('a workspace owner is not a platform admin', () => {
  expect(isPlatformAdmin({ ...admin, role: 'user' })).toBe(false);
});

test('an allowlisted legacy admin is a platform admin', () => {
  vi.stubEnv('PLATFORM_ADMIN_EMAILS', 'someone@example.com, OWNER@example.com');

  expect(isPlatformAdmin(admin)).toBe(true);
});

test('a legacy admin outside the allowlist is rejected', () => {
  vi.stubEnv('PLATFORM_ADMIN_EMAILS', 'someone@example.com');

  expect(isPlatformAdmin(admin)).toBe(false);
});

test('production fails closed when no allowlist is configured', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('PLATFORM_ADMIN_EMAILS', '');

  expect(isPlatformAdmin(admin)).toBe(false);
});

test('development keeps the legacy admin usable', () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('PLATFORM_ADMIN_EMAILS', '');

  expect(isPlatformAdmin(admin)).toBe(true);
});
