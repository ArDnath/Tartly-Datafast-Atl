import { expect, test } from 'vitest';
import {
  createSqlInList,
  createWebsiteOverviewChart,
  mergePortfolioMrrRows,
  mergeWebsiteOverview,
} from './website-overview';

test('mergeWebsiteOverview attaches zero metrics to websites without activity', () => {
  const [website] = mergeWebsiteOverview([{ id: 'website-1', name: 'Example' }], [], 'EUR');

  expect(website.metrics).toEqual({
    pageviews: 0,
    visitors: 0,
    visits: 0,
    payments: 0,
    revenue: 0,
    currency: 'EUR',
  });
});

test('mergeWebsiteOverview accumulates traffic and revenue rows by website', () => {
  const [website] = mergeWebsiteOverview(
    [{ id: 'website-1', name: 'Example' }],
    [
      { websiteId: 'website-1', visitors: 3 },
      { websiteId: 'website-1', pageviews: '8', visits: '5' },
      { websiteId: 'website-1', payments: 2, revenue: '49.5', currency: 'USD' },
    ],
    'EUR',
  );

  expect(website.metrics).toEqual({
    pageviews: 8,
    visitors: 3,
    visits: 5,
    payments: 2,
    revenue: 49.5,
    currency: 'USD',
  });
});

test('createSqlInList builds rawQuery-compatible placeholders', () => {
  const values = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];

  const list = createSqlInList('websiteId', values, 'uuid');

  expect(list.sql).toBe('{{websiteId0::uuid}}, {{websiteId1::uuid}}');
  expect(list.params).toEqual({
    websiteId0: values[0],
    websiteId1: values[1],
  });
});

test('createWebsiteOverviewChart fills missing days and merges visitor and revenue rows', () => {
  const chart = createWebsiteOverviewChart(
    ['2026-06-18', '2026-06-19'],
    [
      { websiteId: 'website-1', date: '2026-06-18', visitors: 4 },
      { websiteId: 'website-1', date: '2026-06-19', visitors: '7' },
      { websiteId: 'website-2', date: '2026-06-19', visitors: 2 },
    ],
    [{ websiteId: 'website-1', date: '2026-06-19', revenue: '25.5', payments: 1 }],
  );

  expect(chart.get('website-1')).toEqual([
    { date: '2026-06-18', visitors: 4, revenue: 0, payments: 0 },
    { date: '2026-06-19', visitors: 7, revenue: 25.5, payments: 1 },
  ]);
  expect(chart.get('website-2')).toEqual([
    { date: '2026-06-18', visitors: 0, revenue: 0, payments: 0 },
    { date: '2026-06-19', visitors: 2, revenue: 0, payments: 0 },
  ]);
});

test('createWebsiteOverviewChart preserves hourly buckets for filtered mini charts', () => {
  const chart = createWebsiteOverviewChart(
    ['2026-06-22T06:00:00Z', '2026-06-22T07:00:00Z'],
    [{ websiteId: 'website-1', date: '2026-06-22T06:00:00Z', visitors: 3 }],
    [{ websiteId: 'website-1', date: '2026-06-22T07:00:00Z', revenue: 42, payments: 1 }],
  );

  expect(chart.get('website-1')).toEqual([
    { date: '2026-06-22T06:00:00Z', visitors: 3, revenue: 0, payments: 0 },
    { date: '2026-06-22T07:00:00Z', visitors: 0, revenue: 42, payments: 1 },
  ]);
});

test('mergePortfolioMrrRows groups subscriptions by first-touch channel', () => {
  const mrr = mergePortfolioMrrRows([
    { source: 'google', medium: 'organic', mrr: 20, subscriptions: 1, currency: 'usd' },
    { source: 'google', medium: 'organic', mrr: 10, subscriptions: 1, currency: 'usd' },
    { source: 'newsletter', medium: 'email', mrr: 15, subscriptions: 1, currency: 'USD' },
    { source: null, medium: null, mrr: 5, subscriptions: 1, currency: 'USD' },
  ]);

  expect(mrr.currency).toBe('USD');
  expect(mrr.totalMrr).toBe(50);
  expect(mrr.channels.map(row => [row.channel, row.mrr, row.subscriptions])).toEqual([
    ['organicSearch', 30, 2],
    ['email', 15, 1],
    ['direct', 5, 1],
  ]);
});

test('mergePortfolioMrrRows refuses to invent a total across currencies', () => {
  const mrr = mergePortfolioMrrRows([
    { source: 'google', medium: 'organic', mrr: 20, subscriptions: 1, currency: 'USD' },
    { source: 'facebook', medium: 'social', mrr: 10, subscriptions: 1, currency: 'EUR' },
  ]);

  expect(mrr.totalMrr).toBeNull();
  expect(mrr.currency).toBeNull();
  expect(mrr.channels.map(row => row.currency)).toEqual(['USD', 'EUR']);
});

test('mergePortfolioMrrRows returns an empty shape without active subscriptions', () => {
  expect(mergePortfolioMrrRows([])).toEqual({ totalMrr: 0, currency: null, channels: [] });
});
