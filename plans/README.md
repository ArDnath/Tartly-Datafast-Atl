# Animation plans

Audit basis: `improve-animations`, commits `fb71c67`, `8500206`.

| #   | Title                                                  | Severity | Status |
| --- | ------------------------------------------------------ | -------- | ------ |
| 001 | Extend the pinned feature story to tablet, stable swap | MEDIUM   | DONE   |
| 002 | Add a URL CTA immediately after the feature story      | MEDIUM   | DONE   |
| 003 | Attribution figure: labelled, cumulative merge         | MEDIUM   | DONE   |
| 004 | Remove the false clickable lift from process cards     | MEDIUM   | DONE   |
| 005 | Put the process hover on one 200ms beat                | MEDIUM   | DONE   |
| 006 | Keep colour feedback under reduced motion              | LOW      | DONE   |
| 007 | Delete the photo's hover filter transition             | LOW      | DONE   |
| 008 | Grow the revenue bars once on reveal                   | LOW      | DONE   |
| 009 | Revenue callout: one outline ending in an arrow        | MEDIUM   | DONE   |
| 010 | Feature section: leaner copy, line-only figures        | MEDIUM   | DONE   |
| 011 | Feature story rail progress tracks each step segment   | HIGH     | DONE   |
| 012 | Feature story stage swap is wired and animated         | HIGH     | DONE   |
| 013 | Feature story body reveal uses compositor-only motion  | MEDIUM   | DONE   |
| 014 | Figure bubble reposition uses landing motion token     | LOW      | TODO   |
| 015 | Tune landing reveal duration to a crisper budget       | LOW      | TODO   |

Executed 2026-11-20 on commit `fb71c67` + working tree; verified by biome
format/lint, PostCSS parse, a Tailwind CLI compile, `tsc --noEmit`, and 74
landing tests.

**Deviation from plan 008 as written:** the plan specified bar delays of
380/470/560/650ms, derived from a stale assumption that the third card's still
starts at 260ms. It actually starts at 440ms (`260 + index * 90`,
`BuildProcess.tsx:157`), so those delays would have begun the wipe ~60ms before
the still appeared. Shipped values are 900/990/1080/1170ms — the point at which
the band's 560ms rise is ~96% opaque. Plan 008 has been corrected to match.

Executed 2026-11-19 on the working tree above `fb71c67`; verified in Chromium at
820×1180, 1440×900, and 390×844. The process rail keeps its original 520 ms
entrance — only the feature variant fades.

## Order

**Process section (004–008)** — all five touch only
`src/features/marketing/landing/landing.css`, in the `.lp-step` block.

1. **004** first. It removes the card's `translate` and drop shadow, so the
   hover block that 005 rewrites is already in its final shape. Running 005
   first would mean rewriting the same rules twice.
2. **005** second. Retimes every hover transition in the block to 200ms and
   splits colour (`ease`) from movement (`--lp-ease`).
3. **006** third. Rewrites the reduced-motion block; its target durations are the
   200ms values 005 establishes.
4. **007** independently of 004–006 — it only deletes the photo's filter
   transition and its hover rule (`landing.css:2086`, `2109-2113`). Safe to run
   any time.
5. **008** last. Adds the bar-growth keyframes and reveal rules, and appends one
   override to the reduced-motion block. Run it after **006**, since both edit
   that block; 008's instructions assume 006's grouping.

Dependency summary: `004 → 005 → 006 → 008`, with `007` free-floating.

**009** is independent of everything above: it touches only
`src/features/marketing/landing/figures/` (`revenueColumns.ts` and its test
file) and changes no CSS. Safe to run at any time.

**010** is independent of 001–009 and should run last of the feature-section
plans. It rewrites the `#features` copy in `FeaturesSection.tsx`, makes
`StoryStep.kicker` optional in `StorySteps.tsx`, and touches two fill
declarations plus the stacked-variant copy rules in `landing.css`. It does not
touch `figures/`, so 003 and 009 are unaffected. If a later plan re-adds a
badge or stat to the feature steps, it must restore the deleted stacked rules.

## Out of scope by decision

- The `rail` (build process) story keeps its `lg` breakpoint and rail line.
- The mobile highlight is already correct: the stacked buckets divide the
  container evenly, and the mobile steps are equal-height, so the highlight
  changes exactly when the next step crosses the 44 % reading line. No change
  needed.
- Figure loops already stop offscreen via `IntersectionObserver` in
  `figures/loop.ts`; no performance finding.
- Reduced-motion and no-JS states already fall back to the plain document; the
  dimming rules are gated on `[data-motion="on"]`.
- **Process card entrances are settled and stay as they are.** The `Reveal`
  stagger (0 / 90 / 180 ms), the photo settle (`lp-step-settle`, 1000 ms) and the
  still rise (`lp-step-still-in`, 560 ms) were reviewed and are correct — a
  one-time scroll entrance is the rare tier where longer durations are allowed.
  Plans 004–008 change hover and add one reveal; none retimes an entrance.
- **The outer card lift is removed deliberately, not overlooked.** It reads as a
  click affordance on a card that contains no link, and it opens an asymmetric
  gap in the 6px tray inset. The inner choreography carries the hover. See 004.
- **`ease-in` is absent from the whole landing stylesheet.** The only `ease-in`
  match is `ease-in-out` on the brand mark's `lp-mark-swirl-wipe`
  (`landing.css:165`), which is correct for on-screen movement and outside the
  process section. No easing findings to file.
- **`transition: all` is absent** and no layout property (`width`, `height`,
  `top`, `left`, `margin`, `padding`) is animated in the process block.
