'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight as ArrowRightIcon,
  ShieldCheck as ShieldCheckIcon,
  Sparks as SparklesIcon,
  Flash as ZapIcon,
} from '@/components/icons';
import { buildCheckoutPath } from '@/features/billing/lib/checkout-intent';
import {
  DEFAULT_TRAFFIC_TIER_INDEX,
  FREE_TRIAL_DAYS,
  FREE_TRIAL_EVENTS,
  FREE_TRIAL_WEBSITES,
  formatTrafficEvents,
  formatUsd,
  getTrafficAnnualCents,
  getTrafficDisplayPriceCents,
  getTrafficEvents,
  getTrafficPriceCents,
  getTrafficTier,
  PLANS,
  type Plan,
  TRAFFIC_TIERS,
} from '@/lib/plans';
import { Reveal } from '../motion/Reveal';

type Billing = 'monthly' | 'annual';

const SLIDER_LABELS = [0, 2, 3, 5, TRAFFIC_TIERS.length - 1];

function planFeatures(plan: Plan, events: number, billing: Billing) {
  const items = [
    `${events.toLocaleString('en-US')} events / month`,
    `${plan.websiteLimit} website${plan.websiteLimit === 1 ? '' : 's'}`,
    `${plan.retentionDays}-day analytics retention`,
    `${plan.memberLimit} team member${plan.memberLimit === 1 ? '' : 's'}`,
    'First- and last-touch attribution',
  ];

  if (plan.replaySessionsPerMonth > 0) {
    items.push(`${plan.replaySessionsPerMonth.toLocaleString('en-US')} session replays / month`);
  }
  if (plan.features.includes('client_reporting')) {
    items.push('Client-ready reporting');
  }
  if (plan.features.includes('priority_support')) {
    items.push('Priority support');
  }
  if (billing === 'annual') {
    items.push('Two months free, billed yearly');
  }

  return items;
}

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [tierIndex, setTierIndex] = useState(DEFAULT_TRAFFIC_TIER_INDEX);
  const tier = getTrafficTier(tierIndex);
  const sliderPercent = (tierIndex / (TRAFFIC_TIERS.length - 1)) * 100;

  return (
    <section id="pricing" className="border-b border-lp-line bg-lp-canvas">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="lp-eyebrow">Pricing</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="lp-display mt-3 text-4xl sm:text-5xl md:text-6xl">OUR PRICING</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mx-auto mt-5 max-w-xl text-sm/6 text-lp-fg-muted sm:text-base/7">
              Traffic-based plans with a {FREE_TRIAL_DAYS}-day free trial. Move the slider to match
              your monthly traffic. Every plan includes traffic analytics, first- and last-touch
              revenue attribution, funnels, and CSV export.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 grid items-start gap-4 lg:grid-cols-[minmax(0,19rem)_1fr]">
          {/* Controls rail */}
          <Reveal className="rounded-lg border border-lp-line bg-lp-card p-5 md:p-6">
            <p className="lp-label text-lp-fg-muted">What every plan includes</p>

            <div className="mt-4 space-y-3">
              {[
                { icon: SparklesIcon, text: 'First- and last-touch attribution included' },
                { icon: ZapIcon, text: 'One script tag, fast setup' },
                { icon: ShieldCheckIcon, text: 'Clear event limits, no overage surprises' },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-3 text-xs/5 text-lp-fg-muted">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-lp-line bg-lp-canvas text-lp-primary">
                    <item.icon className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <p className="pt-1">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-lp-line pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="lp-label text-lp-fg-muted">Monthly traffic</p>
                <p className="font-mono text-[10px] font-semibold text-lp-ink tabular-nums">
                  {formatTrafficEvents(tier.starterEventsPerMonth)} /{' '}
                  {formatTrafficEvents(tier.proEventsPerMonth)}
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={TRAFFIC_TIERS.length - 1}
                step={1}
                value={tierIndex}
                onChange={event => setTierIndex(Number(event.target.value))}
                aria-label="Monthly traffic"
                aria-valuetext={`${tier.starterEventsPerMonth.toLocaleString('en-US')} Starter events, ${tier.proEventsPerMonth.toLocaleString('en-US')} Pro events`}
                className="pricing-range pricing-range-sm mt-3 w-full"
                style={{
                  background: `linear-gradient(to right, #ff4f00 0%, #ff4f00 ${sliderPercent}%, #efe6cc ${sliderPercent}%, #efe6cc 100%)`,
                }}
              />
              <div className="mt-2 flex justify-between font-mono text-[9px] text-lp-fg-muted/80">
                {SLIDER_LABELS.map(index => (
                  <span key={index}>
                    {formatTrafficEvents(getTrafficTier(index).starterEventsPerMonth)}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div
                className="lp-seg inline-flex w-full rounded-md border border-lp-line bg-lp-secondary/60 p-1"
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
                  className={`relative z-10 flex-1 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase transition-colors duration-150 ${
                    billing === 'monthly' ? 'text-white' : 'text-lp-fg-muted hover:text-lp-ink'
                  }`}
                  aria-pressed={billing === 'monthly'}
                  onClick={() => setBilling('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex-1 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase transition-colors duration-150 ${
                    billing === 'annual' ? 'text-white' : 'text-lp-fg-muted hover:text-lp-ink'
                  }`}
                  aria-pressed={billing === 'annual'}
                  onClick={() => setBilling('annual')}
                >
                  Yearly
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-lp-fg-muted">
                Yearly billing includes two months free.
              </p>
            </div>

            <div className="mt-5 rounded-md border border-dashed border-lp-line border-l-2 border-l-lp-pink bg-lp-canvas px-4 py-4">
              <p className="text-xs font-bold text-lp-ink">
                {FREE_TRIAL_DAYS}-day free trial included
              </p>
              <p className="mt-1 text-[11px]/4 text-lp-fg-muted">
                {FREE_TRIAL_EVENTS.toLocaleString('en-US')} events and {FREE_TRIAL_WEBSITES}{' '}
                website. No card required.
              </p>
              <Link
                href="/signup?trial=1"
                className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-lp-primary underline-offset-4 hover:underline"
              >
                Start free trial
                <ArrowRightIcon className="size-3" strokeWidth={3} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>

          {/* Plan cards */}
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {PLANS.map((plan, index) => {
              const events = getTrafficEvents(plan.id, tierIndex);
              const price = getTrafficDisplayPriceCents(plan.id, tierIndex, billing);
              const annual = getTrafficAnnualCents(plan.id, tierIndex);
              const monthly = getTrafficPriceCents(plan.id, tierIndex);

              return (
                <Reveal key={plan.id} delay={index * 100} className="h-full">
                  <article
                    data-plan={plan.id}
                    className={`relative flex h-full flex-col rounded-lg border p-5 md:p-7 ${
                      plan.highlight
                        ? 'lp-hard z-10 border-lp-primary bg-lp-primary/[0.04] lg:-translate-y-2'
                        : 'border-lp-line bg-lp-card'
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute top-0 right-5 -translate-y-1/2 rounded-sm border border-lp-pink bg-lp-pink px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.16em] text-lp-pink-ink uppercase">
                        Popular
                      </span>
                    )}

                    <div className="flex flex-col">
                      <h3 className="text-2xl font-black tracking-tight text-lp-ink">
                        {plan.name}
                      </h3>
                      <p className="mt-1 min-h-10 text-xs/5 font-medium text-lp-fg-muted">
                        {plan.tagline}
                      </p>

                      <div className="mt-5 border-y border-lp-line py-5">
                        <div key={`${billing}-${tierIndex}`} className="lp-price-tick">
                          <p className="text-5xl font-black tracking-tighter text-lp-ink tabular-nums sm:text-6xl">
                            {formatUsd(price)}
                            <span className="ml-1.5 align-middle text-sm font-bold tracking-normal text-lp-fg-muted">
                              /mo
                            </span>
                          </p>
                          <p className="mt-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-lp-fg-muted uppercase">
                            {billing === 'monthly'
                              ? 'Billed monthly · cancel any time'
                              : `${formatUsd(annual)} billed yearly · save ${formatUsd(monthly * 2)}`}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={buildCheckoutPath({
                          planId: plan.id,
                          interval: billing,
                          tierIndex,
                        })}
                        className={`mt-5 flex h-12 w-full items-center justify-center rounded-md text-xs font-black tracking-[0.14em] uppercase ${
                          plan.highlight
                            ? 'lp-btn-shadow bg-lp-primary text-white'
                            : 'border-2 border-lp-line bg-lp-canvas text-lp-ink shadow-[4px_4px_0_0_rgba(23,23,23,0.1)] transition-[border-color,translate,box-shadow] duration-150 ease-out hover:border-lp-ink active:translate-x-1 active:translate-y-1'
                        }`}
                      >
                        Start {FREE_TRIAL_DAYS}-day free trial
                      </Link>
                    </div>

                    <div className="mt-5 flex flex-col">
                      {planFeatures(plan, events, billing).map(feature => (
                        <div
                          key={feature}
                          className="flex items-center gap-2.5 border-b border-lp-line/70 py-2.5 last:border-b-0"
                        >
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-lp-primary">
                            <span className="size-1.5 bg-lp-primary" aria-hidden="true" />
                          </span>
                          <span className="text-[13px] font-medium text-lp-ink">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
