#!/usr/bin/env node
// Render the Vitest json-summary report as Markdown for the GitHub Actions job
// summary. Reads a local file only: no token, no third-party service.
import { readFileSync } from 'node:fs';

const summary = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8')).total;

const metrics = ['statements', 'branches', 'functions', 'lines'];
const rows = metrics.map(metric => {
  const entry = summary[metric];
  const pct = typeof entry?.pct === 'number' ? entry.pct.toFixed(2) : 'n/a';
  const counts = entry ? `${entry.covered} / ${entry.total}` : 'n/a';
  return `| ${metric} | ${pct}% | ${counts} |`;
});

const output = [
  '### Test coverage',
  '',
  '| Metric | Coverage | Covered / Total |',
  '| --- | --- | --- |',
  ...rows,
  '',
  'Floors are enforced by `vitest.config.ts`; this table is the measured result.',
  '',
].join('\n');

process.stdout.write(`${output}\n`);
