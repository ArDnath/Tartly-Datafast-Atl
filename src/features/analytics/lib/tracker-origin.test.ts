import { describe, expect, test } from 'vitest';
import { isTrackerOriginAllowed, normalizeTrackerHost } from './tracker-origin';

describe('tracker origin enforcement', () => {
  test('normalizes host, origin, and domain inputs', () => {
    expect(normalizeTrackerHost('https://www.Acme.dev/path')).toBe('acme.dev');
    expect(normalizeTrackerHost('WWW.ACME.DEV:443')).toBe('acme.dev');
    expect(normalizeTrackerHost('acme.dev')).toBe('acme.dev');
    expect(normalizeTrackerHost('')).toBeNull();
  });

  test('allows everything when enforcement is off', () => {
    expect(
      isTrackerOriginAllowed({
        configuredDomain: 'acme.dev',
        hostname: 'evil.example',
        enforce: false,
      }),
    ).toBe(true);
  });

  test('allows the exact configured host and its subdomains', () => {
    expect(
      isTrackerOriginAllowed({ configuredDomain: 'acme.dev', hostname: 'acme.dev', enforce: true }),
    ).toBe(true);
    expect(
      isTrackerOriginAllowed({
        configuredDomain: 'www.acme.dev',
        hostname: 'app.acme.dev',
        enforce: true,
      }),
    ).toBe(true);
  });

  test('rejects an unrelated host when enforcement is on', () => {
    expect(
      isTrackerOriginAllowed({
        configuredDomain: 'acme.dev',
        hostname: 'evil.example',
        enforce: true,
      }),
    ).toBe(false);
  });

  test('checks the Origin header when the payload has no hostname', () => {
    expect(
      isTrackerOriginAllowed({
        configuredDomain: 'acme.dev',
        origin: 'https://app.acme.dev',
        enforce: true,
      }),
    ).toBe(true);
    expect(
      isTrackerOriginAllowed({
        configuredDomain: 'acme.dev',
        origin: 'https://evil.example',
        enforce: true,
      }),
    ).toBe(false);
  });

  test('does not block a server-side or legacy event without a host', () => {
    expect(
      isTrackerOriginAllowed({ configuredDomain: 'acme.dev', hostname: null, enforce: true }),
    ).toBe(true);
  });

  test('does not block when the website has no configured domain', () => {
    expect(
      isTrackerOriginAllowed({ configuredDomain: null, hostname: 'anything.dev', enforce: true }),
    ).toBe(true);
  });
});
