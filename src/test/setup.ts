import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetTestNavigation } from './navigation';

configure({ testIdAttribute: 'data-test' });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    readText: vi.fn(),
    writeText: vi.fn(),
  },
});

window.scrollTo = vi.fn();

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds: readonly number[] = [];

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

window.ResizeObserver = ResizeObserver;
window.IntersectionObserver = IntersectionObserverMock;

afterEach(() => {
  cleanup();
  resetTestNavigation();
  vi.restoreAllMocks();
});
