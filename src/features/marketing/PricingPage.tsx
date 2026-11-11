'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandWordmark } from '@/components/brand/BrandMark';
import { Check } from '@/components/icons';
import { BRAND } from '@/lib/brand';
import {
  DEFAULT_TRAFFIC_TIER_INDEX,
  FREE_TRIAL_DAYS,
  FREE_TRIAL_EVENTS,
  FREE_TRIAL_WEBSITES,
  formatTrafficEvents,
  formatUsd,
  getPlan,
  getTrafficAnnualCents,
  getTrafficDisplayPriceCents,
  getTrafficEvents,
  getTrafficPriceCents,
  getTrafficTier,
  PLANS,
  type Plan,
  TRAFFIC_TIERS,
} from '@/lib/plans';
import styles from './Pricing.module.css';

type Billing = 'monthly' | 'annual';

const SLIDER_LABELS = [0, 2, 3, 5, TRAFFIC_TIERS.length - 1];

function featureList(plan: Plan, events: number, billing: Billing) {
  const items = [
    `${events.toLocaleString('en-US')} events / month`,
    `${plan.websiteLimit} website${plan.websiteLimit === 1 ? '' : 's'}`,
    `${plan.retentionDays}-day analytics retention`,
    `${plan.memberLimit} team member${plan.memberLimit === 1 ? '' : 's'}`,
    plan.replaySessionsPerMonth
      ? `${plan.replaySessionsPerMonth.toLocaleString('en-US')} replays / month`
      : 'Session replay available on Pro',
    plan.paymentConnectionLimit === null
      ? 'Unlimited payment connections'
      : `${plan.paymentConnectionLimit} payment connection`,
    'First- and last-touch revenue attribution',
  ];

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

export function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [tierIndex, setTierIndex] = useState(DEFAULT_TRAFFIC_TIER_INDEX);
  const tier = getTrafficTier(tierIndex);
  const sliderPercent = (tierIndex / (TRAFFIC_TIERS.length - 1)) * 100;

  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brandLink} aria-label={BRAND.name}>
          <BrandWordmark gradient={false} />
        </Link>
        <nav className={styles.navLinks} aria-label="Main">
          <a href="#plans">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link href="/docs">Docs</Link>
          <Link href="/login" className={styles.navCta}>
            Sign in
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Two plans. A {FREE_TRIAL_DAYS}-day free trial.</p>
        <h1 className={styles.title}>Revenue analytics that grows with your traffic.</h1>
        <p className={styles.subtitle}>
          Start free with {FREE_TRIAL_EVENTS.toLocaleString('en-US')} events and{' '}
          {FREE_TRIAL_WEBSITES} website. Move the traffic slider to see the event allowance and
          price for each plan. No per-seat surprises.
        </p>

        <div className={styles.trafficPanel}>
          <div className={styles.trafficHead}>
            <div>
              <p className={styles.trafficLabel}>Monthly traffic</p>
              <p className={styles.trafficValue}>
                Starter {formatTrafficEvents(tier.starterEventsPerMonth)} · Pro{' '}
                {formatTrafficEvents(tier.proEventsPerMonth)} events
              </p>
            </div>
            <span className={styles.trafficPill}>
              Up to {formatTrafficEvents(tier.starterEventsPerMonth)} events / month
            </span>
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
            className={styles.range}
            style={{
              background: `linear-gradient(to right, #1f2937 0%, #1f2937 ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`,
            }}
          />
          <div className={styles.rangeLabels}>
            {SLIDER_LABELS.map(index => (
              <span key={index}>
                {formatTrafficEvents(getTrafficTier(index).starterEventsPerMonth)}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.billingToggle} role="group" aria-label="Billing period">
          <button
            type="button"
            className={billing === 'monthly' ? styles.toggleActive : styles.toggle}
            aria-pressed={billing === 'monthly'}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billing === 'annual' ? styles.toggleActive : styles.toggle}
            aria-pressed={billing === 'annual'}
            onClick={() => setBilling('annual')}
          >
            Yearly <span className={styles.toggleNote}>2 months free</span>
          </button>
        </div>

        <div className={styles.trialNote}>
          <span>
            <strong>{FREE_TRIAL_DAYS}-day free trial included.</strong>{' '}
            {FREE_TRIAL_EVENTS.toLocaleString('en-US')} events and {FREE_TRIAL_WEBSITES} website, no
            card required.
          </span>
          <Link href="/signup?trial=1">Start free trial →</Link>
        </div>
      </section>

      <section className={styles.plans} id="plans" aria-label="Plans">
        {PLANS.map(plan => {
          const events = getTrafficEvents(plan.id, tierIndex);
          const price = getTrafficDisplayPriceCents(plan.id, tierIndex, billing);
          const monthly = getTrafficPriceCents(plan.id, tierIndex);
          const annual = getTrafficAnnualCents(plan.id, tierIndex);

          return (
            <article
              key={plan.id}
              className={plan.highlight ? styles.cardHighlight : styles.card}
              data-plan={plan.id}
            >
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.planName}>{plan.name}</p>
                  <p className={styles.planTagline}>{plan.tagline}</p>
                </div>
                {plan.highlight && <span className={styles.badge}>For growing SaaS</span>}
              </div>

              <div className={styles.priceRow}>
                <span className={styles.price}>{formatUsd(price)}</span>
                <span className={styles.period}>/ month</span>
              </div>
              <p className={styles.billingNote}>
                {billing === 'monthly'
                  ? 'Billed monthly. Cancel any time.'
                  : `Billed ${formatUsd(annual)} yearly — you save ${formatUsd(monthly * 2)}.`}
              </p>

              <Link
                href={`/signup?plan=${plan.id}&events=${events}`}
                className={plan.highlight ? styles.ctaPrimary : styles.ctaSecondary}
              >
                Start {FREE_TRIAL_DAYS}-day free trial
              </Link>

              <ul className={styles.features}>
                {featureList(plan, events, billing).map(item => (
                  <li key={item}>
                    <Check className={styles.check} width={14} height={14} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.cardFoot}>{plan.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.compare} aria-label="What counts">
        <div>
          <h2>What counts as an event?</h2>
          <p>
            One accepted pageview or custom event, after bot filtering and deduplication. Replays
            are counted separately. We never bill for a pageview that a bot generated or that we
            rejected.
          </p>
        </div>
        <div>
          <h2>What happens at the limit?</h2>
          <p>
            You get a notice at 80% and 100%, then a small grace allowance. After that, billable
            ingestion pauses — your dashboard, reports, and exports stay available. We do not delete
            data silently and we do not auto-charge overages.
          </p>
        </div>
        <div>
          <h2>How does the free trial work?</h2>
          <p>
            Every new workspace gets {FREE_TRIAL_DAYS} days with{' '}
            {FREE_TRIAL_EVENTS.toLocaleString('en-US')} events and {FREE_TRIAL_WEBSITES} website. No
            card is required and the trial does not renew. When it ends, pick the traffic tier that
            fits and keep the reports you already built.
          </p>
        </div>
      </section>

      <section className={styles.faq} id="faq">
        <h2>Questions</h2>
        <details>
          <summary>Do I need a credit card to start?</summary>
          <p>
            No. The {FREE_TRIAL_DAYS}-day trial includes {FREE_TRIAL_EVENTS.toLocaleString('en-US')}{' '}
            events and {FREE_TRIAL_WEBSITES} website. Add a payment method only when you choose
            Starter or Pro.
          </p>
        </details>
        <details>
          <summary>Can I change plans?</summary>
          <p>
            Yes. Upgrades take effect immediately and downgrades at the end of the paid period. Plan
            data lives in one config, so the limits you see are the limits enforced.
          </p>
        </details>
        <details>
          <summary>What happens when my traffic grows?</summary>
          <p>
            Move the traffic slider to the tier you need. Starter scales to{' '}
            {formatTrafficEvents(TRAFFIC_TIERS[TRAFFIC_TIERS.length - 1].starterEventsPerMonth)}{' '}
            events and Pro scales to{' '}
            {formatTrafficEvents(TRAFFIC_TIERS[TRAFFIC_TIERS.length - 1].proEventsPerMonth)} events
            per month.
          </p>
        </details>
        <details>
          <summary>Is session replay included?</summary>
          <p>
            Replay is a Pro feature ({getPlan('pro').replaySessionsPerMonth.toLocaleString('en-US')}{' '}
            sessions per month, 30-day replay retention). Starter focuses on traffic, revenue, and
            attribution.
          </p>
        </details>
        <details>
          <summary>Where is my data stored?</summary>
          <p>
            Tenant metadata and analytics are stored in PostgreSQL. Session replay payloads are
            tenant-isolated and retention-limited. We do not sell data or use it for advertising.
          </p>
        </details>
      </section>

      <footer className={styles.footer}>
        <BrandWordmark size={24} gradient={false} />
        <p>{BRAND.tagline}. Independent product, built on an MIT-licensed analytics core.</p>
        <div className={styles.footerLinks}>
          <a href={`mailto:${BRAND.supportEmail}`}>Support</a>
          <Link href="/alternatives">Compare</Link>
          <Link href="/legal">Legal</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
