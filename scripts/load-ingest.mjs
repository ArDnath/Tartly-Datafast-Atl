#!/usr/bin/env node
/**
 * Opt-in ingestion load probe.
 *
 * This is not part of CI and it writes real analytics rows to the target
 * database. Use a disposable website and delete it afterwards.
 *
 *   REVENUELENS_URL=http://localhost:3000 \
 *   REVENUELENS_WEBSITE_ID=<uuid> \
 *   node scripts/load-ingest.mjs --events 2000 --concurrency 25
 *
 * It prints accepted/rate-limited/error counts and latency percentiles. It does
 * not claim that a 2,000-event run proves production scale; record the result in
 * docs/SECURITY_REVIEW.md with the environment, date, and database instance.
 */

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}

const origin = (process.env.REVENUELENS_URL || 'http://localhost:3000').replace(/\/$/, '');
const websiteId = process.env.REVENUELENS_WEBSITE_ID || readArg('website-id');
const total = Number(readArg('events', 1000));
const concurrency = Number(readArg('concurrency', 20));

if (!websiteId) {
  process.stderr.write('Set REVENUELENS_WEBSITE_ID or pass --website-id.\n');
  process.exit(1);
}

if (!Number.isInteger(total) || total < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
  process.stderr.write('--events and --concurrency must be positive integers.\n');
  process.exit(1);
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function makeEvent(index) {
  return {
    type: 'event',
    payload: {
      website: websiteId,
      hostname: 'loadtest.example.com',
      url: `/load/${index % 20}?utm_source=load&utm_campaign=probe`,
      referrer: 'https://www.google.com/',
      title: `Load probe ${index}`,
      language: 'en-US',
      screen: '1920x1080',
      visitorId: `load-visitor-${index % 250}`,
      sessionId: `load-session-${index % 1000}`,
    },
  };
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function sendOne(index) {
  const startedAt = performance.now();

  try {
    const response = await fetch(`${origin}/api/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
        origin: origin,
      },
      body: JSON.stringify(makeEvent(index)),
    });

    await response.text();
    return { status: response.status, latency: performance.now() - startedAt };
  } catch (error) {
    return {
      status: 0,
      latency: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const results = [];
  let next = 0;

  async function worker() {
    while (next < total) {
      const index = next;
      next += 1;
      results.push(await sendOne(index));
    }
  }

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const duration = performance.now() - startedAt;

  const latencies = results.map(result => result.latency);
  const byStatus = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});

  process.stdout.write(
    `${JSON.stringify(
      {
        origin,
        websiteId,
        events: total,
        concurrency,
        durationMs: Math.round(duration),
        requestsPerSecond: Number((total / (duration / 1000)).toFixed(1)),
        byStatus,
        latencyMs: {
          p50: Math.round(percentile(latencies, 50)),
          p95: Math.round(percentile(latencies, 95)),
          p99: Math.round(percentile(latencies, 99)),
          max: Math.round(Math.max(...latencies)),
        },
      },
      null,
      2,
    )}\n`,
  );

  const failures = results.filter(result => result.status !== 200);

  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
