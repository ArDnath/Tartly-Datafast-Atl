import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type Picomatch = {
  isMatch(input: string, pattern: string): boolean;
  makeRe(pattern: string): RegExp;
};

const require = createRequire(import.meta.url);

const nextIntlPlugin = require.resolve('next-intl/plugin');
const parcelWatcher = createRequire(nextIntlPlugin).resolve('@parcel/watcher');
const picomatch4 = createRequire(parcelWatcher)('picomatch') as Picomatch;

const copyPlugin = require.resolve('rollup-plugin-copy');
const globby = createRequire(copyPlugin).resolve('globby');
const fastGlob = createRequire(globby).resolve('fast-glob');
const micromatch = createRequire(fastGlob).resolve('micromatch');
const picomatch2 = createRequire(micromatch)('picomatch') as Picomatch;

const vulnerablePatterns = ['+(*)', '+(*a)', '*(*a)', '+(a*)', '+(a*b)', '*(*.js)'];

function verifySafeRepeatedExtglobs(picomatch: Picomatch) {
  for (const pattern of vulnerablePatterns) {
    expect(picomatch.makeRe(pattern).source).not.toMatch(/\)[+*]/);
  }

  expect(picomatch.isMatch('abc', '+(*)c')).toBe(true);
  expect(picomatch.isMatch('aaa', '+(*a)')).toBe(true);
  expect(picomatch.isMatch('axbayb', '+(a*b)')).toBe(true);
  expect(picomatch.isMatch('foo.js', '*(*.js)')).toBe(true);
  expect(picomatch.isMatch('foo.ts', '*(*.js)')).toBe(false);
}

describe('patched transitive picomatch', () => {
  it('keeps the production next-intl watcher path safe', () => {
    verifySafeRepeatedExtglobs(picomatch4);
  });

  it('keeps the development micromatch path safe', () => {
    verifySafeRepeatedExtglobs(picomatch2);
  });
});
