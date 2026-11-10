'use client';

import { useEffect, useRef } from 'react';
import { Reveal } from '../motion/Reveal';
import { subscribeScroll } from '../motion/scrollFrame';

type Step = {
  title: string;
  description: string;
};

// Reading order for both the mobile rail and the desktop zigzag.
const STEPS: Step[] = [
  {
    title: 'Install one script tag',
    description:
      'Add the tracker to your site and verify the first event before you pay. One script, no framework lock-in, no plugin to keep in sync.',
  },
  {
    title: 'Connect your checkout',
    description:
      'Connect Stripe, Dodo Payments, Lemon Squeezy, Polar, or Yolfi, or send payments through the manual API. Your checkout stays where it is.',
  },
  {
    title: 'Match payments to visits',
    description:
      'Each payment is linked to the visit that produced it: source, campaign, landing page, and the pages seen before checkout.',
  },
  {
    title: 'Grow what works',
    description:
      'See revenue by channel, campaign, and landing page. Move budget toward the sources that create paying customers, not just traffic.',
  },
];

function measure(el: HTMLElement, start: number, end: number) {
  const rect = el.getBoundingClientRect();
  const percent = (start - rect.top) / (start - end);
  return Math.min(Math.max(percent, 0), 1);
}

function StepBlock({ step, number }: { step: Step; number: number }) {
  return (
    <div className="max-w-lg">
      <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-lp-primary uppercase">
        Step {String(number).padStart(2, '0')}
      </p>
      <h3 className="mt-2 text-xl font-black tracking-tight text-lp-ink md:text-2xl">
        {step.title}
      </h3>
      <p className="mt-3 text-sm/6 text-lp-fg-muted">{step.description}</p>
    </div>
  );
}

/**
 * The spine is the section's structural device: one line that fills as the
 * reader scrolls, with a node per step. Desktop zigzags around it, mobile runs
 * it down the left edge, and both share a single frame-throttled measurement so
 * the two layouts can never drift apart.
 *
 * Progress is written straight to the DOM instead of React state: a scroll
 * linked value that re-rendered four steps every frame would waste the frame
 * budget for no visual gain.
 */
export function BuildProcess() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const desktopRail = useRef<HTMLDivElement | null>(null);
  const mobileRail = useRef<HTMLDivElement | null>(null);
  const desktopFill = useRef<HTMLDivElement | null>(null);
  const mobileFill = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let lastProgress = -1;

    const update = () => {
      const section = sectionRef.current;

      if (section) {
        const sectionRect = section.getBoundingClientRect();

        if (sectionRect.bottom < -160 || sectionRect.top > window.innerHeight + 160) {
          return;
        }
      }

      const windowHeight = window.innerHeight;
      const start = windowHeight * 0.6;
      const end = windowHeight * 0.2;

      const desktop = desktopRail.current;
      const mobile = mobileRail.current;

      // Only one rail is laid out at a time; the hidden one reports a
      // zero-sized rect, so measure whichever is actually visible.
      let progress: number | null = null;

      if (desktop) {
        const rect = desktop.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          progress = measure(desktop, start, end);
        }
      }

      if (progress === null && mobile) {
        const rect = mobile.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          progress = measure(mobile, start, end);
        }
      }

      if (progress === null || Math.abs(progress - lastProgress) < 0.001) {
        return;
      }

      lastProgress = progress;

      if (desktopFill.current) {
        desktopFill.current.style.transform = `scaleY(${progress})`;
      }
      if (mobileFill.current) {
        mobileFill.current.style.transform = `scaleY(${progress})`;
      }

      const nodes = sectionRef.current?.querySelectorAll<HTMLElement>('[data-step-node]');
      nodes?.forEach(node => {
        const index = Number(node.dataset.stepNode);
        const active = progress >= index / (STEPS.length - 1);
        node.dataset.active = active ? 'true' : 'false';
      });
    };

    return subscribeScroll(update);
  }, []);

  return (
    <section ref={sectionRef} id="process" className="border-b border-lp-line bg-lp-secondary/55">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-16 md:py-20">
        <Reveal>
          <p className="lp-eyebrow">How it works</p>
        </Reveal>

        <Reveal delay={80}>
          <h2 className="lp-display mt-3 max-w-2xl text-center text-3xl sm:text-4xl md:text-5xl">
            FROM ONE SCRIPT TAG TO REVENUE YOU CAN ACT ON
          </h2>
        </Reveal>

        <Reveal delay={140}>
          <p className="mt-4 max-w-md text-center text-sm/6 text-lp-fg-muted text-pretty">
            Four steps. No data team, no warehouse, no CSV exports. The tracker and your checkout do
            the joining.
          </p>
        </Reveal>

        {/* Mobile: the same spine, on the left edge, so steps stay scannable. */}
        <div className="relative mt-10 w-full md:hidden">
          <div
            ref={mobileRail}
            className="absolute top-2 bottom-2 left-3 w-0.5 overflow-hidden bg-lp-line"
            aria-hidden="true"
          >
            <div
              ref={mobileFill}
              style={{ transform: 'scaleY(0)' }}
              className="h-full w-full origin-top bg-lp-primary"
            />
          </div>

          <ol className="flex flex-col gap-10">
            {STEPS.map((step, index) => (
              <Reveal as="li" key={step.title} delay={index * 70} className="relative pl-9">
                <span
                  aria-hidden="true"
                  data-step-node={index}
                  className="lp-step-node absolute top-1 left-3 size-3 -translate-x-1/2 rounded-sm"
                />
                <StepBlock step={step} number={index + 1} />
              </Reveal>
            ))}
          </ol>
        </div>

        {/* Desktop: alternate sides around the shared spine. */}
        <div className="relative mt-12 hidden w-full md:block">
          <div
            ref={desktopRail}
            className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 overflow-hidden bg-lp-line"
            aria-hidden="true"
          >
            <div
              ref={desktopFill}
              style={{ transform: 'scaleY(0)' }}
              className="h-full w-full origin-top bg-lp-primary"
            />
          </div>

          <ol className="relative flex flex-col gap-9">
            {STEPS.map((step, index) => (
              <Reveal
                as="li"
                key={step.title}
                delay={index * 70}
                className={`relative flex ${
                  index % 2 === 0
                    ? 'justify-start pr-[calc(50%+2.5rem)]'
                    : 'justify-end pl-[calc(50%+2.5rem)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  data-step-node={index}
                  className="lp-step-node absolute top-1 left-1/2 z-10 size-3 -translate-x-1/2 rounded-sm"
                />
                <StepBlock step={step} number={index + 1} />
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
