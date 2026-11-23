'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeScroll } from '../motion/scrollFrame';

export interface StoryStep {
  key: string;
  kicker?: string;
  title: string;
  description: string;
  stat?: string;
  visual: React.ReactNode;
}

interface StoryStepsProps {
  steps: StoryStep[];
  /** Mirror the layout so the pinned visual sits on the left. */
  flip?: boolean;
  /** "stacked" = pinned stage takes over on desktop, with measured centring. */
  variant?: 'rail' | 'stacked';
}

/**
 * A pinned, scroll-linked story in the manner of unfair.so's feature section:
 * numbered steps scroll past a visual that stays put, and the step nearest the
 * reading line opens while the others fold down to their label.
 *
 * The visual is mounted twice on purpose. On phones and tablets, and before the
 * page is motion-ready, the inline copy sits inside every step, so the section
 * reads as a normal document. From `lg` up on a motion-ready page the inline copy
 * is hidden, the pinned stage takes over, and only the active step's body is
 * open. CSS owns that switch; this component only decides which step is active
 * from the shared scroll bus.
 */
export function StorySteps({ steps, flip = false, variant = 'rail' }: StoryStepsProps) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLOListElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const pinRef = useRef({ railHeight: 0, railPin: 0 });

  const stacked = variant === 'stacked';

  /*
   * The pinned columns start flush at the top of the container, right below the
   * heading, and only lift towards the middle of the viewport once the heading
   * has scrolled away. That needs a sticky offset of half the leftover space,
   * which CSS cannot derive from an element's own height, so both heights are
   * measured here and handed to the stylesheet.
   *
   * The offset is capped, because an unclamped half-gap on a tall viewport would
   * push the copy far below the heading and reopen the void this layout exists
   * to remove.
   */
  useEffect(() => {
    const container = containerRef.current;
    const rail = trackRef.current;
    const sticky = stickyRef.current;

    if (!stacked || !container || !rail || !sticky) {
      return;
    }

    const write = () => {
      const viewport = window.innerHeight;
      const railHeight = rail.offsetHeight;
      const stageHeight = sticky.offsetHeight;

      // Centring is capped: on a very tall viewport an unclamped half-gap would
      // push the copy far below the heading and reopen the void this layout
      // exists to remove. The clamp keeps the first encounter tight and still
      // lands the block near the middle of a normal laptop screen.
      const railPin = Math.max(104, Math.min((viewport - railHeight) / 2, 192));
      const stagePin = Math.max(104, Math.min((viewport - stageHeight) / 2, 192));

      pinRef.current = { railHeight, railPin };
      container.style.setProperty('--lp-story-pin-copy', `${railPin}px`);
      container.style.setProperty('--lp-story-pin-stage', `${stagePin}px`);
    };

    write();

    window.addEventListener('resize', write);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', write);
    }

    const observer = new ResizeObserver(write);
    observer.observe(rail);
    observer.observe(sticky);

    return () => {
      window.removeEventListener('resize', write);
      observer.disconnect();
    };
  }, [stacked]);

  useEffect(() => {
    const fills: number[] = [];

    const update = () => {
      const track = trackRef.current;

      // jsdom and a pre-layout frame report a zero-height box; wait for a real
      // measurement so the story never reports an active step it cannot see.
      const trackRect = track?.getBoundingClientRect();
      if (!track || !trackRect || trackRect.height < 1) {
        return;
      }

      // The rail scrolls with the page; a viewport-fixed reading line is what
      // makes steps activate as they pass through the pinned/sticky region.
      const line = window.innerHeight * 0.44;

      let next = 0;
      for (let index = 0; index < stepRefs.current.length; index += 1) {
        const step = stepRefs.current[index];
        if (!step) {
          continue;
        }

        const rect = step.getBoundingClientRect();
        if (rect.top <= line) {
          next = index;
        }

        // Each step owns its rail segment; fill it as the reading line travels
        // through the step, so the progress tracks the step you are on rather
        // than painting every segment at once.
        const fill =
          rect.height > 0 ? Math.min(Math.max((line - rect.top) / rect.height, 0), 1) : 0;
        const rounded = Math.round(fill * 1000) / 1000;
        if (rounded !== fills[index]) {
          fills[index] = rounded;
          step.style.setProperty('--lp-step-progress', String(rounded));
        }
      }

      setActive(previous => (previous === next ? previous : next));
    };

    return subscribeScroll(update);
  }, [stacked]);

  return (
    <div
      ref={containerRef}
      className="lp-story"
      data-flip={flip ? 'true' : 'false'}
      data-variant={variant}
    >
      <ol ref={trackRef} className="lp-story-rail">
        {steps.map((step, index) => {
          const number = String(index + 1).padStart(2, '0');
          const isActive = index === active;

          return (
            <li
              key={step.key}
              ref={element => {
                stepRefs.current[index] = element;
              }}
              className="lp-story-step"
              data-active={isActive ? 'true' : 'false'}
              aria-current={isActive ? 'step' : undefined}
              style={{ '--lp-step-progress': 0 } as React.CSSProperties}
            >
              <div className="lp-story-card">
                {step.kicker ? (
                  <span className="lp-story-badge">
                    <span className="lp-story-badge-num">{number}</span>
                    <span>{step.kicker}</span>
                  </span>
                ) : (
                  <span className="lp-story-num">{number}</span>
                )}

                <h3 className="lp-story-title">{step.title}</h3>

                <div className="lp-story-body">
                  <div className="lp-story-body-inner">
                    <p className="lp-story-copy">{step.description}</p>
                    {step.stat ? <span className="lp-story-stat">{step.stat}</span> : null}
                    <div className="lp-story-inline">{step.visual}</div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="lp-story-stage">
        <div ref={stickyRef} className="lp-story-sticky">
          <div className="lp-story-stage-card">
            <div className="lp-story-stage-visuals">
              {steps.map((step, index) => {
                const isActive = index === active;
                return (
                  <div
                    key={step.key}
                    className="lp-story-stage-panel"
                    data-active={isActive ? 'true' : 'false'}
                    aria-hidden={isActive ? undefined : 'true'}
                  >
                    {step.visual}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
