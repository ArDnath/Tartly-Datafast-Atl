import { expect, test } from 'vitest';
import { sanitizeCsvData } from './csv';

test('neutralizes formula prefixes in object rows', () => {
  expect(
    sanitizeCsvData([
      { name: '=HYPERLINK("https://evil.example")', count: 2 },
      { name: '+cmd', count: 1 },
      { name: '-2+3', count: 1 },
      { name: '@SUM(A1)', count: 1 },
      { name: 'safe', count: 1 },
    ]),
  ).toEqual([
    { name: '\'=HYPERLINK("https://evil.example")', count: 2 },
    { name: "'+cmd", count: 1 },
    { name: "'-2+3", count: 1 },
    { name: "'@SUM(A1)", count: 1 },
    { name: 'safe', count: 1 },
  ]);
});

test('neutralizes formula prefixes in array rows', () => {
  expect(sanitizeCsvData([['=1+1', 'safe', 4]])).toEqual([["'=1+1", 'safe', 4]]);
});
