'use client';

import { useEffect, useRef, useState } from 'react';

type Step = {
  title: string;
  description: string;
};

const leftSteps: Step[] = [
  {
    title: 'Install one script tag',
    description:
      'Add the tracker to your site and verify the first event before you pay. One script, no framework lock-in, no plugin to keep in sync.',
  },
  {
    title: 'Match payments to visits',
    description:
      'Each payment is linked to the visit that produced it: source, campaign, landing page, and the pages seen before checkout.',
  },
];

const rightSteps: Step[] = [
  {
    title: 'Connect your checkout',
    description:
      'Connect Stripe, Dodo Payments, Lemon Squeezy, Polar, or Yolfi, or send payments through the manual API. Your checkout stays where it is.',
  },
  {
    title: 'Grow what works',
    description:
      'See revenue by channel, campaign, and landing page. Move budget toward the sources that create paying customers, not just traffic.',
  },
];

// Reading order on mobile: the staggered columns collapse into a single
// timeline, so the steps must alternate left/right to keep the flow.
const stackedSteps = [leftSteps[0], rightSteps[0], leftSteps[1], rightSteps[1]];

function measure(el: HTMLElement, start: number, end: number) {
  const rect = el.getBoundingClientRect();
  const percent = (start - rect.top) / (start - end);
  return Math.min(Math.max(percent, 0), 1);
}

function fillClassName(percent: number) {
  return `size-4 ${percent > 0.95 ? 'bg-gray-800' : 'bg-gray-300'}`;
}

function StepBlock({ step }: { step: Step }) {
  return (
    <div>
      <h3 className="font-domine text-xl underline">{step.title}</h3>
      <p className="mt-6 text-sm/6 text-gray-500">{step.description}</p>
    </div>
  );
}

export function BuildProcess() {
  const desktopSegments = useRef<(HTMLDivElement | null)[]>([]);
  const mobileSegments = useRef<(HTMLDivElement | null)[]>([]);
  const [progress, setProgress] = useState<number[]>([0, 0, 0]);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const start = windowHeight * 0.6;
      const end = windowHeight * 0.2;

      const updated = [0, 1, 2].map(index => {
        // The staggered desktop columns and the stacked mobile column each
        // carry their own copy of every segment. The inactive tree is
        // display: none, which reports a zero-sized rect, so measure whichever
        // segment is actually visible.
        const desktop = desktopSegments.current[index];
        if (desktop) {
          const rect = desktop.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            return measure(desktop, start, end);
          }
        }

        const mobile = mobileSegments.current[index];
        return mobile ? measure(mobile, start, end) : 0;
      });

      setProgress(updated);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="process" className="mt-24 flex flex-col items-center md:mt-32">
      <p className="font-domine text-gray-700">Simple 4-Step Process</p>

      <h2 className="mt-5 max-w-sm px-2 text-center text-3xl font-extrabold tracking-[-0.02em] text-gray-900 md:px-0">
        From one script tag to revenue you can act on
      </h2>

      {/* Mobile: a single-column timeline keeps the scroll-progress animation. */}
      <div className="mt-12 flex w-full flex-col items-center md:hidden">
        <div className="size-4 bg-gray-800" />

        {stackedSteps.map((step, index) => {
          const segmentIndex = index - 1;

          return (
            <div key={step.title} className="flex w-full flex-col items-center">
              {index > 0 && (
                <div className="flex flex-col items-center">
                  <div
                    ref={el => {
                      mobileSegments.current[segmentIndex] = el;
                    }}
                    className="relative h-20 w-0.5 overflow-hidden bg-gray-300"
                  >
                    <div
                      style={{ height: `${progress[segmentIndex] * 100}%` }}
                      className="absolute top-0 left-0 w-full bg-gray-800 transition-[height] duration-150 ease-linear"
                    />
                  </div>
                  <div className={fillClassName(progress[segmentIndex])} />
                </div>
              )}

              <div className="flex max-w-md flex-col px-6 py-8 text-center">
                <h3 className="font-domine text-xl underline">{step.title}</h3>
                <p className="mt-4 text-sm/6 text-gray-500">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: staggered columns around the shared animated spine. */}
      <div className="hidden flex-col md:flex md:flex-row">
        <div>
          {leftSteps.map(step => (
            <div key={step.title} className="h-60 max-w-lg md:mt-60">
              <StepBlock step={step} />
            </div>
          ))}
        </div>

        <div className="hidden flex-col items-center md:flex">
          <div className="size-4 bg-gray-800" />

          {[0, 1, 2].map(index => (
            <div key={index} className="flex flex-col items-center">
              <div
                ref={el => {
                  desktopSegments.current[index] = el;
                }}
                data-index={index}
                className="relative mx-10 h-60 w-0.5 overflow-hidden bg-gray-300"
              >
                <div
                  style={{ height: `${progress[index] * 100}%` }}
                  className="absolute top-0 left-0 w-full bg-gray-800 transition-[height] duration-150 ease-linear"
                />
              </div>
              <div className={fillClassName(progress[index])} />
            </div>
          ))}
        </div>

        <div>
          {rightSteps.map((step, index) => (
            <div key={step.title} className={`h-60 max-w-lg ${index === 0 ? '' : 'md:mt-60'}`}>
              <StepBlock step={step} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
