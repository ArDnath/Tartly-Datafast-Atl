#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config';
import DodoPayments from 'dodopayments';
import {
  buildDodoBillingProductPlan,
  getDefaultTierProductEnv,
  summarizeBillingProductPlan,
} from '../src/features/billing/lib/dodo-product-plan';

/**
 * Create the Dodo Payments products that the pricing slider can sell.
 *
 * Usage:
 *   pnpm billing:setup-dodo            # dry run, prints the catalogue
 *   pnpm billing:setup-dodo --apply    # creates missing products and prints env
 *
 * Live mode additionally requires --yes-live. The script matches existing
 * products by their `tartly*` metadata, so a re-run reuses products instead of
 * creating duplicates.
 */

const apply = process.argv.includes('--apply');
const yesLive = process.argv.includes('--yes-live');
const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode';

if (!apiKey) {
  console.error('DODO_PAYMENTS_API_KEY is required.');
  process.exit(1);
}

if (environment === 'live_mode' && apply && !yesLive) {
  console.error('Live mode requires --yes-live in addition to --apply.');
  process.exit(1);
}

const planned = buildDodoBillingProductPlan();
const client = new DodoPayments({ bearerToken: apiKey, environment });

function metadataKey(metadata) {
  const planId = metadata?.tartlyPlanId;
  const interval = metadata?.tartlyInterval;
  const tierIndex = metadata?.tartlyTierIndex;

  if (
    (planId === 'starter' || planId === 'pro') &&
    (interval === 'monthly' || interval === 'annual') &&
    Number.isInteger(Number(tierIndex))
  ) {
    return `${planId}:${interval}:${Number(tierIndex)}`;
  }

  return null;
}

async function listExistingProducts() {
  const existing = new Map();

  for await (const product of client.products.list()) {
    const key = metadataKey(product.metadata);

    if (key && !existing.has(key)) {
      existing.set(key, product.product_id);
    }
  }

  return existing;
}

async function main() {
  console.log(`Dodo environment: ${environment}`);
  console.log(`${planned.length} recurring products:`);
  console.log(summarizeBillingProductPlan(planned));

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to create missing products.');
    return;
  }

  const existing = await listExistingProducts();
  const productIds = new Map(existing);

  for (const item of planned) {
    if (productIds.has(item.key)) {
      console.log(`reuse ${item.key} -> ${productIds.get(item.key)}`);
      continue;
    }

    const price = {
      type: 'recurring_price',
      currency: 'USD',
      price: item.amountCents,
      payment_frequency_count: 1,
      payment_frequency_interval: item.interval === 'annual' ? 'Year' : 'Month',
      subscription_period_count: 20,
      subscription_period_interval: 'Year',
    } as const;

    const product = await client.products.create({
      name: item.name,
      description: item.description,
      tax_category: 'digital_products',
      price,
      metadata: item.metadata,
    });

    productIds.set(item.key, product.product_id);
    console.log(`create ${item.key} -> ${product.product_id}`);
  }

  const productMap = Object.fromEntries(productIds);
  const defaultEnv = getDefaultTierProductEnv(productIds);

  console.log('\nAdd these values to the runtime environment (never commit them):\n');
  console.log(`DODO_PRODUCT_IDS_JSON=${JSON.stringify(productMap)}`);

  for (const [name, value] of Object.entries(defaultEnv)) {
    console.log(`${name}=${value}`);
  }
}

main().catch(error => {
  console.error('Dodo product setup failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
