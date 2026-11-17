# Tartly picomatch 2.x security backport

- Base: the `picomatch@2.3.2` package resolved in `pnpm-lock.yaml`.
- Upstream fix logic: `micromatch/picomatch` commit `1bf0d04`, proposed in PR #237 for 4.x.
- Internal version: `2.3.3+tartly.0.1`. This is a local fork identifier, not an upstream npm release.
- Change: backport the single-branch repeated-extglob collapse to the 2.x parser without changing its major API.
- Regression coverage: `src/lib/picomatch-redos.test.ts`.
- Maintenance: replace this fork with an official 2.x patched release after verifying its regression behavior and updating the override and test.

The upstream MIT license is preserved in `LICENSE`.

- Formatting: the vendored upstream package directory is excluded from
  Biome so its source remains reviewable against upstream; the regression test
  stays in the repository formatter, linter, and test gate.
