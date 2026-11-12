#!/usr/bin/env node
/*
 * End-to-end local analytics smoke test.
 *
 * It uses the public HTTP API only:
 *   register (or sign in) -> workspace -> website -> /api/send -> /api/websites/:id/stats
 *
 * Usage:
 *   node scripts/local-smoke.mjs
 *   SMOKE_EMAIL=you@example.com SMOKE_PASSWORD=... node scripts/local-smoke.mjs
 *
 * Required: the dev server must be running on APP_URL (default
 * http://localhost:3000). Each new run creates a fresh account, so repeated
 * runs are limited by the register rate limit (5 per IP per hour).
 */
import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import pg from 'pg';

const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL || `smoke-${Date.now()}@example.com`;
const password = process.env.SMOKE_PASSWORD || 'devpassword123';
const userAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

let sessionCookie = '';

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Origin: baseUrl,
    'User-Agent': userAgent,
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    ...extra,
  };
}

function captureCookie(response) {
  const values =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);

  const pairs = values.map(value => value.split(';')[0]).filter(Boolean);

  if (pairs.length) {
    sessionCookie = pairs.join('; ');
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: headers(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  captureCookie(response);

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${text}`);
  }

  return data;
}

async function authenticate() {
  if (!process.env.SMOKE_EMAIL) {
    const result = await api('/api/auth/register', {
      method: 'POST',
      body: { username: email, password, workspaceName: 'Local Smoke' },
    });

    console.log(`registered ${email} (${result.user.id})`);
    return;
  }

  const result = await api('/api/auth/login', {
    method: 'POST',
    body: { username: email, password },
  });

  console.log(`signed in ${result.user.username} (${result.user.id})`);
  return result.user;
}

async function ensureWebsite() {
  const websites = await api('/api/websites');
  const list = Array.isArray(websites) ? websites : websites?.data || [];

  if (list.length) {
    console.log(`using existing website ${list[0].id}`);
    return list[0];
  }

  const workspaces = await api('/api/workspaces');
  const workspaceId = workspaces?.[0]?.workspace?.id;

  if (!workspaceId) {
    // Registration deliberately creates only the user. The first-run flow
    // creates the invisible workspace and its first website in one request.
    const result = await api('/api/onboarding/website', {
      method: 'POST',
      body: { domain: 'smoke.example.com' },
    });

    console.log(
      `created onboarding workspace ${result.workspace.id} and website ${result.website.id}`,
    );
    return result.website;
  }

  const website = await api('/api/websites', {
    method: 'POST',
    body: {
      domain: 'smoke.example.com',
      name: 'Local Smoke',
      workspaceId,
    },
  });

  console.log(`created website ${website.id}`);
  return website;
}

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/**
 * Local-only test activation. Production has no free tier, so a freshly
 * registered workspace correctly rejects billable events until a subscription
 * is confirmed. This helper makes the local analytics loop testable without a
 * real provider. It refuses to run unless both the app and the database are
 * local, and can be disabled with SMOKE_ACTIVATE_WORKSPACE=0.
 */
async function activateLocalWorkspace(workspaceId) {
  if (!workspaceId || process.env.SMOKE_ACTIVATE_WORKSPACE === '0') {
    return false;
  }

  const appUrl = new URL(baseUrl);
  const databaseUrl = new URL(process.env.DATABASE_URL || '');

  if (!isLocalHost(appUrl.hostname) || !isLocalHost(databaseUrl.hostname)) {
    return false;
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();

  try {
    const result = await client.query(
      `update workspace
       set subscription_status = 'active'
       where workspace_id = $1 and deleted_at is null`,
      [workspaceId],
    );

    if (result.rowCount === 1) {
      console.log('activated the local smoke workspace for ingestion (test only)');
      return true;
    }

    return false;
  } finally {
    await client.end();
  }
}

async function readInstallStatus(website) {
  const response = await api(
    `/api/websites/install-status?workspaceId=${encodeURIComponent(website.workspaceId)}`,
  );
  const status = (response?.data || []).find(item => item.id === website.id);

  if (!status) {
    throw new Error('The install-status endpoint did not return the smoke website.');
  }

  return status;
}

async function waitForInstallStatus(website, expected) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const status = await readInstallStatus(website);

    if (status.connected === expected) {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  throw new Error(`Install status never became ${expected ? 'connected' : 'pending'}.`);
}

async function sendEvent(website) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  const result = await api('/api/send', {
    method: 'POST',
    body: {
      type: 'event',
      payload: {
        website: website.id,
        hostname: 'smoke.example.com',
        url: `https://smoke.example.com/?utm_source=local-smoke&utm_medium=script&utm_campaign=${suffix}`,
        referrer: 'https://www.google.com/search?q=local+smoke',
        title: 'Local Analytics Smoke',
        language: 'en-US',
        screen: '1920x1080',
        visitorId: `smoke-visitor-${suffix}`,
        sessionId: `smoke-session-${suffix}`,
      },
    },
  });

  if (result?.beep) {
    throw new Error('The collector rejected the request as a bot. Use a browser User-Agent.');
  }

  if (result?.ok === false) {
    throw new Error(
      `The collector rejected the event: ${result.reason}. ` +
        'A local smoke run activates its own workspace; if this is disabled, set SMOKE_ACTIVATE_WORKSPACE=1.',
    );
  }

  console.log(`sent event for session ${result.sessionId || 'created'}`);
}

async function readStats(website) {
  const now = Date.now();
  const startAt = now - 60 * 60 * 1000;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const stats = await api(
      `/api/websites/${website.id}/stats?startAt=${startAt}&endAt=${now}&unit=day&timezone=UTC`,
    );

    if (Number(stats.pageviews) > 0) {
      return stats;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return api(
    `/api/websites/${website.id}/stats?startAt=${startAt}&endAt=${now}&unit=day&timezone=UTC`,
  );
}

try {
  await authenticate();
  const website = await ensureWebsite();
  await activateLocalWorkspace(website.workspaceId);
  const installBefore = await readInstallStatus(website);

  console.log(
    `install reminder status before the event: ${installBefore.connected ? 'connected' : 'pending'}`,
  );

  await sendEvent(website);
  await waitForInstallStatus(website, true);
  const stats = await readStats(website);

  console.log(
    JSON.stringify(
      {
        websiteId: website.id,
        pageviews: Number(stats.pageviews),
        visitors: Number(stats.visitors),
        visits: Number(stats.visits),
      },
      null,
      2,
    ),
  );

  if (Number(stats.pageviews) < 1) {
    throw new Error('Analytics query returned no pageviews; ingestion or query is not working.');
  }

  console.log('OK: ingestion, analytics query, and install-status reminder are working.');
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
