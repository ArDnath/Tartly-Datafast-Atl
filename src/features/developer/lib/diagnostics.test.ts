import { describe, expect, test } from 'vitest';
import { diagnoseInstallation, RECENT_EVENT_WINDOW_MS } from './diagnostics';

const NOW = new Date('2026-06-15T12:00:00.000Z');

const base = {
  websiteId: 'website-a',
  websiteDomain: 'example.com',
  apiKeyWebsiteId: 'website-a',
  eventCount: 12,
  lastEventAt: new Date(NOW.getTime() - 60_000),
  now: NOW,
};

describe('diagnoseInstallation', () => {
  test('reports a healthy installation', () => {
    const result = diagnoseInstallation(base);

    expect(result.ok).toBe(true);
    expect(result.checks.every(check => check.status === 'ok')).toBe(true);
  });

  test('fails when the key belongs to another website', () => {
    const result = diagnoseInstallation({ ...base, apiKeyWebsiteId: 'website-b' });

    expect(result.ok).toBe(false);
    expect(result.checks.find(check => check.id === 'api-key-scope')?.status).toBe('error');
  });

  test('fails when no event has arrived', () => {
    const result = diagnoseInstallation({ ...base, eventCount: 0, lastEventAt: null });

    expect(result.ok).toBe(false);
    expect(result.checks.find(check => check.id === 'events')?.status).toBe('error');
  });

  test('warns when the last event is stale', () => {
    const result = diagnoseInstallation({
      ...base,
      lastEventAt: new Date(NOW.getTime() - RECENT_EVENT_WINDOW_MS - 1),
    });

    expect(result.ok).toBe(true);
    expect(result.checks.find(check => check.id === 'recency')?.status).toBe('warning');
  });

  test('warns when no domain is configured', () => {
    const result = diagnoseInstallation({ ...base, websiteDomain: null });

    expect(result.ok).toBe(true);
    expect(result.checks.find(check => check.id === 'domain')?.status).toBe('warning');
  });

  test('never returns a fix for passing checks', () => {
    for (const check of diagnoseInstallation(base).checks) {
      expect(check.fix).toBeUndefined();
    }
  });
});
