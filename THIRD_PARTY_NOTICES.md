# Third-Party Notices

Tartly is a fork of **Talivia** (<https://github.com/talivia-group/talivia>),
licensed under the MIT License. The original `LICENSE` file is kept intact.

## Talivia

```
MIT License

Copyright (c) 2025 Talivia contributors
```

The Talivia name, logo, and brand assets are not part of the MIT license grant
in the sense of trademark permission. They have been replaced in
customer-facing surfaces. Do not imply affiliation with Talivia Cloud.

## Talivia Agent Kit

<https://github.com/talivia-group/agent> — MIT License. Reused concepts must keep
this notice.

## Fonts

No font files are bundled. The UI uses the system stack with Inter as the first
preference. If Inter is later bundled, include its SIL Open Font License notice.

## Dependency inventory

Run `pnpm licenses list` to regenerate. The inventory on 2026-11-04 contained
692 MIT, 57 Apache-2.0, 43 ISC, 38 CC0-1.0, 22 BSD-3-Clause, and a small tail of
mixed licenses.

### Open issue: `ua-parser-js` is AGPL-3.0-or-later

`ua-parser-js@2.0.9` is used in `src/lib/detect.ts` (`getDevice`). Its AGPL
network-use clause may require releasing the corresponding source of the hosted
service, or purchasing a commercial license. **Resolve before launch:**
replace it with a permissive device parser or buy a license.

### Attribution-required assets

- `caniuse-lite` — CC-BY-4.0 (build data).
- `@dicebear/*` avatar collections — MIT AND CC-BY-4.0 (generated avatar art).

### Copyleft libraries that are acceptable as used

- `@img/sharp-libvips-*` — LGPL-3.0-or-later, dynamically linked by `sharp`.
  Do not modify libvips without releasing the changes.
- `lightningcss` — MPL-2.0, build-time only.
- `rollup-plugin-dts` — LGPL-3.0-only, development only.

### Other notable licenses

- Next.js, React, Prisma, rrweb, `@umami/react-zen` (aliased as
  `@talivia/react-zen`), Stripe SDK: MIT/Apache-2.0.
- Dodo SDK: Apache-2.0.
- `isbot`: Unlicense.
