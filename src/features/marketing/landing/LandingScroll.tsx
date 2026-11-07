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
 * Smooth wheel scrolling and anchor offset for the marketing page only.
 * The dashboard keeps native scrolling; Lenis is mounted here, not globally.
 */
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
