# License and Brand Audit

- **Date:** 2026-11-04
- **Repository:** `talivia-group/talivia` @ `9b7ad2a`
- **Verdict:** the application source is MIT and can be forked and hosted
  commercially. Two things must be handled before launch: (1) a restrictive
  **AGPL** dependency (`ua-parser-js` v2) and (2) customer-facing Talivia
  branding and logo assets.

---

## 1. Repository license

`LICENSE` is the standard MIT License:

```
MIT License

Copyright (c) 2025 Talivia contributors
```

Keep this file unchanged. The fork must continue to ship the MIT copyright and
permission notice. Add a `THIRD_PARTY_NOTICES` file for dependency and asset
attribution (Phase 9).

No `ee/`, `enterprise/`, `proprietary/`, or separately licensed source
directory exists. `db/clickhouse` and `db/postgresql` contain SQL migrations
covered by the repository license. `packages/` does not exist in this fork
(that was a Tartly concept, not Talivia).

---

## 2. Trademarked / branded assets

These are Talivia-branded and must be replaced (not merely recolored) before
customer launch:

| Asset                     | Path                                                                                                                                                                        | Action                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Logo (dark)               | `src/assets/logo.svg`                                                                                                                                                       | Replace with Tartly mark                                                           |
| Logo (light)              | `src/assets/logo-white.svg`                                                                                                                                                 | Replace                                                                            |
| SVG component             | `src/components/svg/Logo.tsx`, `LogoWhite.tsx`                                                                                                                              | Replace source                                                                     |
| Favicon                   | `public/favicon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`                                                                                               | Regenerate                                                                         |
| Touch icons               | `public/apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `mstile-150x150.png`, `safari-pinned-tab.svg`                                    | Regenerate                                                                         |
| Web manifest              | `public/site.webmanifest` (`"name": "Talivia"`)                                                                                                                             | Rebrand                                                                            |
| Browser config            | `public/browserconfig.xml` (`TileColor #da532c`)                                                                                                                            | Rebrand or remove                                                                  |
| Marketing screenshot      | `public/talivia-gh-main.png`                                                                                                                                                | Remove                                                                             |
| Social/README images      | `README.md`, `README.zh-CN.md`                                                                                                                                              | Replace or rewrite                                                                 |
| App name in metadata      | `src/app/(main)/layout.tsx`, `src/app/(main)/app/**/layout.tsx`                                                                                                             | Rebrand                                                                            |
| Wordmark in nav           | `src/app/(main)/TopNav.tsx`                                                                                                                                                 | Rebrand                                                                            |
| Login heading             | `src/app/login/LoginForm.tsx`                                                                                                                                               | Rebrand                                                                            |
| Customer copy             | 112 case-sensitive `Talivia` strings under `src/` (many are customer-facing settings copy in `WebsiteRevenueSettings.tsx`, `WebsiteData.tsx`, `WebsiteApiKeysSettings.tsx`) | Rewrite                                                                            |
| i18n messages             | `public/intl/messages/*.json`                                                                                                                                               | Rebrand                                                                            |
| Package name              | `package.json` `"name": "talivia"`                                                                                                                                          | Rename (safe; internal)                                                            |
| Script names              | `scripts/talivia-attribution-worker.ts`                                                                                                                                     | Rename (internal)                                                                  |
| Import feature naming     | `Talivia` backup/import labels (`src/lib/analytics-imports/`, `/api/websites/[id]/imports/talivia`)                                                                         | Keep compatibility in code, rebrand UI copy only                                   |
| React UI dependency alias | `@talivia/react-zen` → `npm:@umami/react-zen@0.245.0`                                                                                                                       | Internal alias; may keep to avoid a mass rename, but do not present it as branding |

**Counts (verified 2026-11-04):**

- `grep -ril talivia src public` → 321 files (317 under `src`, 4 under
  `public`).
- `grep -R "@talivia/" src` → 239 import lines (dependency alias, not
  customer-facing).
- `grep -R "Talivia" src` → 112 case-sensitive occurrences; the customer-facing
  subset is mostly the files listed above.

**Fonts:** no font files are bundled (`find public src/assets -iname '*.woff*'
-o -iname '*.ttf'` returned nothing). The app uses the system/Inter stack
declared in `src/app/global.css` (`--font-family: Inter, ui-sans-serif, ...`).
There is therefore no font license to clear. Do not bundle Inter without
keeping its SIL OFL notice.

**GeoIP:** `src/lib/detect.ts` can read `geo/GeoLite2-City.mmdb`, but the
database is **not** in the repository. If we enable local GeoIP, we need a
MaxMind account and must comply with the GeoLite2 EULA (including attribution).
Using CDN/edge country headers (Vercel/Cloudflare) avoids this.

---

## 3. Dependency license inventory

