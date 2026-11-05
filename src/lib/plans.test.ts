import { describe, expect, test } from 'vitest';
import {
  PLANS,
  annualSavingsCents,
  formatAnnualPrice,
  formatMonthlyPrice,
  getPlan,
  getPlanOrNull,
  isPlanId,
  planHasFeature,
} from './plans';

describe('plans', () => {
  test('ships exactly two paid plans with no free tier', () => {
    expect(PLANS.map(plan => plan.id)).toEqual(['starter', 'pro']);
    expect(PLANS.every(plan => plan.monthlyPriceCents > 0)).toBe(true);
  });

  test('keeps the owner-fixed prices and website limits', () => {
    expect(getPlan('starter').monthlyPriceCents).toBe(799);
    expect(getPlan('starter').websiteLimit).toBe(1);
    expect(getPlan('pro').monthlyPriceCents).toBe(1499);
    expect(getPlan('pro').websiteLimit).toBe(20);
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

  test('validates plan ids without falling back to a free plan', () => {
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
});
