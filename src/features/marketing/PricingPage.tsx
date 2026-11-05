'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandWordmark } from '@/components/brand/BrandMark';
import { BRAND } from '@/lib/brand';
import {
  PLANS,
  type Plan,
  formatMonthlyPrice,
  formatUsd,
  annualSavingsCents,
  getPlan,
} from '@/lib/plans';
import styles from './Pricing.module.css';

type Billing = 'monthly' | 'annual';

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className={styles.check}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function featureList(plan: Plan, billing: Billing) {
  const items = [
    `${plan.websiteLimit} website${plan.websiteLimit === 1 ? '' : 's'}`,
    `${plan.eventsPerMonth.toLocaleString('en-US')} events / month`,
    `${plan.retentionDays}-day analytics retention`,
    `${plan.memberLimit} team member${plan.memberLimit === 1 ? '' : 's'}`,
    plan.replaySessionsPerMonth
      ? `${plan.replaySessionsPerMonth.toLocaleString('en-US')} replays / month`
      : 'Session replay not included',
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

  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brandLink} aria-label={BRAND.name}>
          <BrandWordmark />
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
        <p className={styles.eyebrow}>Two plans. No free tier.</p>
        <h1 className={styles.title}>Revenue analytics for the price of a coffee.</h1>
        <p className={styles.subtitle}>
          {BRAND.promise} Every plan includes first- and last-touch attribution, funnels, and
          exports. No per-seat surprises, no unlimited promise we cannot keep.
        </p>

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
      </section>

      <section className={styles.plans} id="plans" aria-label="Plans">
        {PLANS.map(plan => {
          const price =
            billing === 'monthly'
              ? formatMonthlyPrice(plan)
              : formatUsd(Math.round(plan.annualPriceCents / 12));

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
                <span className={styles.price}>{price}</span>
                <span className={styles.period}>/ month</span>
              </div>
              <p className={styles.billingNote}>
                {billing === 'monthly'
                  ? 'Billed monthly. Cancel any time.'
                  : `Billed ${formatUsd(plan.annualPriceCents)} yearly — you save ${formatUsd(
                      annualSavingsCents(plan),
                    )}.`}
              </p>

              <Link
                href={`/login?returnUrl=${encodeURIComponent(`/app?plan=${plan.id}`)}`}
                className={plan.highlight ? styles.ctaPrimary : styles.ctaSecondary}
              >
                Start with {plan.name}
              </Link>

              <ul className={styles.features}>
                {featureList(plan, billing).map(item => (
                  <li key={item}>
                    <Check />
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
          <h2>Why no free plan?</h2>
          <p>
            A free tier would be paid for by the customers who do pay. Two honest paid plans keep
            the product and the price sustainable. You can cancel at the end of any period.
          </p>
        </div>
      </section>

      <section className={styles.faq} id="faq">
        <h2>Questions</h2>
        <details>
          <summary>Do I need a credit card to start?</summary>
          <p>Yes. There is no free tier; billing starts when you subscribe.</p>
        </details>
        <details>
          <summary>Can I change plans?</summary>
          <p>
            Yes. Upgrades take effect immediately and downgrades at the end of the paid period.
            {` `}Plan data lives in one config, so the limits you see are the limits enforced.
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
        <BrandWordmark size={24} />
        <p>{BRAND.tagline}. Independent product, built on an MIT-licensed analytics core.</p>
        <div className={styles.footerLinks}>
          <a href={`mailto:${BRAND.supportEmail}`}>Support</a>
          <Link href="/legal">Legal</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
