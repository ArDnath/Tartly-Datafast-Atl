'use client';

import { useEffect, useRef } from 'react';
import { registerParallax } from './parallax';

interface ParallaxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fraction of the element's distance from the viewport centre to translate. */
  speed?: number;
  /** Hard cap in pixels so the effect never looks like a broken layout. */
  max?: number;
}

/**
 * Decorative parallax layer. It only ever changes `transform`, only registers
 * while motion is allowed, and resets to zero when the preference changes.
 */
export function Parallax({ speed = 0.08, max = 48, className, children, ...rest }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    let stop: (() => void) | undefined;

    const apply = () => {
      stop?.();
      stop = undefined;

      if (query.matches) {
        element.style.setProperty('--lp-parallax-y', '0px');
        return;
      }

      stop = registerParallax(element, speed, max);
    };

    apply();
    query.addEventListener('change', apply);

    return () => {
      query.removeEventListener('change', apply);
      stop?.();
    };
  }, [speed, max]);

  return (
    <div ref={ref} className={`lp-parallax ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}
