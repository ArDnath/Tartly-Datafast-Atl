import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Phase 7 integration smoke config.
 *
 * The database URL is intentionally separate from the unit-test config so a
 * normal `pnpm test` never touches a real database. CI leaves the smoke test
 * skipped; a human runs it after `pnpm update-db`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: [],
    include: ['src/**/phase7-analytics-smoke.test.ts'],
    testTimeout: 120_000,
    env: {
      TZ: 'UTC',
      APP_SECRET: 'vitest-only-secret-that-is-at-least-32-bytes',
      DATABASE_URL:
        process.env.PHASE7_DATABASE_URL ||
        'postgresql://talivia:talivia@localhost:5433/talivia_oss',
    },
  },
});
