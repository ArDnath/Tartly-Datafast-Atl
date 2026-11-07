'use client';

import { ArrowRightIcon, CheckIcon, ShieldCheckIcon, SparklesIcon, ZapIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
    <section
      id="pricing"
      className="mx-auto mt-24 flex max-w-7xl flex-col items-start justify-between gap-14 px-4 md:mt-32 lg:flex-row"
    >
      <div className="max-w-sm">
        <h2 className="font-domine text-3xl font-extrabold text-gray-900">OUR PRICING</h2>
        <p className="mt-4 text-sm/6 text-gray-500">
          Traffic-based plans with a {FREE_TRIAL_DAYS}-day free trial. Move the slider to match your
          monthly traffic. Every plan includes traffic analytics, first- and last-touch revenue
          attribution, funnels, and CSV export.
        </p>

        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="rounded-md border border-gray-200 p-2.5">
              <SparklesIcon className="size-5" />
            </div>
            <p>First- and last-touch attribution included</p>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <div className="rounded-md border border-gray-200 p-2.5">
              <ZapIcon className="size-5" />
            </div>
            <p>One script tag, fast setup</p>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <div className="rounded-md border border-gray-200 p-2.5">
              <ShieldCheckIcon className="size-5" />
            </div>
            <p>Clear event limits, no overage surprises</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.12em] text-gray-400 uppercase">
              Monthly traffic
            </p>
            <p className="text-xs tabular-nums text-gray-500">
              {formatTrafficEvents(tier.starterEventsPerMonth)} /{' '}
              {formatTrafficEvents(tier.proEventsPerMonth)} events
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
              background: `linear-gradient(to right, #1f2937 0%, #1f2937 ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`,
            }}
          />
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
            {SLIDER_LABELS.map(index => (
              <span key={index}>
                {formatTrafficEvents(getTrafficTier(index).starterEventsPerMonth)}
              </span>
            ))}
          </div>
        </div>

        <div
          className="mt-8 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 transition ${
              billing === 'monthly' ? 'bg-canvas text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
            aria-pressed={billing === 'monthly'}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 transition ${
              billing === 'annual' ? 'bg-canvas text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
            aria-pressed={billing === 'annual'}
            onClick={() => setBilling('annual')}
          >
            Yearly <span className="text-xs text-gray-400">2 months free</span>
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-900">
            {FREE_TRIAL_DAYS}-day free trial included
          </p>
          <p className="mt-1 text-xs/5 text-gray-500">
            {FREE_TRIAL_EVENTS.toLocaleString('en-US')} events and {FREE_TRIAL_WEBSITES} website. No
            card required.
          </p>
          <Link
            href="/signup?trial=1"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 underline-offset-4 hover:underline"
          >
            Start free trial
            <ArrowRightIcon className="size-3" />
          </Link>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:flex-1">
        {PLANS.map(plan => {
          const events = getTrafficEvents(plan.id, tierIndex);
          const price = getTrafficDisplayPriceCents(plan.id, tierIndex, billing);
          const annual = getTrafficAnnualCents(plan.id, tierIndex);
          const monthly = getTrafficPriceCents(plan.id, tierIndex);

          return (
            <article
              key={plan.id}
              data-plan={plan.id}
              className={`group flex flex-col rounded-xl p-6 pb-10 ${
                plan.highlight ? 'bg-black text-white' : 'border border-slate-200 bg-canvas'
              }`}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className={plan.highlight ? 'text-gray-400' : 'text-gray-500'}>{plan.tagline}</p>
                <p className="mt-4 text-2xl font-semibold tabular-nums">
                  {formatUsd(price)}{' '}
                  <span
                    className={`text-sm font-normal ${
                      plan.highlight ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    /month
                  </span>
                </p>
                <p className={`mt-1 text-xs ${plan.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                  {billing === 'monthly'
                    ? 'Billed monthly. Cancel any time.'
                    : `${formatUsd(annual)} billed yearly — save ${formatUsd(monthly * 2)}.`}
                </p>
                <Link
                  href={`/signup?plan=${plan.id}&events=${events}`}
                  className={`mt-4 w-full rounded-lg py-2.5 font-medium transition ${
                    plan.highlight
                      ? 'bg-canvas text-gray-900 hover:opacity-90'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Start {FREE_TRIAL_DAYS}-day free trial
                </Link>
              </div>

              <div className="mt-2 flex flex-col">
                {planFeatures(plan, events, billing).map(feature => (
                  <div
                    key={feature}
                    className={`flex items-center gap-2 border-b py-3 ${
                      plan.highlight ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <div
                      className={`rounded-full p-1 ${
                        plan.highlight ? 'bg-white/10' : 'bg-gray-800'
                      }`}
                    >
                      <CheckIcon className="size-3 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
