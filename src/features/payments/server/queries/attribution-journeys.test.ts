import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('@/features/payments/lib/stripe-amount', () => ({
  formatStripeAmount: vi.fn(),
}));

vi.mock('@/queries/prisma/websiteCurrency', () => ({
  normalizeWebsiteCurrencyAmount: vi.fn(async ({ amount, currency }) => ({
    amount: Number(amount).toFixed(4),
    currency: currency.toUpperCase(),
  })),
  normalizeWebsiteCurrencyAmountInTransaction: vi.fn(async (_tx, { amount, currency }) => ({
    amount: Number(amount).toFixed(4),
    currency: currency.toUpperCase(),
  })),
}));

vi.mock('@/lib/prisma', () => {
  const client = {
    customerIdentity: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
    },
    paymentDetectionEvent: {
      findFirst: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
    },
    visitor: {
      findUnique: vi.fn(),
    },
    visitorIdentityLink: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  const tx = {
    payment: {
      update: vi.fn(),
      upsert: vi.fn(),
    },
    paymentAttribution: {
      upsert: vi.fn(),
    },
    paymentDetectionEvent: {
      update: vi.fn(),
    },
    paymentMatch: {
      upsert: vi.fn(),
    },
    websiteEvent: {
      findFirst: vi.fn(),
    },
  };

  return {
    default: {
      client,
      transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    },
    __client: client,
    __tx: tx,
  };
});

const prismaModule = (await import('@/lib/prisma')) as any;
const client = prismaModule.__client;
const tx = prismaModule.__tx;
const { recordPayment } = await import('./payment');

const occurredAt = new Date('2026-08-20T15:00:00.000Z');

const visitor = (overrides: Record<string, unknown> = {}) => ({
  id: 'visitor-1',
  lastSessionId: 'session-2',
  firstSource: 'google',
  firstMedium: 'organic',
  firstCampaign: 'brand-search',
  firstReferrerDomain: 'google.com',
  firstReferrerPath: '/search',
  firstReferrerQuery: 'q=revenue+analytics',
  firstLandingPath: '/blog/analytics',
  ...overrides,
});

const basePayment = {
  websiteId: 'site-1',
  providerName: 'stripe',
  providerPaymentId: 'pi_100',
  transactionId: 'pi_100',
  amount: '49.0000',
  currency: 'USD',
  occurredAt,
};

beforeEach(() => {
  vi.clearAllMocks();
  client.payment.findFirst.mockResolvedValue(null);
  client.paymentDetectionEvent.findFirst.mockResolvedValue(null);
  client.subscription.findUnique.mockResolvedValue(null);
  client.session.findFirst.mockResolvedValue(null);
  client.visitor.findUnique.mockResolvedValue(null);
  client.customerIdentity.findFirst.mockResolvedValue(null);
  client.customerIdentity.findUnique.mockResolvedValue(null);
  client.visitorIdentityLink.findFirst.mockResolvedValue(null);
  tx.payment.upsert.mockResolvedValue({ id: 'payment-1', isRefunded: false });
  tx.payment.update.mockResolvedValue({ id: 'payment-1' });
  tx.paymentMatch.upsert.mockResolvedValue({ id: 'match-1' });
  tx.websiteEvent.findFirst.mockResolvedValue(null);
  tx.paymentAttribution.upsert.mockResolvedValue({ id: 'attribution-1' });
});

function attributionWrites() {
  return tx.paymentAttribution.upsert.mock.calls.map((call: any[]) => call[0].create);
}

test('organic discovery followed by a paid retargeting click keeps both first and last touch', async () => {
  client.session.findFirst.mockResolvedValue({
    id: 'session-2',
    visitor: visitor(),
  });
  tx.websiteEvent.findFirst.mockResolvedValue({
    id: 'event-9',
    urlPath: '/pricing',
    utmSource: 'facebook',
    utmMedium: 'paid',
    utmCampaign: 'retarget-q4',
    referrerDomain: 'facebook.com',
    referrerPath: '/ads',
    referrerQuery: 'utm_source=facebook',
  });

  await recordPayment({ ...basePayment, sessionId: 'session-2' });

  const writes = attributionWrites();

  expect(writes).toHaveLength(2);
  expect(writes.map((write: any) => write.attributionModel)).toEqual(['first_touch', 'last_touch']);
  for (const write of writes) {
    expect(write).toEqual(
      expect.objectContaining({
        firstTouchSource: 'google',
        firstTouchMedium: 'organic',
        firstTouchCampaign: 'brand-search',
        firstTouchLandingPath: '/blog/analytics',
        lastTouchSource: 'facebook',
        lastTouchMedium: 'paid',
        lastTouchCampaign: 'retarget-q4',
        lastTouchLandingPath: '/pricing',
        conversionPath: '/pricing',
        revenueAmount: '49.0000',
        revenueCurrency: 'USD',
        attributionConfidence: 'high',
        unattributedReason: null,
      }),
    );
  }
  expect(tx.paymentMatch.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({ matchMethod: 'explicit_session_id' }),
    }),
  );
});

