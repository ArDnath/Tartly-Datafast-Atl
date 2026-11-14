import { expect, test, vi } from 'vitest';
import { getShareExpiry, isShareLinkActive, SHARE_LINK_TTL_DAYS } from './share-policy';

vi.mock('@/lib/prisma', () => ({ default: { client: {} } }));

test('a share link expires after the documented window', () => {
  const now = new Date('2026-11-15T00:00:00.000Z');
  const expiry = getShareExpiry(now);

  expect(expiry.getTime() - now.getTime()).toBe(SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
  expect(isShareLinkActive({ expiresAt: expiry }, now)).toBe(true);
});

test('an expired or missing expiry is not active', () => {
  const now = new Date('2026-11-15T00:00:00.000Z');

  expect(isShareLinkActive({ expiresAt: new Date('2026-11-14T23:59:59.000Z') }, now)).toBe(false);
  expect(isShareLinkActive({ expiresAt: null }, now)).toBe(false);
});
