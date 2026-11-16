import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const DEPLOY_SCRIPT = new URL('../deploy/production/deploy.sh', import.meta.url);

// The deploy workflow pipes this script to `bash -s` over SSH, so the script
// itself is on stdin. A command that inherits stdin can consume the remaining
// script; bash then reaches EOF and exits 0 in the middle of a deploy, leaving
// the old container running and the step green.
async function deployScriptLines() {
  const source = await readFile(DEPLOY_SCRIPT, 'utf8');
  return source.split('\n');
}

test('deploy script sends every compose command its own stdin', async () => {
  const offenders = (await deployScriptLines()).filter(
    line => /COMPOSE\[@\]/.test(line) && !line.includes('</dev/null'),
  );

  assert.deepEqual(
    offenders,
    [],
    `compose commands must redirect stdin (</dev/null):\n${offenders.join('\n')}`,
  );
});

test('clickhouse readiness probe cannot swallow the rest of the script', async () => {
  const lines = await deployScriptLines();
  const probe = lines.find(line => line.includes('clickhouse-client'));

  assert.ok(probe, 'expected a clickhouse-client readiness probe in deploy.sh');
  assert.match(probe, /<\/dev\/null/, 'readiness probe must redirect stdin');
  assert.match(probe, />\/dev\/null 2>&1/, 'readiness probe must stay quiet');
});

test('deploy script never reads interactive credentials', async () => {
  const lines = await deployScriptLines();
  const offenders = lines.filter(line => /^\s*(?:sudo\s+)?(?:ssh|scp|git clone|read)\s/.test(line));

  assert.deepEqual(offenders, [], `unexpected interactive command:\n${offenders.join('\n')}`);
});
