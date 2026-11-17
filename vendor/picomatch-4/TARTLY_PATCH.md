# Tartly picomatch 4.x security fork

- Base: the `picomatch@4.0.7` package resolved in `pnpm-lock.yaml`.
- Upstream fix: `micromatch/picomatch` commit `1bf0d04`, proposed in PR #237.
- Internal version: `4.0.8+tartly.0.1`. This is a local fork identifier, not an upstream npm release.
- Change: collapse a single-branch repeated extglob containing a self-repeating star so its generated regular expression has no nested unbounded quantifier.
- Regression coverage: `src/lib/picomatch-redos.test.ts`.
- Maintenance: replace this fork with an official same-major patched release after verifying its regression behavior and updating the override and test.

The upstream MIT license is preserved in `LICENSE`.

- Formatting: the vendored upstream package directory is excluded from
  Biome so its source remains reviewable against upstream; the regression test
  stays in the repository formatter, linter, and test gate.
