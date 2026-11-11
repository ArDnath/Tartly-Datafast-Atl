#!/usr/bin/env node
// Post-deploy smoke checks for the public production surface.
//
// The deploy only passes when the running build reports the exact commit SHA
// that was deployed and every core public route answers 200. The checks use
// the standard fetch implementation, so they work on the GitHub runner and on
// any host with Node 22 or newer. No credentials and no third-party client are
// required.

import { pathToFileURL } from 'node:url';

const DEFAULT_PUBLIC_PATHS = ['/', '/pricing', '/docs', '/login', '/robots.txt', '/sitemap.xml'];

const HEALTH_CHECKS = [
  { path: '/api/health/live', requireDatabase: false },
  { path: '/api/health/ready', requireDatabase: true },
];

function normalizeBaseUrl(value) {
  if (!value) {
    throw new Error('DEPLOY_URL (or APP_URL) is required');
  }

  const url = new URL(value);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`DEPLOY_URL must use http or https, got ${url.protocol}`);
  }

  const path = url.pathname.replace(/\/+$/, '');

  return `${url.origin}${path}`;
}

async function request(fetchImpl, url, timeoutMs) {
  return fetchImpl(url, {
    redirect: 'manual',
    headers: { 'user-agent': 'tartly-deploy-smoke/1' },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/**
 * Run the deploy smoke suite.
 *
 * @param {object} options
 * @param {string} options.baseUrl Public origin, for example https://tartly.in
 * @param {string} options.expectedVersion Full commit SHA expected from health
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs]
 * @param {string[]} [options.publicPaths]
 * @param {(message: string) => void} [options.log]
 * @returns {Promise<{baseUrl: string, expectedVersion: string, checked: number}>}
 */
export async function runDeploySmoke({
  baseUrl,
  expectedVersion,
  fetchImpl = fetch,
  timeoutMs = 15000,
  publicPaths = DEFAULT_PUBLIC_PATHS,
  log = console.log,
} = {}) {
  const base = normalizeBaseUrl(baseUrl);

  if (!expectedVersion) {
    throw new Error('EXPECTED_VERSION is required');
  }

  const failures = [];

  const check = async (path, expectedStatus, validate) => {
    const url = `${base}${path}`;
    let response;

    try {
      response = await request(fetchImpl, url, timeoutMs);
    } catch (error) {
      failures.push(`${path}: request failed (${error.message})`);
      return;
    }

    if (response.status !== expectedStatus) {
      failures.push(`${path}: expected ${expectedStatus}, got ${response.status}`);
      return;
    }

    if (validate) {
      let body;

      try {
        body = await response.json();
      } catch {
        failures.push(`${path}: response is not JSON`);
        return;
      }

      const problem = validate(body);

      if (problem) {
        failures.push(`${path}: ${problem}`);
        return;
      }
    }

    log(`  ok ${response.status} ${path}`);
  };

  for (const health of HEALTH_CHECKS) {
    await check(health.path, 200, body => {
      if (body?.ok !== true) {
        return 'ok is not true';
      }
      if (body?.version !== expectedVersion) {
        return `version is ${body?.version ?? 'missing'}, expected ${expectedVersion}`;
      }
      if (health.requireDatabase && body?.database !== 'up') {
        return `database is ${body?.database ?? 'missing'}, expected up`;
      }
      return null;
    });
  }

  for (const path of publicPaths) {
    await check(path, 200);
  }

  if (failures.length > 0) {
    throw new Error(`deploy smoke failed:\n- ${failures.join('\n- ')}`);
  }

  log(`deploy smoke passed for ${base} at ${expectedVersion}`);

  return {
    baseUrl: base,
    expectedVersion,
    checked: HEALTH_CHECKS.length + publicPaths.length,
  };
}

async function main() {
  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 15000);

  try {
    await runDeploySmoke({
      baseUrl: process.env.DEPLOY_URL ?? process.env.APP_URL,
      expectedVersion: process.env.EXPECTED_VERSION,
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
    });
  } catch (error) {
    console.error(`[smoke] ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
