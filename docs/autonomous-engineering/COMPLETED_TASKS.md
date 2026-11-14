# Completed tasks

Evidence is a file, test result, or recorded command. This list is intentionally
narrow: a task is complete only when the behaviour was executed or a test
asserts it.

| ID  | Task                                                                 | Evidence                                                                     |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| C1  | Cookieless tracker with no `document.cookie`                         | `src/tracker/index.js`; 28 tracker tests; built 10,335 B / 4.20 KB gzip      |
| C2  | Tab-scoped session token with 30-minute rolling expiry               | tracker tests "sessionStorage", "rolling session"                            |
| C3  | Server-derived keyed rotating visitor hash                           | `send/handler.ts`; live local cookieless event with non-null visitor/session |
| C4  | Consent-aware mode + GPC + opt-in DNT                                | tracker tests for consent, revoke, GPC                                       |
| C5  | Opt-in outbound/download events with precedence                      | 3 tracker tests                                                              |
| C6  | SPA coverage: pushState, replaceState, popstate, hashchange, bfcache | hash-route test                                                              |
| C7  | Wrapper custom event on a child click                                | wrapper test                                                                 |
| C8  | Collector timestamp window (7 days past / 5 min future)              | 2 collector tests + `docs/ANALYTICS_VALIDATION.md`                           |
| C9  | Cross-domain identity token width consistency                        | 100-char collector test + custom linker test                                 |
| C10 | Last touch ignores performance beacons                               | attribution journeys test                                                    |
| C11 | Monthly visitor rotation default (attribution stability)             | `.env.example`, handler default, legal/docs copy                             |
| C12 | In-product KPI definitions                                           | `metric-definitions.ts`; 2 tests; overview tooltips                          |
| C13 | Revenue page opens channel revenue sorted by revenue                 | `Revenue.tsx`; build                                                         |
| C14 | Session replay switch + Pro enforcement                              | website handler 5 tests; edit form test; docs                                |
| C15 | Honest pre-payment install state                                     | verify handler 2 tests; `InstallExperience` copy                             |
| C16 | First run lands on the site                                          | onboarding 59 tests                                                          |
| C17 | No fabricated zero-data chart line                                   | portfolio test                                                               |
| C18 | Pro website limit aligned to 20                                      | plans 9 tests                                                                |
| C19 | Analytics retention in PostgreSQL                                    | retention tests 6                                                            |
| C20 | ClickHouse retention/deletion code + TTL migration                   | 4 helper tests; **live run blocked (B1)**                                    |
| C21 | Umami MIT notice restored                                            | `THIRD_PARTY_NOTICES.md`                                                     |
| C22 | Resource watchdog + 2-worker gate                                    | `scripts/agent-resource-guard.sh`; `package.json`                            |
| C23 | Full release gate                                                    | `pnpm gate` exit 0: 228 files / 1,130 tests / 78 static pages                |
| C24 | Live local ingestion smoke                                           | `pnpm smoke:local`: 1 pageview / 1 visitor / 1 visit                         |
| C25 | Research artifacts                                                   | S1/S2/S3/S4 + H-TRACKER/H-BACKEND/H-UX docs                                  |
