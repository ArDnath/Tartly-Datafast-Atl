# Independent review — PR #54

- **Date:** 2026-11-15
- **Scope:** commits `d5a0a23`, `5e4ff16`, `77c6b34`, `d2cea71`
- **Reviewer:** independent read-only agent (no implementation)
- **Verdict:** CHANGES_REQUESTED → resolved in `77c6b34`; residual limitation
  recorded in `PRODUCTION_READINESS.md`.

## Findings and resolution

| #   | Severity | Finding                                                                                                     | Resolution                                                                                                              |
| --- | -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | P1       | Provider-period switch re-keyed the open usage counter, resetting usage and granting a second allowance.    | `getUsagePeriodRangeForWorkspace` adopts an open row and extends its end; it never re-keys an open counter. Test added. |
| 2   | P1       | Usage notices compared against the base plan, ignoring `trafficTierIndex`.                                  | Notices resolve `resolvePlanForTrafficTier`; tier test added.                                                           |
| 3   | P1       | `api_access` gate on API-key creation blocked the Starter Manual payment API and the revenue settings load. | Key creation is open; the developer read API is gated on `api_access`. Tests added.                                     |
| 4   | P1       | A ClickHouse failure after the PostgreSQL commit was hidden as a duplicate on retry.                        | Known dual-write limitation documented; PostgreSQL remains the source of truth. Not replayed automatically.             |
| 5   | P1       | Link and pixel events skipped the idempotency key.                                                          | Key derives from `sourceId`; link test added.                                                                           |
| 6   | P2       | Retention redacted Stripe invoice payloads still used by refund reconciliation.                             | Refund event types are excluded from payload redaction.                                                                 |
| 7   | P2       | Retention deleted audit rows, contradicting the durable-audit rule.                                         | Audit rows are retained; only `ip_address` is redacted.                                                                 |
| 8   | P2       | Retention cutoffs had no usable index.                                                                      | Global `received_at`/`created_at` indexes added by migration.                                                           |
| 9   | P2       | Expired shares were still accepted through a previously minted token.                                       | `parseShareToken` rejects an expired share. Test added.                                                                 |
| 10  | P2       | Share tokens bypassed the journey plan gate.                                                                | Share-token reads resolve the owning workspace entitlement.                                                             |
| 11  | P2       | Session-replay read routes were ungated.                                                                    | All replay read handlers require `session_replay`.                                                                      |
| 12  | P2       | Payment-connection limit counted provider names, not rows.                                                  | Counts active rows; same-provider updates remain allowed.                                                               |
| 13  | P2       | Short legacy `eventId` values were rejected; duplicate responses cleared the tracker cache.                 | Schema accepts any length; tracker ignores cache/linker fields on `duplicate: true`.                                    |
| 14  | P2       | Docs overclaimed and tests used a constant UUID.                                                            | Counts updated; real deterministic-key test added; review caveats recorded.                                             |

## Evidence

- `pnpm gate` exit 0 after the fixes: 234 test files, 1,152 tests, 78 static
  pages. Log: `/tmp/opencode/gate-feature15-r2.log`.
- PR checks on the first commit: Verify, Security, CodeQL, Container, Trivy
  all pass. Final head re-ran the same workflows.