test('a referral lands as the last touch without overwriting the first touch', async () => {
  client.session.findFirst.mockResolvedValue({
    id: 'session-2',
    visitor: visitor({
      firstSource: 'newsletter',
      firstMedium: 'email',
      firstCampaign: 'weekly',
      firstReferrerDomain: null,
      firstReferrerPath: null,
      firstReferrerQuery: null,
      firstLandingPath: '/welcome',
    }),
  });
  tx.websiteEvent.findFirst.mockResolvedValue({
    id: 'event-referral',
    urlPath: '/signup',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    referrerDomain: 'news.ycombinator.com',
    referrerPath: '/item',
    referrerQuery: 'id=42',
  });

  await recordPayment({ ...basePayment, transactionId: 'pi_referral', sessionId: 'session-2' });

  const [write] = attributionWrites();

  expect(write).toEqual(
    expect.objectContaining({
      firstTouchSource: 'newsletter',
      firstTouchMedium: 'email',
      firstTouchLandingPath: '/welcome',
      lastTouchSource: null,
      lastTouchReferrerDomain: 'news.ycombinator.com',
      lastTouchReferrerPath: '/item',
      lastTouchReferrerQuery: 'id=42',
      lastTouchLandingPath: '/signup',
    }),
  );
});

test('a direct purchase after paid acquisition keeps credit on the first touch', async () => {
  client.session.findFirst.mockResolvedValue({
    id: 'session-3',
    visitor: visitor({
      firstSource: 'tiktok',
      firstMedium: 'paid',
      firstCampaign: 'launch',
      firstReferrerDomain: 'tiktok.com',
      firstLandingPath: '/l/launch',
    }),
  });
  tx.websiteEvent.findFirst.mockResolvedValue({
    id: 'event-direct',
    urlPath: '/checkout',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    referrerDomain: null,
    referrerPath: null,
    referrerQuery: null,
  });

  await recordPayment({ ...basePayment, transactionId: 'pi_direct', sessionId: 'session-3' });

  const [write] = attributionWrites();

  expect(write).toEqual(
    expect.objectContaining({
      firstTouchSource: 'tiktok',
      firstTouchCampaign: 'launch',
      firstTouchLandingPath: '/l/launch',
      lastTouchSource: null,
      lastTouchReferrerDomain: null,
      conversionPath: '/checkout',
    }),
  );
});

test('a recurring charge inherits attribution from the stored subscription history', async () => {
  client.subscription.findUnique.mockResolvedValue({
    id: 'subscription-1',
    sessionId: 'session-1',
    visitor: visitor({ lastSessionId: 'session-1' }),
  });
  tx.websiteEvent.findFirst.mockResolvedValue({
    id: 'event-last',
    urlPath: '/app',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    referrerDomain: null,
    referrerPath: null,
    referrerQuery: null,
  });

  await recordPayment({
    ...basePayment,
    transactionId: 'pi_renewal',
    providerPaymentId: 'pi_renewal',
    providerSubscriptionId: 'sub-1',
    amount: '19.0000',
    isRenewal: true,
  });

  expect(tx.payment.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({ isRenewal: true }),
    }),
  );
  expect(tx.paymentMatch.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({
        matchMethod: 'provider_subscription_history',
        matchConfidence: 'high',
      }),
    }),
  );
  expect(attributionWrites()[0]).toEqual(
    expect.objectContaining({
      firstTouchSource: 'google',
      firstTouchMedium: 'organic',
      isRenewal: true,
      revenueAmount: '19.0000',
    }),
  );
});

test('a payment with no visitor or session is written as explicitly unattributed', async () => {
  await recordPayment({ ...basePayment, transactionId: 'pi_unattributed' });

  const [write] = attributionWrites();

  expect(write).toEqual(
    expect.objectContaining({
      attributionConfidence: 'none',
      unattributedReason: 'missing_visitor_or_session',
    }),
  );
  expect(write.firstTouchSource).toBeUndefined();
  expect(write.lastTouchSource).toBeUndefined();
  expect(tx.paymentMatch.upsert).not.toHaveBeenCalled();
});
