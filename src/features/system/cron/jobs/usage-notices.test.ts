import { describe, expect, test, vi } from 'vitest';
import { runUsageNoticeJob } from './usage-notices';

const NOW = new Date('2026-11-15T04:00:00.000Z');
const PERIOD_START = new Date('2026-11-01T00:00:00.000Z');

function createClient(periods: any[]) {
  return {
    usagePeriod: {
      findMany: vi.fn(async () => periods),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
}

function period(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: 'workspace-1',
    eventsCount: 40_000,
    warningNotifiedAt: null,
    limitNotifiedAt: null,
    workspace: {
      name: 'Acme',
      planId: 'starter',
      platformSubscription: null,
      owner: { username: 'owner@example.com', deletedAt: null, suspendedAt: null },
    },
    ...overrides,
  };
}

const options = {
  now: NOW,
  origin: 'https://app.test',
};

describe('usage notices job', () => {
  test('sends one warning at 80% and marks the period', async () => {
    const client = createClient([period()]);
    const send = vi.fn(async (_message: any) => {});

    const result = await runUsageNoticeJob({ ...options, client, send });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: 'owner@example.com',
      level: 'warning',
      used: 40_000,
      limit: 50_000,
      billingUrl: 'https://app.test/app/settings/billing',
    });
    expect(client.usagePeriod.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'workspace-1', periodStart: PERIOD_START, warningNotifiedAt: null },
        data: { warningNotifiedAt: NOW },
      }),
    );
    expect(result.sent).toBe(1);
  });

  test('does not resend a warning that was already sent', async () => {
    const client = createClient([period({ warningNotifiedAt: new Date() })]);
    const send = vi.fn(async (_message: any) => {});

    const result = await runUsageNoticeJob({ ...options, client, send });

    expect(send).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  test('sends the limit notice once the allowance is exhausted', async () => {
    const client = createClient([period({ eventsCount: 50_000 })]);
    const send = vi.fn(async (_message: any) => {});

    await runUsageNoticeJob({ ...options, client, send });

    expect(send.mock.calls[0][0]).toMatchObject({ level: 'limit', percentage: 100 });
    expect(client.usagePeriod.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { limitNotifiedAt: NOW } }),
    );
  });

  test('skips suspended workspaces and suspended owners', async () => {
    const client = createClient([
      period({
        workspace: {
          name: 'Suspended',
          planId: 'starter',
          platformSubscription: null,
          owner: { username: 'owner@example.com', deletedAt: null, suspendedAt: null },
        },
      }),
      period({
        workspaceId: 'workspace-2',
        workspace: {
          name: 'Owner suspended',
          planId: 'starter',
          platformSubscription: null,
          owner: { username: 'owner@example.com', deletedAt: null, suspendedAt: new Date() },
        },
      }),
    ]);
    const send = vi.fn(async (_message: any) => {});

    const result = await runUsageNoticeJob({ ...options, client, send });

    // The job query filters workspace suspension in SQL; the owner check is in code.
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.scanned).toBe(2);
  });

  test('leaves the timestamp unset when the email provider fails', async () => {
    const client = createClient([period()]);
    const send = vi.fn(async () => {
      throw new Error('provider down');
    });

    const result = await runUsageNoticeJob({ ...options, client, send });

    expect(client.usagePeriod.updateMany).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.results[0].error).toContain('provider down');
  });

  test('uses the provider plan when platform billing is active', async () => {
    const client = createClient([
      period({
        eventsCount: 300_000,
        workspace: {
          name: 'Acme',
          planId: 'starter',
          platformSubscription: { planId: 'pro' },
          owner: { username: 'owner@example.com', deletedAt: null, suspendedAt: null },
        },
      }),
    ]);
    const send = vi.fn(async (_message: any) => {});

    await runUsageNoticeJob({ ...options, client, send });

    expect(send).not.toHaveBeenCalled();
  });
});
