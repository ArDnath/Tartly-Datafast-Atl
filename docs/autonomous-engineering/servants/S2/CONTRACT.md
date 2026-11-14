# S2 — Design language extraction (read-only)

## Objective

Extract the binding visual language of the existing app from real code and
produce `docs/product-audit/DESIGN_LANGUAGE.md`. New screens built from
reference UX must be re-expressed in this language.

## Non-goals

- No code changes, no running the app, no screenshots. Source is the evidence.
- Do not import a foreign design system.

## Owned write scope

- `docs/product-audit/DESIGN_LANGUAGE.md`

## Read-only inputs

- `src/app/global.css`, `src/components/**`, `src/features/**/components/**`,
  `src/features/marketing/**`, `docs/UI_DESIGN_SYSTEM.md`,
  `docs/ONBOARDING_SPEC.md`, `tailwind`/postcss config, `src/lib/brand.ts`,
  `src/lib/colors.ts`, `src/features/analytics/components/**`.

## Required sections

1. Brand constants (name, domain, accent) from `src/lib/brand.ts`.
2. Color tokens with exact values for dark and light, and their semantic roles.
3. Typography: family, scale, weights, numerals; exact CSS where possible.
4. Spacing, radii, borders, shadows, texture/sheen; one table of values.
5. Component inventory and variants actually used (buttons, inputs, panels,
   tables, nav, tabs, modals, charts, empty states).
6. Layout grid and content widths per surface (marketing, auth, onboarding,
   app shell, workbench).
7. Motion: durations, easings, stagger, reduced-motion behaviour.
8. Chart styling: palettes, axis/grid/tooltip rules.
9. State patterns: empty, loading, error, success, paywall.
10. Microcopy tone (short rules + real examples).
11. Inconsistencies and a minimal consolidation proposal (do not redesign).

## Acceptance criteria

Exact values, file refs, and a "do/don't" list a developer can follow without
opening the design docs.

## Budget

One pass. No app execution.
