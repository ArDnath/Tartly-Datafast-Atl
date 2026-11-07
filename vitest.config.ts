import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Component tests import CSS modules. Next resolves string plugin names in
  // postcss.config.js, but Vite does not, so skip that config in tests.
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // UI interaction tests run slower under full parallel load; the default
    // 5s and then 15s produced flaky timeouts without any assertion failure.
    testTimeout: 30000,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    env: {
      TZ: 'UTC',
      APP_SECRET: 'vitest-only-secret-that-is-at-least-32-bytes',
      DATABASE_URL: 'postgresql://talivia:talivia@localhost:5432/talivia_test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      // These floors sit just below the verified 2026-11-07 baseline
      // (statements 67.6, branches 55.6, functions 63.4, lines 68.0).
      // They exist to stop coverage regressions, not to claim completeness.
      thresholds: {
        statements: 65,
        branches: 50,
        functions: 60,
        lines: 65,
      },
    },
  },
});
