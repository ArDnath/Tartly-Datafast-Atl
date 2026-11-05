import { expect, test } from 'vitest';
import { runPhase7AnalyticsSmoke } from './phase7-smoke';

test.skipIf(process.env.RUN_PHASE7_DB_SMOKE !== '1')(
  'inherited analytics metrics and retention pass against PostgreSQL',
  async () => {
    const result = await runPhase7AnalyticsSmoke();

    expect(result.assertions).toBeGreaterThanOrEqual(30);
    expect(result.remainingEvents).toBe(10);
  },
  120_000,
);
