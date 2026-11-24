'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeScroll } from '../motion/scrollFrame';
import {
  AttributionScene,
  ConversionFunnelScene,
  type SceneProps,
  TrafficRevenueScene,
} from './scenes';

interface JourneyStep {
  key: string;
  number: string;
  title: string;
  copy: string;
  caption: string;
  Scene: (props: SceneProps) => React.JSX.Element;
}

const STEPS: JourneyStep[] = [
  {
    key: 'traffic-revenue',
    number: '01',
    title: 'Traffic, meet revenue',
    copy: 'Connect traffic to the revenue it eventually generated.',
    caption: 'TRAFFIC, MEET REVENUE',
    Scene: TrafficRevenueScene,
  },
  {
    key: 'attribution',
    number: '02',
    title: 'Every payment, traced',
    copy: 'First touch or last, the source is attached.',
    caption: 'PAYMENT ATTRIBUTION',
    Scene: AttributionScene,
  },
  {
    key: 'funnel',
    number: '03',
    title: 'See where they drop',
    copy: 'Signup, trial, payment — one funnel.',
    caption: 'CONVERSION FUNNEL',
    Scene: ConversionFunnelScene,
  },
];

const READING_LINE = 0.44;

/**
 * The Revenue Journey.
 *
 * A three-step scroll story with a sticky illustration and a single source of
 * truth for the active step. The rail copy and the drawing both read from
 * `active`; the rail fill is written straight to the DOM inside the shared
 * scroll frame so dragging the page never causes a React render.
 *
 * Desktop keeps the illustration pinned while the steps move past it. On a
 * narrow screen, under reduced motion, or before hydration the same scenes are
 * rendered inline under each step, so the section always reads as a document.
 */
export function RevenueJourney() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLOListElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);

  // The entrance animations start when the section is first approached, not
  // while it is still below the fold on load.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setLive(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setLive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => {
      const rail = railRef.current;
      const railRect = rail?.getBoundingClientRect();
      if (!rail || !railRect || railRect.height < 1) {
        return;
      }

      const line = window.innerHeight * READING_LINE;
      let next = 0;
      for (let index = 0; index < stepRefs.current.length; index += 1) {
        const step = stepRefs.current[index];
        if (!step) {
          continue;
        }
        if (step.getBoundingClientRect().top <= line) {
          next = index;
        }
      }

      const progress = Math.min(Math.max((line - railRect.top) / railRect.height, 0), 1);
      const fill = fillRef.current;
      if (fill) {
        fill.style.transform = `scaleY(${Math.round(progress * 1000) / 1000})`;
      }

      setActive(previous => (previous === next ? previous : next));
    };

    return subscribeScroll(update);
  }, []);

  const current = STEPS[active] ?? STEPS[0];

  return (
    <section
      id="features"
      ref={sectionRef}
      className="rj"
      data-live={live ? 'true' : 'false'}
      aria-labelledby="features-title"
    >
      <div className="rj-wrap">
        <header className="rj-head">
          <h2 id="features-title" className="rj-title">
            <span>Traffic tells you who came.</span>
            <span className="rj-title-accent">Revenue tells you who paid.</span>
          </h2>

          <svg className="rj-head-underline" viewBox="0 0 300 18" aria-hidden="true">
            <path d="M3 13C62 5 146 2 297 7" pathLength="1" />
          </svg>
        </header>

        <div className="rj-body">
          <div className="rj-rail">
            <span className="rj-rail-line" aria-hidden="true">
              <span ref={fillRef} className="rj-rail-fill" />
            </span>

            <ol className="rj-steps" ref={railRef}>
              {STEPS.map((step, index) => {
                const isActive = index === active;
                const InlineScene = step.Scene;

                return (
                  <li
                    key={step.key}
                    ref={element => {
                      stepRefs.current[index] = element;
                    }}
                    className="rj-step"
                    data-active={isActive ? 'true' : 'false'}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className="rj-step-number">{step.number}</span>
                    <h3 className="rj-step-title">{step.title}</h3>
                    <p className="rj-step-copy">{step.copy}</p>

                    <div className="rj-inline" aria-hidden="true">
                      <InlineScene active />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rj-stage">
            <div className="rj-sticky">
              <div className="rj-stage-panels">
                {STEPS.map((step, index) => {
                  const StageScene = step.Scene;
                  const isActive = index === active;

                  return (
                    <div
                      key={step.key}
                      className="rj-stage-panel"
                      data-active={isActive ? 'true' : 'false'}
                      aria-hidden={isActive ? undefined : 'true'}
                    >
                      <StageScene active={isActive} />
                    </div>
                  );
                })}
              </div>

              <p className="rj-caption">
                <span className="rj-caption-step">STEP {active + 1}</span>
                <span className="rj-caption-dot" aria-hidden="true">
                  ·
                </span>
                <span>{current.caption}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
