'use client';

import { createElement, useEffect, useRef } from 'react';

type RevealTag = 'article' | 'div' | 'figure' | 'header' | 'li' | 'section' | 'span';

interface RevealProps {
  as?: RevealTag;
  /** Stagger in milliseconds, applied in reading order. */
  delay?: number;
  /** Travel distance in pixels. The spec uses 32px for section entrances. */
  distance?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Scroll entrance for a section, card, or step. It reveals once, uses
 * IntersectionObserver instead of a scroll listener, and lets CSS own the
 * curve and duration. Under reduced motion the final state is applied at once.
 */
export function Reveal({ as = 'div', delay = 0, distance = 32, className, children }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      element.dataset.revealed = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          element.dataset.revealed = 'true';
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className,
      'data-reveal': '',
      style: {
        '--reveal-delay': `${delay}ms`,
        '--reveal-distance': `${distance}px`,
      } as React.CSSProperties,
    },
    children,
  );
}
