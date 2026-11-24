# 030 — Move the process drawer reveal off the layout path

- **Status**: DONE
- **Commit**: `dd1a749`
- **Severity**: MEDIUM (lower confidence; contained subtree)
- **Category**: Performance (audit cat 5)
- **Estimated scope**: 1 file, ~30 changed lines — `src/features/marketing/landing/process/process.css`

## Problem

The process-card detail drawer interpolates `grid-template-rows`, a layout
property, on every expand and collapse:

```css
/* src/features/marketing/landing/process/process.css:105-125 — current */
.landing-root .lp-process-detail {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows 260ms var(--lp-ease),
    visibility 0s linear 260ms;
}

.landing-root .lp-process-detail[data-expanded="true"] {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows 260ms var(--lp-ease),
    visibility 0s;
}

.landing-root .lp-process-detail-inner {
  min-height: 0;
  overflow: hidden;
}
```

Audit cat 5 requires animated motion to use `transform` and `opacity` only;
`grid-template-rows` triggers layout on each frame. Impact is contained — the
subtree is one `<p>` (`ProcessCard.tsx:110-112`) and the drawer is the last child
in the card — which is why this is MEDIUM rather than HIGH. The fix removes the
interpolated layout work while keeping the same expand/collapse choreography.

## Target

Make the grid switch **discrete** (`0s` duration with a `200ms` delay on
collapse so the content can fade out first, immediate `0s` on expand), and
carry all visible motion on `.lp-process-detail-inner` with `opacity` and
`transform` only. 200ms sits inside the audit's 150–250ms popover/drawer
budget and reuses the repo's existing `--lp-ease` token.

```css
/* src/features/marketing/landing/process/process.css — target */
.landing-root .lp-process-detail {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows 0s linear 200ms,
    visibility 0s linear 200ms;
}

.landing-root .lp-process-detail[data-expanded="true"] {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows 0s,
    visibility 0s;
}

.landing-root .lp-process-detail-inner {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-6px);
  transition:
    opacity 200ms var(--lp-ease),
    transform 200ms var(--lp-ease);
}

.landing-root .lp-process-detail[data-expanded="true"] .lp-process-detail-inner {
  opacity: 1;
  transform: translateY(0);
}
```

Extend the existing reduced-motion rule at `process.css:465-468` so the new
inner transition is also removed and no residual transform remains:

```css
/* src/features/marketing/landing/process/process.css:465-468 — current */
.landing-root .lp-process-detail,
.landing-root .lp-process-detail[data-expanded="true"] {
  transition: none;
}
```

```css
/* target — replaces that block */
.landing-root .lp-process-detail,
.landing-root .lp-process-detail[data-expanded="true"],
.landing-root .lp-process-detail-inner,
.landing-root .lp-process-detail[data-expanded="true"] .lp-process-detail-inner {
  transition: none;
}

.landing-root .lp-process-detail-inner {
  transform: none;
  opacity: 1;
}
```

The parent's `visibility: hidden` still hides the collapsed drawer, so setting
`opacity: 1` unconditionally under reduced motion cannot reveal closed content.

## Repo conventions to follow

- Easing tokens live in `src/features/marketing/landing/landing.css:60-63`;
  `--lp-ease: cubic-bezier(0.16, 1, 0.3, 1)` is already used by the current
  drawer transition, so keep it. Do not add a parallel curve.
- `translateY(-6px) → translateY(0)` matches the small directional lift used by
  `Reveal` (`motion/Reveal.tsx`) and the landing's other one-step reveals; keep
  it subtle.
- The reduced-motion block at `process.css:441-473` is the established place to
  neutralise process-section transitions. Add to it, do not create a second
  media query.
- `--lp-still-delay` and the `Reveal` entrance timing at `process.css:624-641`
  are settled (`plans/README.md:92-96`) and are not touched.

## Steps

1. In `process.css`, replace the two `.lp-process-detail` rules at lines
   105-120 with the Target versions (`grid-template-rows 0s`, `visibility 0s`,
   with the 200ms collapse delay).
2. Replace the `.lp-process-detail-inner` rule at `:122-125` with the Target
   rule, and add the `[data-expanded="true"] .lp-process-detail-inner` state
   rule immediately after it.
3. In the `@media (prefers-reduced-motion: reduce)` block at `:441-473`,
   replace the `:465-468` block with the Target reduced-motion block.
4. Verify `.lp-process-detail-copy` (`:127-135`), `.lp-process-toggle`
   (`:137-178`) and both other reduced-motion blocks (`:686-715`) are byte-for-byte
   unchanged.
5. Run the mechanical checks in Verification. Touch no other file.

## Boundaries

- Do NOT touch `ProcessCard.tsx` markup or the `data-expanded` attribute source.
- Do NOT touch `.lp-process-detail-copy`, `.lp-process-toggle`,
  `.lp-process-toggle-icon`, the code plate, or any keyframes.
- Do NOT add `will-change` or a JS height measurement; the discrete grid switch
  deliberately avoids both.
- Do NOT retime any entrance animation or any other drawer elsewhere on the
  landing page.
- If the CSS at execution time differs from the excerpts above (drift since
  `dd1a749`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` exits 0. `pnpm exec biome format src/features/marketing/landing/process/process.css` reports no findings from the changed lines (note: `landing.css` has a known pre-existing `'Poppins'` quote finding outside this file). `grep -n 'grid-template-rows' src/features/marketing/landing/process/process.css` shows the two declarations but **no** `grid-template-rows` in a transition with a nonzero duration. `grep -n 'transition:' ...` shows the inner's `opacity`/`transform`-only transition.
- **Feel check**: run the dev server and open a process card. In DevTools → Rendering enable "Paint flashing" and expand/collapse repeatedly: confirm no painted layout growth frame-by-frame, only the 200ms opacity/lift of the copy. In DevTools → Animations set playback to 10% and confirm on expand the grid opens immediately while the copy fades in over 200ms, and on collapse the copy fades out first then the space closes. Rapidly spam the toggle to confirm the state never lands half-open. Toggle `prefers-reduced-motion` and confirm the drawer opens/closes instantly with no lift and no fade, and closed content stays hidden.
- **Done when**: no nonzero-duration layout-property transition remains in the process block, and the recorded expand/collapse shows compositor-only motion for the visible content.

## Execution record — 2026-11-25

- **Files changed**: `src/features/marketing/landing/process/process.css` (replaced interpolated `grid-template-rows` drawer transitions with discrete `0s`/`0s linear 200ms` grid+visibility switch; added opacity/translateY compositor transition on `.lp-process-detail-inner` and expanded-state rule; extended reduced-motion block to neutralize inner transition and force `transform:none; opacity:1` while keeping hidden state via parent visibility).
- **Mechanical verification**: `pnpm exec biome check src/features/marketing/landing/process/process.css` — clean. `grep grid-template-rows` shows 4 hits, all declarations/0s transitions (no nonzero-duration layout transition). `tsc --noEmit` deferred to end-of-batch.
- **Feel checks**: UNVERIFIED — no dev server/browser. Human should verify expand/collapse paint flashing, 10% playback sequencing, rapid toggle stability, and reduced-motion instant hidden/visible behavior.
