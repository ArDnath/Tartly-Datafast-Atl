# H-UX — Onboarding, dashboard, upgrade UX deep dive (read-only)

## Objective

Compare the customer-facing flows of the references with this app and identify
the smallest high-impact UX changes. Do not change code.

## Owned write scope

- `docs/architecture/HARVEST_UX.md`

## Inputs (READ-ONLY references)

- `/home/ariyaman/Dev/fight/efforts/References/*`
- Completed: `docs/product-audit/DESIGN_LANGUAGE.md`,
  `docs/market-intelligence/LIVE_PRODUCT_RESEARCH.md`,
  `docs/market-intelligence/MARKET_OPPORTUNITY.md`
- This repo: `src/features/onboarding/**`, `src/features/marketing/**`,
  `src/features/analytics/workbench/**`, `src/features/billing/**`,
  `src/features/websites/**`

## Required comparison

For DataFast, Talivia, Umami, Plausible (public pages only where the code is
not in the reference folder), minilytics, pixelmoth, and this app:

1. First-run path: landing CTA → account → website → install → first event →
   first revenue signal. Count the screens and required decisions.
2. Install step: framework detection, snippet copy, verification state, failure
   recovery, AI-agent prompt.
3. Empty states and first-dashboard moment.
4. Upgrade/paywall placement, trial or no-trial, plan comparison, cancellation.
5. Dashboard hierarchy: what is above the fold, how revenue and traffic
   coexist, metric definitions, mobile behaviour.
6. Copy tone and trust signals (no dark patterns).

Then a decision table:
`| Change | Best source | License class | Adopt / reimplement / reject | Why | Target file | Acceptance test |`

Close with the three highest-impact UX changes, each estimated as S/M/L and
mapped to an existing component. No code, no tests, no builds. Target 150-220
lines.
