import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { findBillingProduct, getBillingConfig, type BillingConfig } from './provider';

beforeEach(() => {
  vi.stubEnv('DODO_PAYMENTS_API_KEY', 'test-key');
  vi.stubEnv('DODO_PAYMENTS_WEBHOOK_SECRET', 'test-secret');
  vi.stubEnv('DODO_PAYMENTS_ENVIRONMENT', 'test_mode');
  vi.stubEnv('DODO_STARTER_PRODUCT_ID', 'pdt_starter');
  vi.stubEnv('DODO_PRO_PRODUCT_ID', 'pdt_pro');
  vi.stubEnv('DODO_STARTER_ANNUAL_PRODUCT_ID', '');
  vi.stubEnv('DODO_PRO_ANNUAL_PRODUCT_ID', '');
  vi.stubEnv('DODO_PRODUCT_IDS_JSON', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function requireConfig(): BillingConfig {
  const config = getBillingConfig();

  if (!config) {
    throw new Error('Expected billing config');
  }

  return config;
}

test('reads exact traffic-tier products from the JSON map', () => {
  vi.stubEnv(
    'DODO_PRODUCT_IDS_JSON',
    JSON.stringify({
      'starter:monthly:0': 'pdt_starter_10k',
      'pro:annual:6': 'pdt_pro_annual_10m',
    }),
  );

  const config = requireConfig();

  expect(findBillingProduct(config, 'starter', 'monthly', 0)?.productId).toBe('pdt_starter_10k');
  expect(findBillingProduct(config, 'pro', 'annual', 6)?.productId).toBe('pdt_pro_annual_10m');
});

test('refuses a non-default tier with no exact product rather than falling back', () => {
  const config = requireConfig();

  expect(findBillingProduct(config, 'pro', 'monthly', 3)?.productId).toBe('pdt_pro');
  expect(findBillingProduct(config, 'pro', 'monthly', 4)).toBeNull();
});

test('uses a tier-specific default product when no legacy base product exists', () => {
  vi.stubEnv('DODO_STARTER_PRODUCT_ID', '');
  vi.stubEnv('DODO_PRO_PRODUCT_ID', '');
  vi.stubEnv(
    'DODO_PRODUCT_IDS_JSON',
    JSON.stringify({
      'starter:monthly:3': 'pdt_starter_default',
      'pro:monthly:3': 'pdt_pro_default',
    }),
  );

  const config = requireConfig();

  expect(findBillingProduct(config, 'starter', 'monthly', 3)?.productId).toBe(
    'pdt_starter_default',
  );
});

test('reports not configured when either plan has no monthly product', () => {
  vi.stubEnv('DODO_PRO_PRODUCT_ID', '');

  expect(getBillingConfig()).toBeNull();
});

test('ignores malformed tier keys without granting a wrong price', () => {
  vi.stubEnv(
    'DODO_PRODUCT_IDS_JSON',
    JSON.stringify({
      'starter:monthly:999': 'pdt_bad',
      nonsense: 'pdt_bad_2',
    }),
  );

  const config = requireConfig();

  expect(findBillingProduct(config, 'starter', 'monthly', 3)?.productId).toBe('pdt_starter');
  expect(findBillingProduct(config, 'starter', 'monthly', 0)).toBeNull();
});
