# Load and concurrency probe

Date: 2026-11-06
Environment: local Linux, single Next.js production process (`next start`),
PostgreSQL 17 at `localhost:5433`, no Redis, no ClickHouse, no external CDN.
Tool: `scripts/load-ingest.mjs` (open-loop enough for a small probe; not a
distributed load generator).

## Result

| Metric | Value |
| --- | --- |
| Events requested | 10,000 |
| Concurrency | 50 |
| Wall time | 63.6 s |
| Throughput | **157.1 req/s** |
| HTTP 200 | 10,000 |
| Errors | **0** |
| p50 | **302 ms** |
| p95 | **412 ms** |
| p99 | **480 ms** |
| Max | 959 ms |
| Rows stored | 10,001 (1 warm-up event + 10,000 probe) |
| Usage counter | **10,001** (exact match; no under/overcount) |

A second, smaller warm-up run (2,000 events / 25 concurrency) produced 236 req/s
with p50 96 ms / p95 140 ms / p99 558 ms. The larger run is the recorded result.

## What this proves

- Ingestion stores every accepted event and the atomic usage counter matches
  the stored row count exactly under 50 concurrent clients.
- The production build serves the collector without errors on a single node.
- The plan limit path was exercised separately: a workspace with no usable
  entitlement now returns `403 workspace-unavailable` before creating a session.

## What this does not prove

- 1M RPS, distributed load, or multi-region behaviour.
- A sustained 30–60 minute soak (memory leaks, GC, socket exhaustion).
- Replay/recording ingestion, which is heavier and separately metered.
- Neon network latency; this run used a local PostgreSQL.
- Behaviour with Redis/ClickHouse enabled.

## Bug found and fixed by this probe

The first probe used a soft-deleted workspace. The collector created 1,000
sessions and then rejected the events with `usage_limit_reached`, leaving orphan
sessions. The handler now resolves entitlements and reserves the billable event
**before** creating a session or visitor context. A deleted/suspended workspace
returns `403` and writes nothing. Regression test:
`src/features/analytics/server/send/handler.test.ts` ("rejects a website whose
workspace is unavailable before creating a session").

## Reproduce

```bash
# fresh workspace + website with an active Starter plan
REVENUELENS_URL=http://localhost:3000 \
REVENUELENS_WEBSITE_ID=<website-uuid> \
node scripts/load-ingest.mjs --events 10000 --concurrency 50
```

Delete the probe website/events afterwards. Never run this against production
without a disposable website and a maintenance window.
