import { beforeEach, describe, expect, test, vi } from 'vitest';

const queryRaw = vi.fn();
const executeRaw = vi.fn();
const findUsagePeriod = vi.fn();
const findWorkspace = vi.fn();
const transaction = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
      usagePeriod: {
        findUnique: findUsagePeriod,
      },
      workspace: {
        findUnique: findWorkspace,
      },
    },
    transaction,
  },
}));

const {
  EVENT_GRACE,
  createUsageMeter,
  getUsagePeriodRange,
  getUsageStatus,
  isBillableEvent,
  reserveEventUsage,
  reserveReplaySession,
} = await import('./usage');

function mockTx(overrides: Record<string, any> = {}) {
  const tx = {
    usagePeriod: {
      upsert: vi.fn().mockResolvedValue({ id: 'period-1', replaySessionsCount: 4 }),
      updateMany: vi.fn(),
      ...overrides.usagePeriod,
    },
    usageReplaySession: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'replay-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      ...overrides.usageReplaySession,
    },
    $executeRaw: overrides.executeRaw ?? vi.fn().mockResolvedValue(1),
  };

  transaction.mockImplementation(async fn => fn(tx));

  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usage periods', () => {
  test('uses UTC calendar months', () => {
    const { periodStart, periodEnd } = getUsagePeriodRange(new Date('2026-11-30T23:59:59Z'));

    expect(periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(periodEnd.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});

describe('usage status', () => {
  test('warns at 80 percent, enters grace at 100 percent, and pauses at the hard limit', () => {
    expect(getUsageStatus(799, 1000)).toBe('ok');
    expect(getUsageStatus(800, 1000)).toBe('warning');
    expect(getUsageStatus(1000, 1000, 500)).toBe('grace');
    expect(getUsageStatus(1499, 1000, 500)).toBe('grace');
    expect(getUsageStatus(1500, 1000, 500)).toBe('limit');
  });

  test('a zero allowance is paused as soon as anything is used', () => {
    expect(getUsageStatus(0, 0)).toBe('ok');
    expect(getUsageStatus(1, 0)).toBe('limit');
  });

  test('builds a display meter with a hard limit and clamped percentage', () => {
    const meter = createUsageMeter(500, 1000, 100);

    expect(meter).toMatchObject({
      used: 500,
      limit: 1000,
      grace: 100,
      hardLimit: 1100,
      remaining: 500,
      percent: 50,
      status: 'ok',
      included: true,
    });
    expect(createUsageMeter(1200, 1000, 100).percent).toBe(100);
    expect(createUsageMeter(0, 0).included).toBe(false);
  });

  test('only pageviews, custom events, link clicks, and pixel events are billable', () => {
    expect([1, 2, 3, 4].every(isBillableEvent)).toBe(true);
    expect(isBillableEvent(5)).toBe(false);
    expect(isBillableEvent(0)).toBe(false);
  });
});

describe('event reservation', () => {
  test('increments atomically and reports the new count', async () => {
    queryRaw.mockResolvedValue([{ events_count: 41 }]);

    await expect(reserveEventUsage('ws-1', 50_000)).resolves.toEqual({
      allowed: true,
      used: 41,
      limit: 50_000,
      hardLimit: 50_000 + EVENT_GRACE,
    });
  });

  test('rejects once the hard limit is reached without inserting a row', async () => {
    queryRaw.mockResolvedValue([]);
    findUsagePeriod.mockResolvedValue({ eventsCount: 51_000 });

    await expect(reserveEventUsage('ws-1', 50_000)).resolves.toEqual({
      allowed: false,
      used: 51_000,
      limit: 50_000,
      hardLimit: 50_000 + EVENT_GRACE,
    });
  });

  test('a plan with no event allowance rejects before touching the database', async () => {
    await expect(reserveEventUsage('ws-1', 0)).resolves.toMatchObject({ allowed: false });
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe('replay reservation', () => {
  test('meters a new session once', async () => {
    const tx = mockTx();

    await expect(
      reserveReplaySession({
        workspaceId: 'ws-1',
        websiteId: 'site-1',
        sessionId: 'session-1',
        limit: 2000,
      }),
    ).resolves.toMatchObject({ allowed: true, metered: true, used: 5 });

    expect(tx.usageReplaySession.create).toHaveBeenCalledTimes(1);
  });

  test('does not meter the same session twice', async () => {
    const tx = mockTx({
      usageReplaySession: {
        findUnique: vi.fn().mockResolvedValue({ id: 'existing' }),
      },
    });

    await expect(
      reserveReplaySession({
        workspaceId: 'ws-1',
        websiteId: 'site-1',
        sessionId: 'session-1',
        limit: 2000,
      }),
    ).resolves.toMatchObject({ allowed: true, metered: false });

    expect(tx.usageReplaySession.create).not.toHaveBeenCalled();
  });

  test('pauses new replay sessions at the hard limit', async () => {
    const tx = mockTx({
      executeRaw: vi.fn().mockResolvedValue(0),
    });

    await expect(
      reserveReplaySession({
        workspaceId: 'ws-1',
        websiteId: 'site-1',
        sessionId: 'session-1',
        limit: 2000,
        grace: 0,
      }),
    ).resolves.toMatchObject({ allowed: false, metered: false });

    expect(tx.usageReplaySession.create).not.toHaveBeenCalled();
  });
});