Generated with `pnpm licenses list --json` on 2026-11-04. 692 MIT, 57
Apache-2.0, 43 ISC, 38 CC0-1.0, 22 BSD-3-Clause, 12 BSD-2-Clause, plus a small
tail of mixed licenses.

### Restrictive / must address

| Package                              | Version | License                 | Use                                                     | Risk                                                                                                                      | Action                                                                                                                                                                                                                                  |
| ------------------------------------ | ------- | ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ua-parser-js`                       | 2.0.9   | **AGPL-3.0-or-later**   | User-agent parsing in `src/lib/detect.ts` (`getDevice`) | AGPL's network-use clause may require publishing the corresponding source of the hosted service, or a commercial license. | **Replace before launch.** The only use is `device.type`; either pin the last MIT v1 release (verify compatibility) or replace with a small device regex + `detect-browser` (both already MIT/available). Do not ship while unresolved. |
| `@img/sharp-libvips-linux-x64`       | 1.2.4   | LGPL-3.0-or-later       | `sharp` image processing                                | Dynamic linking is generally acceptable for a SaaS; modifications to libvips would need release.                          | Keep; add notice; do not modify libvips.                                                                                                                                                                                                |
| `lightningcss` (+ platform binaries) | —       | MPL-2.0                 | Build-time CSS transform                                | File-level copyleft; no distribution obligation for unmodified files.                                                     | Keep; add notice.                                                                                                                                                                                                                       |
| `rollup-plugin-dts`                  | —       | LGPL-3.0-only           | Dev/build only                                          | Not distributed.                                                                                                          | Keep; dev-only.                                                                                                                                                                                                                         |
| `jszip`                              | —       | MIT OR GPL-3.0-or-later | Client-side zip                                         | Choose MIT.                                                                                                               | Keep.                                                                                                                                                                                                                                   |
| `caniuse-lite`                       | —       | CC-BY-4.0               | Build data                                              | Attribution required.                                                                                                     | Add attribution notice.                                                                                                                                                                                                                 |
| `@dicebear/*` collections            | —       | MIT AND CC-BY-4.0       | Generated avatars                                       | CC-BY attribution required for the avatar artwork.                                                                        | Add attribution; or replace avatars with a simple generated mark.                                                                                                                                                                       |
| `argparse`                           | —       | Python-2.0              | Transitive (CLI tooling)                                | Permissive.                                                                                                               | Keep.                                                                                                                                                                                                                                   |
| `pako`                               | —       | MIT AND Zlib            | Transitive                                              | Permissive.                                                                                                               | Keep.                                                                                                                                                                                                                                   |
| `@swc/core-*`                        | —       | Apache-2.0 AND MIT      | Next.js build                                           | Permissive.                                                                                                               | Keep.                                                                                                                                                                                                                                   |

### Verified permissive (selected)

| Package                                              | License                                              |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `next`, `react`, `react-dom`                         | MIT                                                  |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg`     | Apache-2.0                                           |
| `@umami/react-zen` (aliased as `@talivia/react-zen`) | MIT                                                  |
| `rrweb`, `rrweb-player`                              | MIT                                                  |
| `maxmind` (client library)                           | MIT                                                  |
| `detect-browser`                                     | MIT                                                  |
| `isbot`                                              | Unlicense                                            |
| `dodopayments`                                       | Apache-2.0                                           |
| `stripe`                                             | MIT                                                  |
| `bcryptjs`                                           | MIT (check version's license field; upstream is MIT) |
| `redis`, `kafkajs`, `croner`                         | MIT                                                  |

**Note:** this inventory covers direct + transitive packages installed at audit
time. Re-run `pnpm licenses list` after dependency changes and in CI. It is not
legal advice.

---

## 4. Talivia Agent Kit

- URL: <https://github.com/talivia-group/agent>
- API check on 2026-11-04: repository exists, **MIT License**, not archived.
- It is reusable with attribution. Phase 8 may reuse installation-verification
  ideas and MCP tool shapes, but must rebrand and must not call the Talivia
  Cloud OAuth endpoint (the OSS app does not expose it). Keep the MIT notice in
  `THIRD_PARTY_NOTICES`.

---

## 5. Required actions before launch

1. Replace `ua-parser-js` or obtain a commercial license; record the decision in
   `THIRD_PARTY_NOTICES`.
2. Replace every Talivia logo/favicon/manifest asset; do not merely recolor.
3. Rewrite customer-facing Talivia copy (settings, onboarding, emails, intl
   messages, login, metadata).
4. Keep `LICENSE` intact and add `THIRD_PARTY_NOTICES` with MIT attribution for
   Talivia and the third-party notices above.
5. Add a CI check that fails on newly introduced AGPL/GPL/SSPL dependencies
   (allowlist-driven).
6. Do not use Talivia's name, logo, or domain in marketing in a way that implies
   endorsement or affiliation.
7. Rebrand the package name and internal script names (low risk, avoids
   accidental references in logs/build output).
8. Re-run the license inventory and record the date before launch.
