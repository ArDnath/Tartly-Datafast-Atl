import Image from 'next/image';
import { Fragment } from 'react';
import {
  ArrowRight as ArrowRightIcon,
  Check as CheckIcon,
  Globe as GlobeIcon,
} from '@/components/icons';
import { Reveal } from '../motion/Reveal';

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
  photo: string;
  visual: React.ReactNode;
};

function SnipVisual() {
  return (
    <div className="lp-step-band lp-step-band--code">
      <div className="lp-step-window">
        <div className="lp-step-window-bar">
          <span className="lp-step-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="lp-step-window-name">index.html</span>
        </div>
        <div className="lp-step-code">
          <span className="lp-step-code-dim">&lt;</span>
          <span className="lp-step-code-tag">script</span>{' '}
          <span className="lp-step-code-attr">defer</span>{' '}
          <span className="lp-step-code-attr">src</span>
          <span className="lp-step-code-dim">="</span>https://tartly.in/t.js
          <span className="lp-step-code-dim">"</span>{' '}
          <span className="lp-step-code-attr">data-site</span>
          <span className="lp-step-code-dim">="</span>site_8f2a
          <span className="lp-step-code-dim">"&gt;&lt;/</span>
          <span className="lp-step-code-tag">script</span>
          <span className="lp-step-code-dim">&gt;</span>
        </div>
      </div>
    </div>
  );
}

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
    photo: '/images/landing/process-reach.webp',
    visual: <SnipVisual />,
  },
  {
    key: 'connect',
    title: 'Connect revenue data',
    description:
      'Link Stripe, Dodo, Lemon Squeezy, Polar, or Yolfi, or send payments through the manual API. Your checkout stays where it is.',
    photo: '/images/landing/process-connect.webp',
    visual: <ProvidersVisual />,
  },
  {
    key: 'grow',
    title: 'Grow what pays',
    description:
      'See which channel, campaign, and landing page produced the payment. Move budget toward what earns, not what just gets clicks.',
    photo: '/images/landing/process-grow.webp',
    visual: <GrowthVisual />,
  },
];

/**
 * Three cards, one story. The structure follows the DataFast process section:
 * centred eyebrow and headline, then three inset-ring cards with a drawn product
 * still floating over a photographic plate. Colour and motion are Tartly's.
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
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-6 md:mt-20 lg:flex-row lg:items-stretch">
          {STEPS.map((step, index) => (
            <Fragment key={step.key}>
              {index > 0 ? (
                <ArrowRightIcon
                  className="lp-step-arrow size-6 shrink-0 max-lg:rotate-90 lg:self-center"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : null}

              <Reveal
                as="article"
                delay={index * 90}
                distance={24}
                className="lp-step-shell w-full max-w-lg lg:min-w-0 lg:flex-1"
              >
                <div
                  className="lp-step-card"
                  style={{ '--lp-still-delay': `${260 + index * 90}ms` } as React.CSSProperties}
                >
                  <figure className="lp-step-figure">
                    <Image
                      src={step.photo}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 80vw, 100vw"
                      className="lp-step-photo"
                    />
                    {step.visual}
                    <span aria-hidden="true" className="lp-step-veil" />
                    <span aria-hidden="true" className="lp-step-grain" />
                  </figure>
                  <div className="lp-step-body">
                    <h3 className="lp-step-title">
                      <span className="lp-step-num">{index + 1}.</span> {step.title}
                    </h3>
                    <p className="lp-step-copy">{step.description}</p>
                  </div>
                </div>
              </Reveal>
            </Fragment>
          ))}
        </div>

        <Reveal delay={120} className="mt-10 flex flex-col items-center md:mt-12">
          <form
            action="/signup"
            method="get"
            className="flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row"
          >
            <input type="hidden" name="returnUrl" value="/onboarding" />
            <div className="lp-hero-input-wrap relative flex-1">
              <GlobeIcon
                className="lp-hero-input-icon pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-lp-fg-muted"
                aria-hidden="true"
              />
              <label htmlFor="process-website" className="sr-only">
                Website to add
              </label>
              <input
                id="process-website"
                name="website"
                type="text"
                autoComplete="url"
                required
                placeholder="yourwebsite.com"
                className="lp-hero-input h-12 w-full rounded-md border border-lp-line bg-lp-card pr-4 pl-10 text-[14px] font-medium text-lp-ink transition-colors placeholder:text-lp-fg-muted/60 hover:border-2 hover:border-lp-ink focus:border-[3px] focus:border-lp-ink"
              />
            </div>
            <button
              type="submit"
              className="lp-btn-shadow lp-hero-submit flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-lp-primary px-6 text-[13px] font-black tracking-[0.14em] whitespace-nowrap text-white uppercase"
            >
              Add your site
              <ArrowRightIcon
                className="lp-hero-submit-arrow size-4"
                strokeWidth={3}
                aria-hidden="true"
              />
            </button>
          </form>

          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] font-medium text-lp-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" />
              One script tag
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" />
              First event before you pay
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
