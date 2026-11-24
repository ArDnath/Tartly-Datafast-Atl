'use client';

import { Fragment } from 'react';
import { Reveal } from '../motion/Reveal';
import { CodeCard } from '../process/CodeCard';
import { ProcessArrow } from '../process/ProcessArrow';
import { ProcessCard } from '../process/ProcessCard';
import { ProcessCta } from '../process/ProcessCta';
import '../process/process.css';

const PROVIDERS = [
  { name: 'Stripe', logo: '/images/payments/stripe.svg' },
  { name: 'Dodo', logo: '/images/payments/dodo-payments.svg' },
  { name: 'Lemon Squeezy', logo: '/images/payments/lemon-squeezy.svg' },
  { name: 'Polar', logo: '/images/payments/polar.svg' },
  { name: 'Yolfi', logo: '/images/payments/yolfi.png' },
] as const;

type Step = {
  key: string;
  title: string;
  description: string;
  detail: string;
  photo: string;
  visual: (live: boolean) => React.ReactNode;
};

/**
 * Plate 2 — the payment sources. Task 2 replaces this with the interactive
 * provider web; for now it stays the shipped static chip grid so the section
 * already names every integration it supports.
 */
function ProvidersVisual() {
  return (
    <div className="lp-step-band lp-step-band--pay">
      <ul className="lp-step-providers" aria-label="Works with">
        {PROVIDERS.map(provider => (
          <li key={provider.name} className="lp-step-provider">
            <img
              src={provider.logo}
              alt=""
              aria-hidden="true"
              className="lp-step-provider-logo"
              width={16}
              height={16}
              loading="lazy"
            />
            <span>{provider.name}</span>
          </li>
        ))}
        <li className="lp-step-provider lp-step-provider--api">
          <span className="lp-step-provider-code" aria-hidden="true">
            &lt;/&gt;
          </span>
          <span>Manual API</span>
        </li>
      </ul>
    </div>
  );
}

/**
 * Plate 3 — the revenue panel, clearly marked as sample data. Task 2 replaces
 * this with the counted-up dashboard; the labels and values are already the
 * final ones so the story reads correctly today.
 */
function GrowthVisual() {
  const rows = [
    { label: 'Organic / Google', value: '$4,280', pct: 100 },
    { label: 'Direct', value: '$2,140', pct: 50 },
    { label: 'Product Hunt', value: '$1,120', pct: 26 },
  ] as const;

  return (
    <div className="lp-step-band lp-step-band--chart">
      <div className="lp-step-revenue">
        <div className="lp-step-revenue-head">
          <span className="lp-step-revenue-title">Revenue by source</span>
          <span className="lp-step-revenue-sample">Sample</span>
        </div>
        <div className="lp-step-bars">
          {rows.map(row => (
            <div key={row.label} className="lp-step-bar-row">
              <div className="lp-step-bar-meta">
                <span className="lp-step-bar-label">{row.label}</span>
                <span className="lp-step-bar-value">{row.value}</span>
              </div>
              <div className="lp-step-bar-track" aria-hidden="true">
                <div className="lp-step-bar-fill" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STEPS: Step[] = [
  {
    key: 'install',
    title: 'Install Tartly',
    description:
      'Add the script to your site. One tag, any framework, no plugin to keep in sync. The first event shows up before you pay.',
    detail: "One lightweight script. That's all it takes.",
    photo: '/images/landing/process-reach.webp',
    visual: live => <CodeCard live={live} />,
  },
  {
    key: 'connect',
    title: 'Connect revenue data',
    description:
      'Link Stripe, Dodo, Lemon Squeezy, Polar, or Yolfi, or send payments through the manual API. Your checkout stays where it is.',
    detail: 'Connect Stripe, Dodo, Lemon Squeezy, Polar, or your own payment API.',
    photo: '/images/landing/process-connect.webp',
    visual: () => <ProvidersVisual />,
  },
  {
    key: 'grow',
    title: 'See what converts',
    description:
      'See which channel, campaign, and landing page produced the payment. Move budget toward what earns, not what just gets clicks.',
    detail: 'Discover which channels and landing pages actually generate revenue.',
    photo: '/images/landing/process-grow.webp',
    visual: () => <GrowthVisual />,
  },
];

/**
 * Three cards, one story. The structure follows the DataFast process section:
 * centred eyebrow and headline, then three inset-ring cards with a drawn product
 * still floating over a photographic plate. Colour and motion are Tartly's.
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
      <div className="mx-auto max-w-6xl">
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
              One lightweight script, your payment tools, and a revenue view that tells you what to
              do next.
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
