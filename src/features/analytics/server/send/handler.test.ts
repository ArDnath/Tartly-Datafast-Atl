import { beforeEach, expect, test, vi } from 'vitest';
import { parseCollectorCacheToken } from '@/features/analytics/lib/collector-cache';
import { getClientInfo } from '@/features/analytics/lib/detect';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { fetchWebsite } from '@/lib/load';
import { parseRequest } from '@/lib/request';
import { releaseEventUsage, reserveEventUsage } from '@/lib/usage';
import {
  ensureVisitorContext,
  upsertCustomerIdentityLink,
  upsertVisitorContext,
} from '@/features/payments/server/queries/attribution';
import { getWebsiteAttributionRuntimeConfig } from '@/queries/prisma/website';
import {
  createSession,
  saveEvent,
  updateSessionDistinctId,
} from '@/features/analytics/server/queries/sql';
import { POST } from './handler';

vi.mock('@/features/analytics/lib/collector-cache', () => ({
  createCollectorCacheToken: vi.fn(() => 'collector-cache'),
  parseCollectorCacheToken: vi.fn(),
}));

vi.mock('@/features/analytics/lib/cross-domain-linker', () => ({
  CROSS_DOMAIN_LINKER_TTL_MS: 300000,
  createCrossDomainLinker: vi.fn(() => 'cross-domain-linker'),
  parseCrossDomainLinker: vi.fn(),
}));

vi.mock('@/lib/crypto', () => ({
  getSalt: vi.fn(() => 'salt'),
  secret: vi.fn(() => 'secret'),
  uuid: vi.fn(() => '11111111-1111-4111-8111-111111111111'),
}));

vi.mock('@/features/analytics/lib/detect', () => ({
  getClientInfo: vi.fn(),
  hasBlockedIp: vi.fn(() => false),
}));

vi.mock('@/lib/load', () => ({
  fetchWebsite: vi.fn(),
}));

vi.mock('@/lib/entitlements', () => ({
  getWorkspaceEntitlements: vi.fn(),
}));

vi.mock('@/lib/usage', () => ({
  isBillableEvent: (eventType: number) => eventType >= 1 && eventType <= 4,
  reserveEventUsage: vi.fn(),
  releaseEventUsage: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/features/payments/server/queries/attribution', () => ({
  ensureVisitorContext: vi.fn(),
  savePaymentDetectionEvent: vi.fn(),
  upsertCustomerIdentityLink: vi.fn(),
  upsertVisitorContext: vi.fn(),
}));

vi.mock('@/queries/prisma/website', () => ({
  getWebsiteAttributionRuntimeConfig: vi.fn(),
}));

vi.mock('@/features/analytics/server/queries/sql', () => ({
  createSession: vi.fn(),
  saveEvent: vi.fn(),
  saveSessionData: vi.fn(),
  updateSessionDistinctId: vi.fn(),
}));

const websiteId = '5ca9c481-3222-48b6-8bfa-b13e9d8e9209';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchWebsite).mockResolvedValue({ id: websiteId } as any);
  vi.mocked(getClientInfo).mockResolvedValue({
    ip: '203.0.113.1',
    userAgent: 'Mozilla/5.0 Chrome/126',
    device: 'desktop',
    browser: 'chrome',
    os: 'macos',
    country: 'TH',
    region: '10',
    city: 'Bangkok',
  } as any);
  vi.mocked(getWebsiteAttributionRuntimeConfig).mockResolvedValue(null);
  vi.mocked(upsertVisitorContext).mockImplementation(
    async input => ({ id: input.visitorId }) as any,
  );
  vi.mocked(saveEvent).mockResolvedValue('event-1');
});

