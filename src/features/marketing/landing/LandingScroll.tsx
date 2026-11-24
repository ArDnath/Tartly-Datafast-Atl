'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

let activeLenis: Lenis | null = null;

/**
 * Scroll the marketing page back to the hero. Prefers the live Lenis instance
 * so the logo click matches anchor-link motion; falls back to the browser when
 * reduced motion disables smooth scrolling.
 */
export function scrollLandingToTop() {
  if (activeLenis) {
    activeLenis.scrollTo(0, { duration: 1.1 });
    return;
  }

  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

/**
 * Scroll the marketing page by a wheel delta. Used by nested scroll containers
 * (the hero demo) to hand the gesture back to the page once they hit an edge.
 */
export function scrollLandingBy(delta: number) {
  if (activeLenis) {
    activeLenis.scrollTo(activeLenis.targetScroll + delta, { programmatic: false });
    return;
  }

  window.scrollBy({ top: delta });
}

/**
 * Smooth wheel scrolling and anchor offset for the marketing page only.
 * The dashboard keeps native scrolling; Lenis is mounted here, not globally.
 */
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
