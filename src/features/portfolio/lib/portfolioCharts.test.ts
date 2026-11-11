import { describe, expect, it } from 'vitest';
import {
  buildPortfolioSankey,
  buildWebsiteRevenueRows,
  formatPortfolioChartDate,
  mergePortfolioCharts,
  type PortfolioSite,
} from './portfolioCharts';

const sites: PortfolioSite[] = [
  {
    name: 'alpha.com',
    metrics: { visitors: 1000, revenue: 240, payments: 12 },
    chart: [
      { date: '2026-11-09', visitors: 400, revenue: 100, payments: 5 },
      { date: '2026-11-10', visitors: 600, revenue: 140, payments: 7 },
    ],
  },
  {
    name: 'beta.com',
    metrics: { visitors: 500, revenue: 60, payments: 3 },
    chart: [
      { date: '2026-11-09', visitors: 200, revenue: 20, payments: 1 },
      { date: '2026-11-10', visitors: 300, revenue: 40, payments: 2 },
    ],
  },
];

describe('mergePortfolioCharts', () => {
  it('sums every site per date and sorts the result', () => {
    const points = mergePortfolioCharts([...sites].reverse());

    expect(points).toEqual([
      { date: '2026-11-09', visitors: 600, revenue: 120, payments: 6 },
      { date: '2026-11-10', visitors: 900, revenue: 180, payments: 9 },
    ]);
  });

  it('ignores chart rows without a date', () => {
    const points = mergePortfolioCharts([
      {
        name: 'x',
        metrics: { visitors: 0, revenue: 0, payments: 0 },
        chart: [{ date: '', visitors: 10, revenue: 1, payments: 1 }],
      },
    ]);

    expect(points).toEqual([]);
  });
});

describe('buildWebsiteRevenueRows', () => {
  it('sorts by revenue and folds the long tail into one row', () => {
    const rows = buildWebsiteRevenueRows(
      [
        { name: 'small', metrics: { visitors: 10, revenue: 10, payments: 1 } },
        { name: 'large', metrics: { visitors: 100, revenue: 100, payments: 2 } },
        { name: 'medium', metrics: { visitors: 50, revenue: 50, payments: 1 } },
      ],
      2,
    );

    expect(rows).toEqual([
      { label: 'large', bar: 100, line: 100 },
      { label: 'medium', bar: 50, line: 50 },
      { label: 'Other sites', bar: 10, line: 10 },
    ]);
  });
});

describe('buildPortfolioSankey', () => {
  it('conserves visitors through each site', () => {
    const sankey = buildPortfolioSankey(sites);
    const siteLinks = sankey.links.filter(link => link.source === 'all');

    expect(siteLinks.map(link => link.value)).toEqual([1000, 500]);
    expect(
      sankey.links
        .filter(link => link.target === 'converted')
        .reduce((sum, link) => sum + link.value, 0),
    ).toBe(15);
    expect(
      sankey.links
        .filter(link => link.target === 'unconverted')
        .reduce((sum, link) => sum + link.value, 0),
    ).toBe(1485);
    expect(sankey.nodes.map(node => node.label)).toContain('Converted');
    expect(sankey.nodes.map(node => node.label)).toContain('alpha.com');
  });

  it('skips empty metrics', () => {
    expect(
      buildPortfolioSankey([{ name: 'empty', metrics: { visitors: 0, revenue: 0, payments: 0 } }]),
    ).toEqual({ nodes: [], links: [] });
  });
});

describe('formatPortfolioChartDate', () => {
  it('keeps the hour when the bucket has a time', () => {
    expect(formatPortfolioChartDate('2026-11-10')).toBe('Nov 10');
    expect(formatPortfolioChartDate('2026-11-10 14:00')).toContain('2');
  });
});
