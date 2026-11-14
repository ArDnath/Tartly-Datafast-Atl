import { describe, expect, test } from 'vitest';
import { getRandomChars } from './generate';

describe('getRandomChars', () => {
  test('returns the requested length from the allowed alphabet', () => {
    const value = getRandomChars(32);

    expect(value).toHaveLength(32);
    expect(value).toMatch(/^[0-9a-zA-Z]{32}$/);
  });

  test('does not repeat for consecutive calls', () => {
    const values = new Set(Array.from({ length: 20 }, () => getRandomChars(16)));

    expect(values.size).toBe(20);
  });

  test('rejects an empty alphabet', () => {
    expect(() => getRandomChars(4, '')).toThrow();
  });
});
