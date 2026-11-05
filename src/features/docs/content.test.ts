import { expect, test } from 'vitest';
import { getRevenueGuide, REVENUE_GUIDES } from './content';

test('revenue guides have unique slugs and complete copy', () => {
  const slugs = new Set<string>();

  for (const guide of REVENUE_GUIDES) {
    expect(guide.slug).toMatch(/^[a-z0-9-]+$/);
    expect(slugs.has(guide.slug)).toBe(false);
    slugs.add(guide.slug);
    expect(guide.title.length).toBeGreaterThan(0);
    expect(guide.summary.length).toBeGreaterThan(0);
    expect(guide.connectSteps.length).toBeGreaterThan(0);
    expect(guide.attribution.length).toBeGreaterThan(0);
  }
});

test('revenue guides do not link to the upstream product brand', () => {
  for (const guide of REVENUE_GUIDES) {
    expect(guide.summary).not.toContain('talivia.com');
    expect(guide.attribution).not.toContain('talivia.com');

    for (const link of guide.officialLinks) {
      expect(link.url.startsWith('https://')).toBe(true);
      expect(link.url).not.toContain('talivia.com');
    }
  }
});

test('getRevenueGuide only resolves known slugs', () => {
  expect(getRevenueGuide('stripe')?.title).toBe('Stripe');
  expect(getRevenueGuide('manual')?.title).toBe('Manual payment API');
  expect(getRevenueGuide('unknown')).toBeUndefined();
});
