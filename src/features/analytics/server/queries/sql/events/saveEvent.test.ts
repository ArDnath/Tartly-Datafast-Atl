import { beforeEach, expect, test, vi } from 'vitest';

const { insert, create, saveEventData, kafka } = vi.hoisted(() => {
  const sendMessage = vi.fn();
  return {
    insert: vi.fn(),
    create: vi.fn(),
    saveEventData: vi.fn(),
    kafka: { enabled: false, sendMessage },
  };
});

vi.mock('@/lib/clickhouse', () => ({
  default: {
    enabled: true,
    getUTCString: vi.fn(() => '2026-07-14 10:00:00'),
    insert,
  },
}));

vi.mock('@/lib/crypto', () => ({
  uuid: vi.fn(() => '11111111-1111-4111-8111-111111111111'),
}));

vi.mock('@/lib/kafka', () => ({
  default: kafka,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      websiteEvent: { create },
    },
  },
}));

vi.mock('./saveEventData', () => ({ saveEventData }));
vi.mock('./saveRevenue', () => ({ saveRevenue: vi.fn() }));

const { saveEvent } = await import('./saveEvent');

beforeEach(() => {
  vi.clearAllMocks();
  kafka.enabled = false;
});

test('mirrors ClickHouse events into PostgreSQL with the same event id', async () => {
  const eventId = await saveEvent({
    websiteId: '22222222-2222-4222-8222-222222222222',
    visitorId: '33333333-3333-4333-8333-333333333333',
    sessionId: '44444444-4444-4444-8444-444444444444',
    eventType: 1,
    urlPath: '/pricing',
    gclid: 'google-click',
    gclsrc: 'aw.ds',
    wbraid: 'web-to-app-click',
    gbraid: 'app-to-app-click',
    eventData: { plan: 'pro' },
  });

  expect(eventId).toBe('11111111-1111-4111-8111-111111111111');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        id: eventId,
        sessionId: '44444444-4444-4444-8444-444444444444',
        visitorId: '33333333-3333-4333-8333-333333333333',
      }),
    }),
  );
  expect(insert).toHaveBeenCalledWith(
    'website_event',
    expect.arrayContaining([
      expect.objectContaining({
        event_id: eventId,
        gclid: 'google-click',
        gclsrc: 'aw.ds',
        wbraid: 'web-to-app-click',
        gbraid: 'app-to-app-click',
      }),
    ]),
  );
  expect(saveEventData).toHaveBeenCalledTimes(1);
});

test('writes directly to ClickHouse when the Kafka publish fails', async () => {
  kafka.enabled = true;
  kafka.sendMessage.mockResolvedValue(null);

  await saveEvent({
    websiteId: '22222222-2222-4222-8222-222222222222',
    visitorId: '33333333-3333-4333-8333-333333333333',
    sessionId: '44444444-4444-4444-8444-444444444444',
    eventType: 1,
    urlPath: '/pricing',
  });

  expect(kafka.sendMessage).toHaveBeenCalledWith(
    'event',
    expect.objectContaining({ event_id: '11111111-1111-4111-8111-111111111111' }),
  );
  expect(insert).toHaveBeenCalledWith(
    'website_event',
    expect.arrayContaining([
      expect.objectContaining({ event_id: '11111111-1111-4111-8111-111111111111' }),
    ]),
  );
});
