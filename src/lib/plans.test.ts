import { describe, expect, test } from 'vitest';
import {
  annualSavingsCents,
  DEFAULT_TRAFFIC_TIER_INDEX,
  formatAnnualPrice,
  formatMonthlyPrice,
  getPlan,
  getPlanOrNull,
  getTrafficEvents,
  getTrafficPriceCents,
  isPlanId,
  PLANS,
  planHasFeature,
  resolvePlanForTrafficTier,
  SETUP_MEMBERS,
  SETUP_WEBSITES,
  TRAFFIC_TIERS,
} from './plans';

describe('plans', () => {
  test('ships exactly two paid plans and no trial clock', () => {
    expect(PLANS.map(plan => plan.id)).toEqual(['starter', 'pro']);
    expect(PLANS.every(plan => plan.monthlyPriceCents > 0)).toBe(true);
    expect(PLANS).toHaveLength(2);
    expect(SETUP_WEBSITES).toBe(1);
    expect(SETUP_MEMBERS).toBe(1);
  });

  test('keeps the owner-fixed entry prices and increases the included limits', () => {
    expect(getPlan('starter').monthlyPriceCents).toBe(799);
    expect(getPlan('starter').websiteLimit).toBe(1);
    expect(getPlan('starter').eventsPerMonth).toBe(100_000);
    expect(getPlan('pro').monthlyPriceCents).toBe(1499);
    expect(getPlan('pro').websiteLimit).toBe(50);
    expect(getPlan('pro').eventsPerMonth).toBe(1_000_000);
  });

  test('formats prices and annual savings', () => {
    expect(formatMonthlyPrice(getPlan('starter'))).toBe('$7.99');
    expect(formatMonthlyPrice(getPlan('pro'))).toBe('$14.99');
    expect(formatAnnualPrice(getPlan('starter'))).toBe('$79.90');
    expect(formatAnnualPrice(getPlan('pro'))).toBe('$149.90');
    expect(annualSavingsCents(getPlan('starter'))).toBe(1598);
    expect(annualSavingsCents(getPlan('pro'))).toBe(2998);
  });

  test('gates replay to Pro only', () => {
    expect(planHasFeature('starter', 'session_replay')).toBe(false);
    expect(planHasFeature('pro', 'session_replay')).toBe(true);
    expect(getPlan('starter').replaySessionsPerMonth).toBe(0);
    expect(getPlan('pro').replaySessionsPerMonth).toBeGreaterThan(0);
  });

  test('validates plan ids without inventing a free plan id', () => {
    expect(isPlanId('starter')).toBe(true);
    expect(isPlanId('pro')).toBe(true);
    expect(isPlanId('free')).toBe(false);
    expect(getPlanOrNull('enterprise')).toBeNull();
    expect(() => getPlan('free' as never)).toThrow();
  });

  test('annual pricing is two months free', () => {
    for (const plan of PLANS) {
      expect(plan.annualPriceCents).toBe(plan.monthlyPriceCents * 10);
      expect(annualSavingsCents(plan)).toBe(plan.monthlyPriceCents * 2);
    }
  });

  test('the traffic slider raises both events and price monotonically', () => {
    for (const plan of PLANS) {
      for (let index = 1; index < TRAFFIC_TIERS.length; index++) {
        expect(getTrafficEvents(plan.id, index)).toBeGreaterThanOrEqual(
          getTrafficEvents(plan.id, index - 1),
        );
        expect(getTrafficPriceCents(plan.id, index)).toBeGreaterThan(
          getTrafficPriceCents(plan.id, index - 1),
        );
      }
    }
  });

  test('the default tier keeps $7.99 / $14.99 and beats DataFast entry pricing', () => {
    expect(getTrafficPriceCents('starter', DEFAULT_TRAFFIC_TIER_INDEX)).toBe(799);
    expect(getTrafficPriceCents('pro', DEFAULT_TRAFFIC_TIER_INDEX)).toBe(1499);

    // DataFast published $9/mo Starter and $19/mo Growth at 10k events
    // (verified 2026-11-07). The smallest tier stays below both while
    // including more events.
    expect(getTrafficPriceCents('starter', 0)).toBeLessThan(900);
    expect(getTrafficPriceCents('pro', 0)).toBeLessThan(1900);
    expect(getTrafficEvents('starter', 0)).toBeGreaterThanOrEqual(10_000);
    expect(getTrafficEvents('pro', 0)).toBeGreaterThanOrEqual(10_000);
  });

  test('resolves purchased traffic tiers into the effective plan limits', () => {
    const low = resolvePlanForTrafficTier('starter', 0);
    const high = resolvePlanForTrafficTier('pro', 6);

    expect(low.eventsPerMonth).toBe(10_000);
    expect(low.monthlyPriceCents).toBe(599);
    expect(high.eventsPerMonth).toBe(10_000_000);
    expect(high.monthlyPriceCents).toBe(4799);
    expect(high.websiteLimit).toBe(50);
    expect(resolvePlanForTrafficTier('starter', null)).toEqual(getPlan('starter'));
  });
});
