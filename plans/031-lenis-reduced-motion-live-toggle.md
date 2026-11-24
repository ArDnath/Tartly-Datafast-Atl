# 031 — React to reduced-motion changes instead of reading it once

- **Status**: DONE
- **Commit**: `dd1a749`
- **Severity**: LOW
- **Category**: Accessibility (audit cat 6)
- **Estimated scope**: 1 file, ~30 changed lines — `src/features/marketing/landing/LandingScroll.tsx`

## Problem

`LandingScroll` reads the reduced-motion preference once when the effect mounts
and returns early if it is set:

```ts
// src/features/marketing/landing/LandingScroll.tsx:42-73 — current
export function LandingScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      anchors: {
        offset: -96,
      },
    });

    activeLenis = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      if (activeLenis === lenis) {
        activeLenis = null;
      }
      lenis.destroy();
    };
  }, []);

  return null;
}
```

If the visitor flips the OS setting while the page is open, smooth scrolling
keeps running (or stays off when the setting is removed). This component is the
only _persistent_ motion service on the landing page, so a one-shot check is a
real gap even though the one-shot checks in `Reveal`, `HeroSection` and
`CallToAction` are correct for their one-time entrances. Note that
`CapabilitiesMarquee.tsx:102-116` already uses the correct live-listener pattern;
this plan brings `LandingScroll` in line with it.

## Target

Keep the exported helpers (`scrollToTop`, `scrollBy`, lines 1-36) and the
module-level `activeLenis` untouched. Replace only the `useEffect` body so the
Lenis instance is created/destroyed in response to a `change` event on the same
`MediaQueryList`. The existing Lenis options (`duration: 1.1`,
`smoothWheel: true`, `anchors.offset: -96`) and the rAF loop stay exactly as
they are.

```ts
// src/features/marketing/landing/LandingScroll.tsx:42-73 — target
export function LandingScroll() {
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');

    let lenis: Lenis | null = null;
    let frame = 0;

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (activeLenis === lenis) activeLenis = null;
      lenis?.destroy();
      lenis = null;
    };

    const start = () => {
      if (query.matches || lenis) return;

      lenis = new Lenis({
        duration: 1.1,
        smoothWheel: true,
        anchors: {
          offset: -96,
        },
      });

      activeLenis = lenis;

      const raf = (time: number) => {
        lenis?.raf(time);
        frame = window.requestAnimationFrame(raf);
      };

      frame = window.requestAnimationFrame(raf);
    };

    const sync = () => {
      if (query.matches) stop();
      else start();
    };

    sync();
    query.addEventListener('change', sync);

    return () => {
      query.removeEventListener('change', sync);
      stop();
    };
  }, []);

  return null;
}
```

No new easing token or duration is introduced. Reduced motion means no Lenis
at all — native scrolling takes over, so the browser supplies the reduced-motion
behaviour; the existing `behavior: 'auto'` branches in `scrollToTop`/`scrollBy`
(lines 20 and 44) continue to work through the null `activeLenis` path.

## Repo conventions to follow

- `usePrefersReducedMotion` at
  `src/features/marketing/landing/sections/CapabilitiesMarquee.tsx:102-116` is
  the exemplar: create the `MediaQueryList`, call the current value once,
  `addEventListener('change', ...)`, and remove it in cleanup. Apply the same
  lifecycle here without extracting a new shared hook.
- Keep `activeLenis` as the single source of truth read by the exported helpers
  (`LandingScroll.tsx:6-36`); `stop()` clears it only when it still points at
  this instance, preserving the existing teardown guard.
- `window.cancelAnimationFrame` / `window.requestAnimationFrame` are already
  used in this file; keep the `window.` prefix style in the new code.
- The 1.1s Lenis duration and -96px anchor offset are existing values — do not
  retime them under audit cat 2. They belong to a one-shot scroll, not a UI
  entrance.

## Steps

1. In `LandingScroll.tsx`, leave lines 1-36 (imports, `activeLenis`,
   `scrollToTop`, `scrollBy`) unchanged.
2. Replace the body of the `useEffect` at lines 43-73 with the Target code:
   define `query`, `lenis`, `frame`, `stop`, `start`, `sync`; call `sync()`;
   subscribe to `change`; return a cleanup that removes the listener and calls
   `stop()`.
3. Confirm `lenis?.raf(time)` uses optional chaining so a pending rAF cannot
   touch a destroyed instance after a mid-flight preference change.
4. Run the mechanical checks in Verification. Touch no other file.

## Boundaries

- Do NOT change `scrollToTop`, `scrollBy`, the module-level `activeLenis`, the
  `duration: 1.1`, `smoothWheel: true`, `anchors.offset: -96`, or the anchor
  behaviour.
- Do NOT add a new package, hook file, or a `prefers-reduced-motion` branch to
  any other landing component.
- Do NOT remove the early-return behaviour's effect: reduced motion must still
  mean no Lenis at first paint.
- If the code at execution time differs from the excerpt above (drift since
  `dd1a749`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` exits 0. `pnpm exec biome check src/features/marketing/landing/LandingScroll.tsx` reports no new findings. `grep -n 'addEventListener\|removeEventListener\|matches' src/features/marketing/landing/LandingScroll.tsx` shows the `change` listener, its removal, and a single `query.matches` read inside the effect. `NODE_ENV=test pnpm exec vitest run src/features/marketing/landing/LandingPage.test.tsx` — the smooth-scroll-to-top test at `:204` still passes.
- **Feel check**: run the dev server and open `/`. In DevTools → Rendering, toggle `prefers-reduced-motion` from "No preference" to "Reduce" while the page is open: confirm wheel scrolling becomes native immediately with no easing tail, and clicking the navbar brand jumps to the hero. Toggle it back: confirm smooth wheel scrolling resumes and clicking the brand eases over ~1.1s. Repeat three times rapidly and confirm no duplicate rAF loops (Performance monitor: no growing callback count) and no stale `activeLenis` — anchor jumps still land with the -96px offset.
- **Done when**: both directions of the live toggle are observable without reload, the listener is removed on unmount, and typecheck plus the named test pass.

## Execution record — 2026-11-25

Executed in place on the dirty working tree at `dd1a749`; no worktree, branch
or commit. Only `src/features/marketing/landing/LandingScroll.tsx` and this plan
file were changed. The `useEffect` now creates/destroys Lenis through
`start`/`stop`/`sync` on a live `change` listener; `scrollToTop`, `scrollBy`,
`activeLenis` and all Lenis options are unchanged.

Verified by the executor and re-checked independently: `pnpm exec tsc --noEmit`
exit 0; `pnpm exec biome check` on the four edited source files clean (only the
pre-existing `biome.json` deprecation notice); `NODE_ENV=test pnpm exec vitest
run src/features/marketing/landing/LandingPage.test.tsx` 21 passed / 0 failed.
The `change` listener add/remove and a single `query.matches` read are present.

**UNVERIFIED:** the live OS-toggle feel checks in the Verification section need
a human with the dev server; no browser run was available.
