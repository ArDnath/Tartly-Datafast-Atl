'use client';

import { useEffect } from 'react';

/**
 * Marks the landing root as motion-ready after hydration. Reveal styles only
 * hide content while `data-motion="on"`, so the server-rendered page stays
 * readable without JavaScript and every element is visible when the visitor
 * asks for reduced motion.
 */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.landing-root');

    if (!root) {
      return;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      root.dataset.motion = query.matches ? 'off' : 'on';
    };

    apply();
    query.addEventListener('change', apply);

    return () => query.removeEventListener('change', apply);
  }, []);

  return null;
}