test('a pageview still captures visitor context after identify established the cache', async () => {
  vi.mocked(parseRequest)
    .mockResolvedValueOnce({
      body: {
        type: 'identify',
        payload: {
          website: websiteId,
          visitorId: 'v_visitor',
          sessionId: 's_session',
        },
      },
    } as any)
    .mockResolvedValueOnce({
      body: {
        type: 'event',
        payload: {
          website: websiteId,
          visitorId: 'v_visitor',
          sessionId: 's_session',
          hostname: 'shop.example',
          url: 'https://shop.example/pricing?utm_source=launch',
          referrer: '',
        },
      },
    } as any);
  vi.mocked(parseCollectorCacheToken).mockReturnValue({
    purpose: 'collector-cache',
    websiteId,
    visitorId: '11111111-1111-4111-8111-111111111111',
    sessionId: '22222222-2222-4222-8222-222222222222',
  });

  await POST(new Request('https://collector.example/api/send', { method: 'POST' }));
  await POST(
    new Request('https://collector.example/api/send', {
      method: 'POST',
      headers: { 'x-talivia-cache': 'collector-cache' },
    }),
  );

  expect(createSession).toHaveBeenCalledTimes(1);
  expect(ensureVisitorContext).toHaveBeenCalledTimes(1);
  expect(vi.mocked(ensureVisitorContext).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(createSession).mock.invocationCallOrder[0],
  );
  expect(upsertVisitorContext).toHaveBeenCalledTimes(2);
  expect(upsertVisitorContext).toHaveBeenLastCalledWith(
    expect.objectContaining({
      websiteId,
      sessionId: '22222222-2222-4222-8222-222222222222',
      source: 'launch',
      landingPath: '/pricing',
      captureFirstTouch: true,
    }),
  );
});

test('identify links and updates a session when called with only a user id', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    body: {
      type: 'identify',
      payload: {
        website: websiteId,
        visitorId: 'v_visitor',
        sessionId: 's_session',
        id: 'user-123',
      },
    },
  } as any);

  await POST(new Request('https://collector.example/api/send', { method: 'POST' }));

  expect(upsertCustomerIdentityLink).toHaveBeenCalledWith(
    expect.objectContaining({
      websiteId,
      externalCustomerId: 'user-123',
    }),
  );
  expect(updateSessionDistinctId).toHaveBeenCalledWith(
    websiteId,
    '11111111-1111-4111-8111-111111111111',
    'user-123',
  );
});

test('pauses billable ingestion when the workspace hard limit is reached', async () => {
  const workspaceId = '6b7c2d44-8f25-4b50-8d4f-9f0f3b1f1b1b';

  vi.mocked(fetchWebsite).mockResolvedValue({ id: websiteId, workspaceId } as any);
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    plan: { eventsPerMonth: 50_000 },
  } as any);
  vi.mocked(reserveEventUsage).mockResolvedValue({
    allowed: false,
    used: 51_000,
    limit: 50_000,
    hardLimit: 51_000,
  });
  vi.mocked(parseRequest).mockResolvedValue({
    body: {
      type: 'event',
      payload: {
        website: websiteId,
        visitorId: 'v_visitor',
        sessionId: 's_session',
        hostname: 'shop.example',
        url: 'https://shop.example/pricing',
      },
    },
  } as any);

  const response = await POST(
    new Request('https://collector.example/api/send', { method: 'POST' }),
  );
  const body = await response.json();

  expect(body).toMatchObject({ ok: false, reason: 'usage_limit_reached' });
  expect(saveEvent).not.toHaveBeenCalled();
  expect(releaseEventUsage).not.toHaveBeenCalled();
});

test('releases the reservation when the event write fails', async () => {
  const workspaceId = '6b7c2d44-8f25-4b50-8d4f-9f0f3b1f1b1b';
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

  vi.mocked(fetchWebsite).mockResolvedValue({ id: websiteId, workspaceId } as any);
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    plan: { eventsPerMonth: 50_000 },
  } as any);
  vi.mocked(reserveEventUsage).mockResolvedValue({
    allowed: true,
    used: 1,
    limit: 50_000,
    hardLimit: 51_000,
  });
  vi.mocked(saveEvent).mockRejectedValueOnce(new Error('write failed'));
  vi.mocked(parseRequest).mockResolvedValue({
    body: {
      type: 'event',
      payload: {
        website: websiteId,
        visitorId: 'v_visitor',
        sessionId: 's_session',
        hostname: 'shop.example',
        url: 'https://shop.example/pricing',
      },
    },
  } as any);

  const response = await POST(
    new Request('https://collector.example/api/send', { method: 'POST' }),
  );

  expect(response.status).toBe(500);
  expect(releaseEventUsage).toHaveBeenCalledWith(workspaceId);

  consoleLog.mockRestore();
});
