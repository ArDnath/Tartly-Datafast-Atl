# Code provenance

Every adopted pattern, ported file, or reimplementation records its source,
license class, and method. Class B/C source is never pasted into this product;
only concepts and documented behaviour are used.

| Capability                                         | Source                           | License class                      | Method                                                         | Target                                                                  | Status          |
| -------------------------------------------------- | -------------------------------- | ---------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------- |
| Cookieless visitor identity (rotating salted hash) | Umami, Plausible (concept)       | A (Umami MIT) / B (Plausible AGPL) | Reimplemented from concept in this repo; no source copied      | `src/tracker/index.js`, `src/features/analytics/server/send/handler.ts` | done 2026-11-14 |
| Tab-scoped session token, no cookies               | Umami (concept)                  | A                                  | Reimplemented independently                                    | `src/tracker/index.js`                                                  | done 2026-11-14 |
| Outbound link and download events                  | Umami, Plausible (concept)       | A / B                              | Reimplemented independently; opt-in design is ours             | `src/tracker/index.js`                                                  | done 2026-11-14 |
| Revenue attribution / payment lifecycle            | Talivia (existing fork baseline) | A (MIT)                            | Already present in the source of truth; audited, not re-ported | `src/features/payments/**`                                              | baseline        |

## Rules

1. Class A code may be ported with the copyright notice retained and an entry
   in `THIRD_PARTY_NOTICES.md`.
2. Class B/C code is never copied or translated line by line. Only the concept,
   observed behaviour, and independently written tests are used.
3. Any future port adds a row before the code is committed.
