import { beforeEach, expect, test, vi } from 'vitest';
import clickhouse from '@/lib/clickhouse';
import { deleteClickHousePayloads, deleteClickHouseWebsiteData } from './clickhouse-retention';

vi.mock('@/lib/clickhouse', () => ({
  default: {
    enabled: true,
    connect: vi.fn(),
    getUTCString: vi.fn(() => '2026-01-01 00:00:00'),
  },
}));

const client = { command: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clickhouse.connect).mockResolvedValue(client as any);
});

test('retention deletes every payload table with the plan cutoff and is tenant-scoped', async () => {
  const cutoff = new Date('2026-01-01T00:00:00.000Z');

  await deleteClickHousePayloads({
    websiteId: '11111111-1111-4111-8111-111111111111',
    eventCutoff: cutoff,
    replayCutoff: cutoff,
  });

  expect(client.command).toHaveBeenCalledTimes(6);

  for (const call of client.command.mock.calls) {
    expect(call[0].query).toContain('website_id = {websiteId:UUID}');
    expect(call[0].query).toContain('created_at < {cutoff:DateTime}');
    expect(call[0].query_params.websiteId).toBe('11111111-1111-4111-8111-111111111111');
  }
});

test('deletes rebuild projections instead of failing on website_event', async () => {
  // Production runs ClickHouse 25.3 with two materialized projections on
  // website_event and the server default lightweight_mutation_projection_mode
  // = throw. A lightweight DELETE fails with code 344 and no ClickHouse payload
  // is ever deleted, so objections are removed with a synchronous mutation.
  await deleteClickHousePayloads({
    websiteId: '11111111-1111-4111-8111-111111111111',
    eventCutoff: new Date('2026-01-01T00:00:00.000Z'),
    replayCutoff: new Date('2026-01-01T00:00:00.000Z'),
  });

  for (const call of client.command.mock.calls) {
    expect(call[0].query).toMatch(/^ALTER TABLE talivia\./);
    expect(call[0].query).toContain('DELETE WHERE website_id = {websiteId:UUID}');
    expect(call[0].clickhouse_settings).toEqual({ mutations_sync: 1 });
  }
});

test('a plan without replay deletes all replay rows for the tenant', async () => {
  await deleteClickHousePayloads({
    websiteId: '11111111-1111-4111-8111-111111111111',
    eventCutoff: new Date('2026-01-01T00:00:00.000Z'),
    replayCutoff: null,
  });

  const replayCall = client.command.mock.calls.at(-1)[0];
  expect(replayCall.query).toContain('talivia.session_replay');
  expect(replayCall.query).not.toContain('created_at <');
});

test('website deletion removes all payload rows for one tenant', async () => {
  await deleteClickHouseWebsiteData('11111111-1111-4111-8111-111111111111');

  expect(client.command).toHaveBeenCalledTimes(6);

  for (const call of client.command.mock.calls) {
    expect(call[0].query).not.toContain('created_at <');
    expect(call[0].query_params.websiteId).toBe('11111111-1111-4111-8111-111111111111');
  }
});

test('does nothing when ClickHouse is not configured', async () => {
  vi.mocked(clickhouse).enabled = false;

  const result = await deleteClickHousePayloads({
    websiteId: '11111111-1111-4111-8111-111111111111',
    eventCutoff: new Date(),
    replayCutoff: null,
  });

  expect(result).toEqual({ enabled: false, tables: 0 });
  expect(client.command).not.toHaveBeenCalled();
});
