'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reports the first time an element enters the viewport, then stops observing.
 *
 * The landing page types and draws only after a card is actually on screen, so
 * an off-screen process card never spends a frame of animation budget. Reduced
 * motion and browsers without IntersectionObserver both resolve to `true` on
 * mount, which lets the caller render the final state immediately.
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setLive(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          setLive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, live };
}
