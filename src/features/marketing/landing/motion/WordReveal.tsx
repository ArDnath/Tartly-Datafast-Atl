'use client';

import { createElement, useEffect, useRef } from 'react';
import { subscribeScroll } from './scrollFrame';

interface WordRevealProps {
  text: string;
  as?: 'h2' | 'p';
  id?: string;
  className?: string;
}

/**
 * The tagline moment from the design system: words sit at low opacity and turn
 * to full colour in reading order as they cross a trigger line near the lower
 * third of the viewport. One rAF-throttled scroll subscription drives it; no
 * per-word observers and no layout thrash.
 */
export function WordReveal({ text, as = 'p', id, className }: WordRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const words = text.split(' ');

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const nodes = Array.from(element.querySelectorAll<HTMLElement>('[data-word]'));
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activated = 0;
    let unsubscribe: (() => void) | null = null;

    const showAll = () => {
      for (const node of nodes) {
        node.dataset.active = 'true';
      }
      activated = nodes.length;
      unsubscribe?.();
      unsubscribe = null;
    };

    const activate = (count: number) => {
      if (count <= activated) {
        return;
      }

      for (let index = activated; index < count; index += 1) {
        nodes[index].dataset.active = 'true';
      }

      activated = count;

      // Nothing left to observe: release the shared scroll subscription.
      if (activated === nodes.length) {
        unsubscribe?.();
        unsubscribe = null;
      }
    };

    const update = () => {
      const rect = element.getBoundingClientRect();

      // The section has scrolled above the viewport: it is already read.
      if (rect.bottom < 0) {
        activate(nodes.length);
        return;
      }

      // Below the viewport: nothing to activate yet.
      if (rect.top > window.innerHeight) {
        return;
      }

      const trigger = window.innerHeight * 0.78;
      let count = 0;

      for (const node of nodes) {
        if (node.getBoundingClientRect().top < trigger) {
          count += 1;
        }
      }

      activate(count);
    };

    const attach = () => {
      if (unsubscribe || activated === nodes.length) {
        return;
      }

      unsubscribe = subscribeScroll(update);
      update();

      if (activated === nodes.length) {
        unsubscribe?.();
        unsubscribe = null;
      }
    };

    const detach = () => {
      unsubscribe?.();
      unsubscribe = null;
    };

    const onPreferenceChange = () => {
      if (query.matches) {
        detach();
        showAll();
      } else {
        activated = 0;
        for (const node of nodes) {
          delete node.dataset.active;
        }
        attach();
      }
    };

    if (query.matches) {
      showAll();
    } else {
      attach();
    }

    query.addEventListener('change', onPreferenceChange);

    return () => {
      query.removeEventListener('change', onPreferenceChange);
      detach();
    };
  }, []);

  return createElement(
    as,
    { ref, id, className, 'aria-label': text },
    words.map((word, index) => (
      <span key={`${word}-${index}`}>
        <span
          data-word=""
          className="lp-word"
          style={{ '--word-index': index } as React.CSSProperties}
        >
          {word}
        </span>
        {index < words.length - 1 ? ' ' : ''}
      </span>
    )),
  );
}
