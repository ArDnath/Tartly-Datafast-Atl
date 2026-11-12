import { expect, test } from 'vitest';
import { DEFAULT_TRAFFIC_TIER_INDEX, TRAFFIC_TIERS } from '@/lib/plans';
import { buildDodoBillingProductPlan, getDefaultTierProductEnv } from './dodo-product-plan';

test('builds one exact Dodo product for every plan, interval, and traffic tier', () => {
  const items = buildDodoBillingProductPlan();

  expect(items).toHaveLength(2 * 2 * TRAFFIC_TIERS.length);
  expect(new Set(items.map(item => item.key)).size).toBe(items.length);
  expect(items.every(item => item.amountCents > 0)).toBe(true);
});

test('keeps the owner-fixed default tier prices and annual two-months-free amount', () => {
  const items = buildDodoBillingProductPlan();
  const starterMonthly = items.find(
    item => item.key === `starter:monthly:${DEFAULT_TRAFFIC_TIER_INDEX}`,
  );
  const proAnnual = items.find(item => item.key === `pro:annual:${DEFAULT_TRAFFIC_TIER_INDEX}`);

  expect(starterMonthly?.amountCents).toBe(799);
  expect(proAnnual?.amountCents).toBe(14_990);
});

test('maps the default tier to the four legacy environment names', () => {
  const products = new Map([
    [`starter:monthly:${DEFAULT_TRAFFIC_TIER_INDEX}`, 'pdt_sm'],
    [`pro:monthly:${DEFAULT_TRAFFIC_TIER_INDEX}`, 'pdt_pm'],
    [`starter:annual:${DEFAULT_TRAFFIC_TIER_INDEX}`, 'pdt_sa'],
    [`pro:annual:${DEFAULT_TRAFFIC_TIER_INDEX}`, 'pdt_pa'],
  ]);

  expect(getDefaultTierProductEnv(products)).toEqual({
    DODO_STARTER_PRODUCT_ID: 'pdt_sm',
    DODO_PRO_PRODUCT_ID: 'pdt_pm',
    DODO_STARTER_ANNUAL_PRODUCT_ID: 'pdt_sa',
    DODO_PRO_ANNUAL_PRODUCT_ID: 'pdt_pa',
  });
});
