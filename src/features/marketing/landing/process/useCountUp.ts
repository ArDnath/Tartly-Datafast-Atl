'use client';

import { useEffect, useState } from 'react';

const DURATION_MS = 900;

/**
 * Counts from zero to `target` once the card is live.
 *
 * The initial state is the target so the server-rendered HTML and the first
 * client render both carry the final figure. Motion starts only when the card
 * enters the viewport, uses a single rAF chain, and is cancelled on unmount.
 * Reduced motion (or a card that is not live) keeps the target value.
 *
 * `delayMs` mirrors the plate's `--lp-still-delay`: the bars and chips wait for
 * that beat too, so the number never counts up behind an invisible plate. The
 * wait is folded into the same finite rAF chain rather than a second timer.
 */
export function useCountUp(target: number, live: boolean, reduced: boolean, delayMs = 0) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (!live || reduced) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    setValue(0);

    const tick = (now: number) => {
      start ??= now;
      const elapsed = Math.max(now - start - delayMs, 0);
      const progress = Math.min(elapsed / DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, live, reduced, delayMs]);

  return value;
}
