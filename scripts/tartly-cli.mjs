#!/usr/bin/env node
/**
 * Tartly CLI — verify an installation without the browser.
 *
 * Usage:
 *   node scripts/tartly-cli.mjs verify   [--api-key KEY] [--url URL] [--json]
 *   node scripts/tartly-cli.mjs events   [--api-key KEY] [--limit 20] [--json]
 *   node scripts/tartly-cli.mjs diagnose [--api-key KEY] [--json]
 *
 * The key must be a website API key created in Settings → Websites → API keys.
 * It is sent only to the configured origin; the CLI never prints it.
 */

const DEFAULT_URL = 'http://localhost:3000';

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { command, json: false, limit: 20 };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--api-key') {
      options.apiKey = rest[index + 1];
      index += 1;
    } else if (arg === '--url') {
      options.url = rest[index + 1];
      index += 1;
    } else if (arg === '--limit') {
      options.limit = Number(rest[index + 1]);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function usage() {
  return `Tartly CLI

  tartly verify   [--api-key KEY] [--url URL] [--json]
  tartly events   [--api-key KEY] [--limit 20] [--json]
  tartly diagnose [--api-key KEY] [--url URL] [--json]

Environment:
  TARTLY_API_KEY   website API key (required unless --api-key is passed)
  TARTLY_URL       app origin (default: ${DEFAULT_URL})
`;
}

function resolveConfig(options) {
  const apiKey = options.apiKey || process.env.TARTLY_API_KEY;
  const url = (options.url || process.env.TARTLY_URL || DEFAULT_URL).replace(/\/$/, '');

  if (!apiKey) {
    throw new Error('Missing API key. Set TARTLY_API_KEY or pass --api-key.');
  }

  return { apiKey, url };
}

async function request(path, { apiKey, url }) {
  const response = await fetch(`${url}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = payload?.error?.code ? ` (${payload.error.code})` : '';
    throw new Error(`${path} failed with HTTP ${response.status}${code}`);
  }

  return payload;
}

function formatVerify(payload) {
  if (!payload.installed) {
    return `Not installed yet: ${payload.eventCount ?? 0} events received.`;
  }

  return `Installed: ${payload.eventCount.toLocaleString('en-US')} events. Last event: ${
    payload.lastEventAt ?? 'unknown'
  }.`;
}

function formatEvents(payload) {
  if (!payload.data?.length) {
    return 'No events received yet.';
  }

  return payload.data
    .map((event, index) => {
      const source = event.utmSource || event.referrerDomain || 'direct';
      return `${String(index + 1).padStart(2, ' ')}. ${event.createdAt ?? 'unknown'}  ${event.urlPath}  (${source})`;
    })
    .join('\n');
}

function formatDiagnose(payload) {
  const lines = payload.diagnosis.checks.map(check => {
    const marker = check.status === 'ok' ? 'OK  ' : check.status === 'warning' ? 'WARN' : 'FAIL';
    return `${marker} ${check.message}${check.fix ? `\n     Fix: ${check.fix}` : ''}`;
  });

  return `${payload.diagnosis.ok ? 'Installation looks healthy.' : 'Installation needs attention.'}\n\n${lines.join('\n')}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.command || options.command === 'help') {
    process.stdout.write(usage());
    return;
  }

  const config = resolveConfig(options);
  let payload;

  if (options.command === 'verify') {
    payload = await request('/api/developer/verify', config);
    process.stdout.write(
      options.json ? `${JSON.stringify(payload, null, 2)}\n` : `${formatVerify(payload)}\n`,
    );
  } else if (options.command === 'events') {
    payload = await request(`/api/developer/events?limit=${options.limit}`, config);
    process.stdout.write(
      options.json ? `${JSON.stringify(payload, null, 2)}\n` : `${formatEvents(payload)}\n`,
    );
  } else if (options.command === 'diagnose') {
    payload = await request('/api/developer/diagnose', config);
    process.stdout.write(
      options.json ? `${JSON.stringify(payload, null, 2)}\n` : `${formatDiagnose(payload)}\n`,
    );
  } else {
    throw new Error(`Unknown command: ${options.command}. Run "tartly help".`);
  }

  if (options.command === 'diagnose' && options.json === false && !payload.diagnosis.ok) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
