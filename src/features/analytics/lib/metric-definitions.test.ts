import { expect, test } from 'vitest';
import { METRIC_DEFINITIONS } from './metric-definitions';

test('every overview metric has a concrete definition', () => {
  for (const [key, value] of Object.entries(METRIC_DEFINITIONS)) {
    expect(value.length, key).toBeGreaterThan(40);
    expect(value, key).not.toMatch(/lorem|tbd|placeholder/i);
  }
});

test('the visitors definition exposes the cookieless limitation', () => {
  expect(METRIC_DEFINITIONS.visitors).toMatch(/cookieless/i);
  expect(METRIC_DEFINITIONS.visitors).toMatch(/rotating keyed hash/i);
});
