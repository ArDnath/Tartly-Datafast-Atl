# H-BACKEND — Ingestion, storage, aggregation deep dive (read-only)

## Objective

Trace the full backend path in the references and compare it with this repo.
Do not change code.

## Owned write scope

- `docs/architecture/HARVEST_BACKEND.md`

## Inputs

- `docs/market-intelligence/REFERENCE_INVENTORY.md`
- `/home/ariyaman/Dev/fight/efforts/References/*` (READ-ONLY)
- This repo: `src/features/analytics/server/send/`, `src/features/analytics/server/queries/`,
  `prisma/schema.prisma`, `db/clickhouse/`, `src/lib/usage.ts`

## Required hop-by-hop comparison

client payload → collector endpoint → validation → site/origin check → bot
filter → normalization → dedup/idempotency → queue/buffer → persistence →
aggregation → query API.

For Umami, Talivia, DataGoat, minilytics, Plausible (concept only), and the
existing app:

- file paths for each hop;
- how identity, dedup, and usage metering work;
- what runs in PostgreSQL vs ClickHouse;
- index and retention choices;
- failure and backpressure behaviour;
- one measurable scalability/cost lesson.

Then a decision table:
`| Capability | Best source | License class | Adopt / reimplement / reject | Why | Target file | Acceptance test |`

The repo already has ClickHouse, Kafka, Redis, and PostgreSQL. Do not propose
new infrastructure. Prefer the simplest change that improves correctness or
cost.

Close with the three highest-value backend changes still missing, ranked by
revenue/cost/security impact.

## Acceptance criteria

Every hop has real file refs for at least three references. No fabricated
benchmarks. Class B code is concept-only. Target 150-250 lines.
