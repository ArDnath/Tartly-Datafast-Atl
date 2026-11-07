import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('app store hydration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  test('starts from deterministic server-safe defaults', async () => {
    const { useApp } = await import('./app');
    const state = useApp.getState();

    expect(state.locale).toBe('en-US');
    expect(state.timezone).toBe('UTC');
    expect(state.dateRangeValue).toBe('24hour');
  });

  test('applies stored preferences only when hydrated', async () => {
    window.localStorage.setItem('talivia.locale', JSON.stringify('en-US'));
    window.localStorage.setItem('talivia.timezone', JSON.stringify('Asia/Bangkok'));
    window.localStorage.setItem('talivia.date-range', JSON.stringify('7day'));

    const { hydrateAppStore, useApp } = await import('./app');

    expect(useApp.getState().timezone).toBe('UTC');

    hydrateAppStore();

    expect(useApp.getState().locale).toBe('en-US');
    expect(useApp.getState().timezone).toBe('Asia/Bangkok');
    expect(useApp.getState().dateRangeValue).toBe('7day');
    expect(useApp.getState().localTimezone).toBeTruthy();
  });
});
