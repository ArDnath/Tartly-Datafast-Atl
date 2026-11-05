import { describe, expect, test } from 'vitest';
import {
  billingSubscriptionHasAccess,
  isNewerBillingEvent,
  mapProviderSubscriptionStatus,
  parseProviderDate,
} from '@/lib/billing-lifecycle';

const now = new Date('2026-11-05T12:00:00.000Z');

describe('platform billing lifecycle', () => {
  test('maps provider status and event types to our lifecycle', () => {
    expect(
      mapProviderSubscriptionStatus({ providerStatus: 'active', eventType: 'subscription.active' }),
    ).toBe('ACTIVE');
    expect(
      mapProviderSubscriptionStatus({
        providerStatus: 'active',
        eventType: 'subscription.active',
        inTrial: true,
      }),
    ).toBe('TRIALING');
    expect(
      mapProviderSubscriptionStatus({
        providerStatus: 'past_due',
        eventType: 'subscription.past_due',
      }),
    ).toBe('PAST_DUE');
    expect(
      mapProviderSubscriptionStatus({
        providerStatus: 'on_hold',
        eventType: 'subscription.on_hold',
      }),
    ).toBe('SUSPENDED');
    expect(
      mapProviderSubscriptionStatus({
        providerStatus: 'cancelled',
        eventType: 'subscription.cancelled',
      }),
    ).toBe('CANCELLED');
    expect(
      mapProviderSubscriptionStatus({
        providerStatus: 'expired',
        eventType: 'subscription.expired',
      }),
    ).toBe('EXPIRED');
    expect(
      mapProviderSubscriptionStatus({ providerStatus: 'failed', eventType: 'subscription.failed' }),
    ).toBe('SUSPENDED');
  });

  test('only confirmed or grace-period subscriptions unlock paid features', () => {
    expect(billingSubscriptionHasAccess({ lifecycleStatus: 'ACTIVE' }, now)).toBe(true);
    expect(billingSubscriptionHasAccess({ lifecycleStatus: 'TRIALING' }, now)).toBe(true);
    expect(billingSubscriptionHasAccess({ lifecycleStatus: 'PAST_DUE' }, now)).toBe(true);
    expect(billingSubscriptionHasAccess({ lifecycleStatus: 'SUSPENDED' }, now)).toBe(false);
    expect(billingSubscriptionHasAccess({ lifecycleStatus: 'EXPIRED' }, now)).toBe(false);
    expect(billingSubscriptionHasAccess(null, now)).toBe(false);
  });

  test('cancel-at-period-end keeps access until the paid period ends', () => {
    const future = new Date(now.getTime() + 86_400_000);
    const past = new Date(now.getTime() - 86_400_000);

    expect(
      billingSubscriptionHasAccess(
        {
          lifecycleStatus: 'CANCELLED',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: future,
        },
        now,
      ),
    ).toBe(true);
    expect(
      billingSubscriptionHasAccess(
        {
          lifecycleStatus: 'CANCELLED',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: past,
        },
        now,
      ),
    ).toBe(false);
  });

  test('older webhook snapshots never overwrite newer state', () => {
    const stored = { lastEventAt: now, lastEventPriority: 30 };

    expect(
      isNewerBillingEvent(
        { eventAt: new Date(now.getTime() - 1000), eventType: 'subscription.updated' },
        stored,
      ),
    ).toBe(false);
    expect(
      isNewerBillingEvent(
        { eventAt: new Date(now.getTime() + 1000), eventType: 'subscription.updated' },
        stored,
      ),
    ).toBe(true);
    expect(isNewerBillingEvent({ eventAt: now, eventType: 'subscription.cancelled' }, stored)).toBe(
      true,
    );
    expect(isNewerBillingEvent({ eventAt: now, eventType: 'subscription.active' }, stored)).toBe(
      false,
    );
  });

  test('parses provider dates defensively', () => {
    expect(parseProviderDate('2026-11-05T12:00:00Z')?.toISOString()).toBe(
      '2026-11-05T12:00:00.000Z',
    );
    expect(parseProviderDate('not-a-date')).toBeNull();
    expect(parseProviderDate(null)).toBeNull();
  });
});
