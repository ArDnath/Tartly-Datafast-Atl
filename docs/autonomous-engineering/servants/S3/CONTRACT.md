# S3 — Reference inventory and triage (read-only)

## Objective

Enumerate every repository under `/home/ariyaman/Dev/fight/efforts/References`
(the actual contents, not any list in the prompt), classify licenses from files,
and score the relevant implementations.

## Hard rule

References are READ-ONLY. Do not write, format, install, build, or run anything
inside them. Never copy code into the main project in this task.

## Owned write scope

- `docs/market-intelligence/REFERENCE_INVENTORY.md`
- `docs/market-intelligence/REFERENCE_QUALITY_SCORES.md`

## Required per-repo record

- name, absolute path, purpose, stack/language, last commit date (from git log),
  license file + SPDX id (verified from the file), license class A/B/C
  (A permissive, B copyleft/network copyleft, C unclear), size, whether tests
  exist, package manager, top-level directories.
- category: web analytics / product analytics / revenue analytics / tracker-SDK /
  dashboard-UI / billing / infra / other.
- a 1-5 score on: production maturity, correctness signals, security posture,
  performance/scalability, maintainability, install simplicity, license fit
  (A=5, B=2), stack fit with Next.js/TypeScript/PostgreSQL. Show the table.
- notable files worth harvesting (exact paths), and what makes them valuable.
- reject reasons where relevant.

## Must inspect for real (not just filenames)

For each analytics/tracker repo: the tracker source, the ingestion handler, the
event schema, and the aggregation query. Record the file paths. If a repo is a
huge monorepo, time-box and say what you skipped.

## Acceptance criteria

Every directory in References appears exactly once in the inventory. License
classes are verified from LICENSE files. The quality table has one row per repo.
A "top 5 harvest candidates" section names exact files and the capability each
would provide.

## Budget

One pass, read-only. Prefer `rg`, `sed`, `git log`; avoid reading `node_modules`.
