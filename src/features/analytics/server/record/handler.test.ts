import { beforeEach, expect, test, vi } from 'vitest';
import { parseCollectorCacheToken } from '@/features/analytics/lib/collector-cache';
import { getClientInfo, hasBlockedIp } from '@/features/analytics/lib/detect';
import { saveRecording } from '@/features/analytics/server/queries/sql';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { getPlan } from '@/lib/plans';
import { parseRequest } from '@/lib/request';
import { releaseReplaySession, reserveReplaySession } from '@/lib/usage';
import { getWebsite } from '@/queries/prisma';
import { POST } from './handler';

vi.mock('isbot', () => ({
  isbot: vi.fn(() => false),
}));

vi.mock('@/features/analytics/lib/collector-cache', () => ({
  parseCollectorCacheToken: vi.fn(),
}));

vi.mock('@/lib/crypto', () => ({
  secret: vi.fn(() => 'secret'),
}));

vi.mock('@/features/analytics/lib/detect', () => ({
  getClientInfo: vi.fn(),
  hasBlockedIp: vi.fn(() => false),
}));

vi.mock('@/lib/entitlements', () => ({
  getWorkspaceEntitlements: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/usage', () => ({
  reserveReplaySession: vi.fn(),
  releaseReplaySession: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  getWebsite: vi.fn(),
}));

vi.mock('@/features/analytics/server/queries/sql', () => ({
  saveRecording: vi.fn(),
}));

const websiteId = '5ca9c481-3222-48b6-8bfa-b13e9d8e9209';
const sessionId = '22222222-2222-4222-8222-222222222222';

function recordRequest(cache = 'collector-cache') {
  return new Request('https://collector.example/api/record', {
    method: 'POST',
    headers: cache ? { 'x-talivia-cache': cache } : {},
  });
}

function allowEntitlements(plan = getPlan('pro')) {
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    workspaceId: 'workspace-1',
    plan,
    planId: plan?.id ?? null,
    subscriptionStatus: 'active',
    active: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    body: {
      type: 'record',
      payload: {
        website: websiteId,
        timestamp: 1_700_000_000,
        events: [
          { type: 4, timestamp: 1_700_000_000_000, data: {} },
          { type: 2, timestamp: 1_700_000_001_000, data: {} },
        ],
      },
    },
  });
  vi.mocked(parseCollectorCacheToken).mockReturnValue({
    purpose: 'collector-cache',
    websiteId,
    visitorId: '11111111-1111-4111-8111-111111111111',
    sessionId,
  } as any);
  vi.mocked(getWebsite).mockResolvedValue({
    id: websiteId,
    workspaceId: 'workspace-1',
    replayEnabled: true,
  } as any);
  vi.mocked(getClientInfo).mockResolvedValue({
    ip: '203.0.113.1',
    userAgent: 'Mozilla/5.0 Chrome/126',
  } as any);
  vi.mocked(hasBlockedIp).mockReturnValue(false);
  allowEntitlements();
  vi.mocked(reserveReplaySession).mockResolvedValue({
    allowed: true,
    metered: true,
    used: 1,
    limit: 2_000,
    hardLimit: 2_100,
  });
  vi.mocked(saveRecording).mockResolvedValue(undefined as any);
});

test('Starter cannot record replay even when the website switch is on', async () => {
  allowEntitlements(getPlan('starter'));

  const response = await POST(recordRequest());
  const body = await response.json();

  expect(body).toEqual({ ok: false, reason: 'replay_not_in_plan' });
  expect(reserveReplaySession).not.toHaveBeenCalled();
  expect(saveRecording).not.toHaveBeenCalled();
});

test('a plan without replay entitlement is rejected before a usage slot is reserved', async () => {
  allowEntitlements(null);

  const response = await POST(recordRequest());

  expect(await response.json()).toEqual({ ok: false, reason: 'replay_not_in_plan' });
  expect(reserveReplaySession).not.toHaveBeenCalled();
});

test('a Pro workspace records one session and meters it separately from events', async () => {
  const response = await POST(recordRequest());

  expect(await response.json()).toEqual({ ok: true });
  expect(reserveReplaySession).toHaveBeenCalledWith({
    workspaceId: 'workspace-1',
    websiteId,
    sessionId,
    limit: 2_000,
  });
  expect(saveRecording).toHaveBeenCalledWith(
    expect.objectContaining({
      websiteId,
      sessionId,
      eventCount: 2,
      chunkIndex: 1_700_000_000,
    }),
  );
});

test('a replay session over the plan allowance is never written', async () => {
  vi.mocked(reserveReplaySession).mockResolvedValue({
    allowed: false,
    metered: false,
    used: 2_100,
    limit: 2_000,
    hardLimit: 2_100,
  });

  const response = await POST(recordRequest());

  expect(await response.json()).toEqual({
    ok: false,
    reason: 'usage_limit_reached',
    limit: 2_000,
    used: 2_100,
  });
  expect(saveRecording).not.toHaveBeenCalled();
});

test('a failed replay write releases the reserved session slot', async () => {
  vi.mocked(saveRecording).mockRejectedValue(new Error('database unavailable'));

  const response = await POST(recordRequest());

  expect(response.status).toBe(500);
  expect(releaseReplaySession).toHaveBeenCalledWith({
    workspaceId: 'workspace-1',
    sessionId,
  });
});

test('replay stays off until the website enables it', async () => {
  vi.mocked(getWebsite).mockResolvedValue({
    id: websiteId,
    workspaceId: 'workspace-1',
    replayEnabled: false,
  } as any);

  const response = await POST(recordRequest());

  expect(await response.json()).toEqual({ ok: false, reason: 'replay_disabled' });
  expect(reserveReplaySession).not.toHaveBeenCalled();
});

test('legacy websites without a workspace cannot record or meter replay', async () => {
  vi.mocked(getWebsite).mockResolvedValue({
    id: websiteId,
    workspaceId: null,
    replayEnabled: true,
  } as any);

  const response = await POST(recordRequest());

  expect(await response.json()).toEqual({ ok: false, reason: 'workspace_required' });
  expect(reserveReplaySession).not.toHaveBeenCalled();
});

test('a recording request without a session token is rejected', async () => {
  const response = await POST(recordRequest(''));

  expect(response.status).toBe(400);
  expect(getWebsite).not.toHaveBeenCalled();
});

test('a cache token for another website is rejected', async () => {
  vi.mocked(parseCollectorCacheToken).mockReturnValue(null as any);

  const response = await POST(recordRequest());

  expect(response.status).toBe(400);
  expect(getWebsite).not.toHaveBeenCalled();
});
