'use client';

import { Fragment } from 'react';
import { BRAND } from '@/lib/brand';
import { Reveal } from '../motion/Reveal';
import { CodeCard } from '../process/CodeCard';
import { ProcessArrow } from '../process/ProcessArrow';
import { ProcessCard } from '../process/ProcessCard';
import { ProcessCta } from '../process/ProcessCta';
import { ProviderCard } from '../process/ProviderCard';
import { RevenueCard } from '../process/RevenueCard';
import '../process/process.css';

type Step = {
  key: string;
  title: string;
  description: string;
  detail: string;
  photo: string;
  visual: (live: boolean, stillDelay: number) => React.ReactNode;
};

const STEPS: Step[] = [
  {
    key: 'install',
    title: `Install ${BRAND.name}`,
    description: 'Add one tag to your site. First event before you pay.',
    detail: "One lightweight script. That's all it takes.",
    photo: '/images/landing/process-install-bg.webp',
    visual: live => <CodeCard live={live} />,
  },
  {
    key: 'connect',
    title: 'Connect revenue data',
    description: 'Link your provider, or use the manual API. Your checkout stays put.',
    detail: 'Connect Stripe, Dodo, Lemon Squeezy, Polar, or your own payment API.',
    photo: '/images/landing/process-connect-bg-v2.webp',
    visual: live => <ProviderCard live={live} />,
  },
  {
    key: 'grow',
    title: 'See what converts',
    description:
      'See which channel and page produced the payment — then move budget toward what earns.',
    detail: 'Discover which channels and landing pages actually generate revenue.',
    photo: '/images/landing/process-revenue-bg-v2.webp',
    visual: (live, stillDelay) => <RevenueCard live={live} stillDelay={stillDelay} />,
  },
];

/**
 * Three cards, one story. The structure follows the DataFast process section:
 * centred eyebrow and headline, then three inset-ring cards with a drawn product
 * still floating over a photographic plate. Colour and motion are the product's own.
 *
 * The section is interactive now: every card lifts on hover and expands on
 * click (or through its own button), the snippet types itself once, the arrows
 * draw once, and the handoff validates the website before leaving the page.
 */
export function BuildProcess() {
  return (
    <section
      id="process"
      aria-label="From one script tag to revenue in 3 steps"
      className="border-b border-lp-line bg-lp-secondary/35 px-6 py-20 md:px-12 md:py-28"
    >
      <div className="mx-auto max-w-[88rem]">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <p className="lp-eyebrow">How it works</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="lp-display mt-4 max-w-3xl text-3xl text-balance sm:text-4xl md:text-5xl">
              FROM ONE SCRIPT TAG TO REVENUE IN 3 STEPS
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-lp-fg-muted">
              One script, your payments, and a revenue view that tells you what to fix next.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-6 md:mt-16 lg:flex-row lg:items-stretch">
          {STEPS.map((step, index) => (
            <Fragment key={step.key}>
              <ProcessCard
                stepKey={step.key}
                index={index}
                title={step.title}
                description={step.description}
                detail={step.detail}
                photo={step.photo}
                delay={280 + index * 150}
                visual={step.visual}
              />

              {index < STEPS.length - 1 ? (
                <Reveal
                  delay={355 + index * 150}
                  distance={8}
                  className="lp-process-arrow shrink-0 max-lg:self-center"
                >
                  <ProcessArrow />
                </Reveal>
              ) : null}
            </Fragment>
          ))}
        </div>

        <Reveal delay={120} className="mt-10 flex flex-col items-center md:mt-12">
          <ProcessCta />
        </Reveal>
      </div>
    </section>
  );
}
