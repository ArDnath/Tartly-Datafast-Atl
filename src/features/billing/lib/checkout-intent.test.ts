import { expect, test } from 'vitest';
import { buildCheckoutPath, parseCheckoutIntent } from './checkout-intent';

test('parses and rebuilds a pricing-card checkout intent', () => {
  const intent = parseCheckoutIntent({
    plan: 'pro',
    interval: 'annual',
    tier: '5',
  });

  expect(intent).toEqual({ planId: 'pro', interval: 'annual', tierIndex: 5 });
  expect(buildCheckoutPath(intent)).toBe('/checkout?plan=pro&interval=annual&tier=5');
});

test('falls back to the Starter monthly default for invalid values', () => {
  expect(parseCheckoutIntent({ plan: 'free', interval: 'weekly', tier: 'nope' })).toEqual({
    planId: 'starter',
    interval: 'monthly',
    tierIndex: 3,
  });
  expect(parseCheckoutIntent()).toEqual({
    planId: 'starter',
    interval: 'monthly',
    tierIndex: 3,
  });
});

test('clamps an out-of-range tier to the nearest real price', () => {
  expect(parseCheckoutIntent({ tier: '99' }).tierIndex).toBe(7);
  expect(parseCheckoutIntent({ tier: '-2' }).tierIndex).toBe(0);
});
