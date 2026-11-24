'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buildCheckoutPath } from '@/features/billing/lib/checkout-intent';
import { DEFAULT_TRAFFIC_TIER_INDEX, formatUsd, PLANS, type Plan } from '@/lib/plans';
import { Reveal } from '../motion/Reveal';

type Billing = 'monthly' | 'annual';

function planFeatures(plan: Plan, billing: Billing) {
  const items = [
    `${plan.eventsPerMonth.toLocaleString('en-US')} events / month`,
    `${plan.websiteLimit} website${plan.websiteLimit === 1 ? '' : 's'}`,
    `${plan.retentionDays}-day analytics retention`,
    `${plan.memberLimit} team member${plan.memberLimit === 1 ? '' : 's'}`,
    'First- and last-touch attribution',
  ];

  if (plan.replaySessionsPerMonth > 0) {
    items.push(`${plan.replaySessionsPerMonth.toLocaleString('en-US')} session replays / month`);
  }
  if (plan.features.includes('advanced_attribution')) {
    items.push('Advanced attribution and journeys');
  }
  if (plan.features.includes('client_reporting')) {
    items.push('Client-ready reporting');
  }
  if (plan.features.includes('priority_support')) {
    items.push('Priority support');
  }
  if (plan.features.includes('full_backup')) {
    items.push('Full backup and CSV export');
  } else {
    items.push('CSV export');
  }

  if (billing === 'annual') {
    items.push('Two months free, billed yearly');
  }

  return items;
}

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>('monthly');

  return (
    <section id="pricing" className="border-b border-lp-line bg-lp-canvas">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal delay={80}>
            <h2 className="lp-display mt-3 text-4xl sm:text-5xl md:text-6xl">Simple pricing</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mx-auto mt-5 max-w-xl text-sm/6 text-lp-fg-muted sm:text-base/7">
              Two plans. No free tier. Start with Starter, or Pro for more sites, replays, and
              reporting.
            </p>
          </Reveal>
        </div>

        <Reveal delay={180} className="mt-10 flex justify-center">
          <div
            className="lp-seg inline-flex rounded-md border border-lp-line bg-lp-secondary/60 p-1"
            role="group"
            aria-label="Billing period"
          >
            <span
              aria-hidden="true"
              className="lp-seg-thumb"
              data-position={billing === 'annual' ? 'annual' : 'monthly'}
            />
            <button
              type="button"
              className={`relative z-10 min-w-28 px-4 py-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase transition-colors duration-150 motion-reduce:transition-none ${
                billing === 'monthly' ? 'text-lp-canvas' : 'text-lp-fg-muted hover:text-lp-ink'
              }`}
              aria-pressed={billing === 'monthly'}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`relative z-10 min-w-28 px-4 py-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase transition-colors duration-150 motion-reduce:transition-none ${
                billing === 'annual' ? 'text-lp-canvas' : 'text-lp-fg-muted hover:text-lp-ink'
              }`}
              aria-pressed={billing === 'annual'}
              onClick={() => setBilling('annual')}
            >
              Yearly
            </button>
          </div>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {PLANS.map((plan, index) => {
            const price =
              billing === 'monthly'
                ? plan.monthlyPriceCents
                : Math.round(plan.annualPriceCents / 12);
            const annualSavings = plan.monthlyPriceCents * 12 - plan.annualPriceCents;

            return (
              <Reveal key={plan.id} delay={220 + index * 100} className="h-full">
                <article
                  data-plan={plan.id}
                  className={`relative flex h-full flex-col rounded-lg border p-6 md:p-7 ${
                    plan.highlight
                      ? 'border-lp-ink bg-lp-secondary/40 shadow-[6px_6px_0_0_rgba(23,23,23,0.08)]'
                      : 'border-lp-line bg-lp-secondary/20'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute top-0 right-5 -translate-y-1/2 rounded-sm border border-lp-ink bg-lp-ink px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.16em] text-lp-canvas uppercase">
                      Recommended
                    </span>
                  )}

                  <div className="flex flex-col">
                    <h3 className="text-2xl font-black tracking-tight text-lp-ink">{plan.name}</h3>
                    <p className="mt-1 min-h-10 text-xs/5 font-medium text-lp-fg-muted">
                      {plan.tagline}
                    </p>

                    <div className="mt-5 border-y border-lp-line py-5">
                      <div key={billing} className="lp-price-tick">
                        <p className="text-5xl font-black tracking-tighter text-lp-ink tabular-nums sm:text-6xl">
                          {formatUsd(price)}
                          <span className="ml-1.5 align-middle text-sm font-bold tracking-normal text-lp-fg-muted">
                            /mo
                          </span>
                        </p>
                        <p className="mt-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-lp-fg-muted uppercase">
                          {billing === 'monthly'
                            ? 'Billed monthly · cancel any time'
                            : `${formatUsd(plan.annualPriceCents)} billed yearly · save ${formatUsd(annualSavings)}`}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={buildCheckoutPath({
                        planId: plan.id,
                        interval: billing,
                        tierIndex: DEFAULT_TRAFFIC_TIER_INDEX,
                      })}
                      className={`mt-5 flex h-12 w-full items-center justify-center rounded-md text-xs font-black tracking-[0.14em] uppercase transition-[translate,box-shadow,border-color,background-color,color] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-lp-ink ${
                        plan.highlight
                          ? 'bg-lp-ink text-lp-canvas shadow-[4px_4px_0_0_rgba(23,23,23,0.16)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(23,23,23,0.16)] active:translate-x-1 active:translate-y-1 active:shadow-none'
                          : 'border-2 border-lp-line bg-lp-canvas text-lp-ink shadow-[4px_4px_0_0_rgba(23,23,23,0.08)] hover:border-lp-ink hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(23,23,23,0.08)] active:translate-x-1 active:translate-y-1 active:shadow-none'
                      }`}
                    >
                      Choose {plan.name}
                    </Link>
                  </div>

                  <ul className="mt-5 flex flex-col" aria-label={`${plan.name} features`}>
                    {planFeatures(plan, billing).map(feature => (
                      <li
                        key={feature}
                        className="flex items-center gap-2.5 border-b border-lp-line/70 py-2.5 last:border-b-0"
                      >
                        <span
                          className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-lp-ink/35"
                          aria-hidden="true"
                        >
                          <span className="size-1.5 bg-lp-ink/70" />
                        </span>
                        <span className="text-[13px] font-medium text-lp-ink">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
