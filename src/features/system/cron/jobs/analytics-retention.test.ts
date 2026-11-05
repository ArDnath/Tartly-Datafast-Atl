import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runAnalyticsRetentionJob } from './analytics-retention';

const NOW = new Date('2026-11-05T12:00:00.000Z');

const MODELS = [
  'sessionReplay',
  'sessionReplaySaved',
  'eventData',
  'sessionData',
  'paymentDetectionEvent',
  'paymentAttribution',
  'websiteEvent',
  'revenue',
  'payment',
  'subscription',
  'paymentMatch',
  'visitorIdentityLink',
  'visitor',
  'session',
] as const;

function createClient(websites: any[]) {
  const client: any = {
    website: {
      findMany: vi.fn(async () => websites),
    },
    session: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
      count: vi.fn(async () => 1),
    },
  };

  for (const model of MODELS) {
    client[model] ??= {};
    client[model].deleteMany = vi.fn(async () => ({ count: 1 }));
    client[model].updateMany = vi.fn(async () => ({ count: 1 }));
    client[model].count = vi.fn(async () => 1);
  }

  return client;
}

const starterWebsite = {
  id: 'site-starter',
  workspace: { planId: 'starter', platformSubscription: null },
};

const proWebsite = {
  id: 'site-pro',
  workspace: { planId: 'starter', platformSubscription: { planId: 'pro' } },
};

describe('analytics retention job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('uses the plan retention window and scopes every mutation to one website', async () => {
    const client = createClient([starterWebsite, proWebsite]);
    const transaction = vi.fn(async <T>(fn: (tx: any) => Promise<T>) => fn(client));

    await runAnalyticsRetentionJob({
      client,
      transaction: transaction as any,
      now: NOW,
      dryRun: false,
    });

    expect(transaction).toHaveBeenCalledTimes(2);

    const starterCutoff = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);
    const proCutoff = new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000);
    const proReplayCutoff = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);

    expect(client.websiteEvent.deleteMany).toHaveBeenCalledWith({
      where: { websiteId: 'site-starter', createdAt: { lt: starterCutoff } },
    });
    expect(client.websiteEvent.deleteMany).toHaveBeenCalledWith({
      where: { websiteId: 'site-pro', createdAt: { lt: proCutoff } },
    });
    expect(client.sessionReplay.deleteMany).toHaveBeenCalledWith({
      where: { websiteId: 'site-pro', createdAt: { lt: proReplayCutoff } },
    });
    expect(client.session.deleteMany).toHaveBeenCalledWith({
      where: { websiteId: 'site-starter', createdAt: { lt: starterCutoff } },
    });
  });

  test('a plan without replay entitlement purges every replay row for that website', async () => {
    const client = createClient([starterWebsite]);

    await runAnalyticsRetentionJob({
      client,
      transaction: async fn => fn(client),
      now: NOW,
      dryRun: false,
    });

    expect(client.sessionReplay.deleteMany).toHaveBeenCalledWith({
      where: { websiteId: 'site-starter' },
    });
    expect(client.sessionReplaySaved.deleteMany).toHaveBeenCalledWith({
      where: { websiteId: 'site-starter' },
    });
  });

  test('dry run counts payload rows without deleting or detaching anything', async () => {
    const client = createClient([starterWebsite, proWebsite, { id: 'site-null', workspace: null }]);

    const result = await runAnalyticsRetentionJob({
      client,
      transaction: vi.fn(),
      now: NOW,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.websites).toBe(3);
    expect(result.results.every(row => row.dryRun)).toBe(true);
    expect(client.sessionReplay.deleteMany).not.toHaveBeenCalled();
    expect(client.websiteEvent.deleteMany).not.toHaveBeenCalled();
    expect(client.payment.updateMany).not.toHaveBeenCalled();
    expect(client.websiteEvent.count).toHaveBeenCalledTimes(3);
  });

  test('only runs for the requested website ids and is idempotent on a second pass', async () => {
    const client = createClient([starterWebsite]);

    await runAnalyticsRetentionJob({
      client,
      transaction: async fn => fn(client),
      now: NOW,
      dryRun: false,
      websiteIds: ['site-starter'],
    });
    await runAnalyticsRetentionJob({
      client,
      transaction: async fn => fn(client),
      now: NOW,
      dryRun: false,
      websiteIds: ['site-starter'],
    });

    expect(client.website.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['site-starter'] } }),
      }),
    );
    expect(client.websiteEvent.deleteMany).toHaveBeenCalledTimes(2);
    expect(client.websiteEvent.deleteMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ websiteId: 'site-starter' }),
      }),
    );
    expect(client.websiteEvent.deleteMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ websiteId: 'site-starter' }),
      }),
    );
  });

  test('never mutates a row without a website boundary', async () => {
    const client = createClient([starterWebsite]);

    await runAnalyticsRetentionJob({
      client,
      transaction: async fn => fn(client),
      now: NOW,
      dryRun: false,
    });

    for (const model of MODELS) {
      for (const call of client[model].deleteMany.mock.calls) {
        expect(call[0]?.where?.websiteId).toBe('site-starter');
      }
      for (const call of client[model].updateMany.mock.calls) {
        expect(call[0]?.where?.websiteId).toBe('site-starter');
      }
    }
  });
});
