import { describe, expect, it } from 'vitest';
import { buildRevenueFlowSankey, formatStatsBucketLabel } from './revenue-flow';

describe('buildRevenueFlowSankey', () => {
  it('routes every channel into the site and splits the outcome', () => {
    const sankey = buildRevenueFlowSankey(
      [
        { label: 'Organic Search', visitors: 600 },
        { label: 'Paid Ads', visitors: 200 },
      ],
      40,
    );

    expect(sankey.nodes[0].label).toBe('Site visitors');
    expect(sankey.links.filter(link => link.target === 'site')).toHaveLength(2);
    expect(sankey.links.find(link => link.target === 'converted')?.value).toBe(40);
    expect(sankey.links.find(link => link.target === 'unconverted')?.value).toBe(760);
  });

  it('caps payments at the observed traffic', () => {
    const sankey = buildRevenueFlowSankey([{ label: 'Direct', visitors: 10 }], 50);

    expect(sankey.links.find(link => link.target === 'converted')?.value).toBe(10);
    expect(sankey.links.some(link => link.target === 'unconverted')).toBe(false);
  });

  it('returns empty data when there are no visitors', () => {
    expect(buildRevenueFlowSankey([{ label: 'Direct', visitors: 0 }], 0)).toEqual({
      nodes: [],
      links: [],
    });
  });
});

describe('formatStatsBucketLabel', () => {
  it('formats dates and date-times', () => {
    expect(formatStatsBucketLabel('2026-11-10')).toBe('Nov 10');
    expect(formatStatsBucketLabel('2026-11-10 14:00')).toContain('2');
  });

  it('returns an unparseable value as-is', () => {
    expect(formatStatsBucketLabel('not-a-date')).toBe('not-a-date');
  });
});
