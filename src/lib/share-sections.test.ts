import { expect, test } from 'vitest';
import { canAccessWebsiteShareRequest } from './share-sections';

const base = {
  method: 'GET',
  parameters: { overview: true },
};

test('allows ordinary overview metrics for a website share', () => {
  expect(
    canAccessWebsiteShareRequest({
      ...base,
      pathname: '/api/websites/website-1/metrics',
      query: { type: 'browser' },
    }),
  ).toBe(true);
});

test('blocks raw distinct IDs from share metrics and values', () => {
  expect(
    canAccessWebsiteShareRequest({
      ...base,
      pathname: '/api/websites/website-1/metrics',
      query: { type: 'distinctId' },
    }),
  ).toBe(false);
  expect(
    canAccessWebsiteShareRequest({
      ...base,
      pathname: '/api/websites/website-1/values',
      query: { type: 'distinctId' },
    }),
  ).toBe(false);
});

test('blocks raw URL query strings from share metrics and values', () => {
  expect(
    canAccessWebsiteShareRequest({
      ...base,
      pathname: '/api/websites/website-1/metrics/expanded',
      query: { type: 'query' },
    }),
  ).toBe(false);
  expect(
    canAccessWebsiteShareRequest({
      ...base,
      pathname: '/api/websites/website-1/values',
      query: { type: 'query' },
    }),
  ).toBe(false);
});

test('keeps non-sensitive filter values available to shares', () => {
  expect(
    canAccessWebsiteShareRequest({
      ...base,
      pathname: '/api/websites/website-1/values',
      query: { type: 'browser' },
    }),
  ).toBe(true);
});
