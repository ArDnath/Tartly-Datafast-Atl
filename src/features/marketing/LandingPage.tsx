'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { BRAND } from '@/lib/brand';
import {
  annualSavingsCents,
  formatMonthlyPrice,
  formatUsd,
  PLANS,
  type Plan,
  SETUP_EVENT_ALLOWANCE,
} from '@/lib/plans';
import styles from './Landing.module.css';

type Billing = 'monthly' | 'annual';

const PAYMENT_PROVIDERS = ['Stripe', 'Dodo Payments', 'Lemon Squeezy', 'Polar', 'Yolfi'];

const CODE_TOOLS = ['Next.js', 'React', 'Vue', 'Node.js', 'Astro', 'Plain HTML'];
const NO_CODE_TOOLS = ['WordPress', 'Shopify', 'Webflow', 'Framer', 'Wix', 'Ghost'];

const CHANNELS = [
  { name: 'X / Twitter', revenue: '$1,840', purchases: 12, width: '100%' },
  { name: 'Google', revenue: '$1,120', purchases: 7, width: '61%' },
  { name: 'Newsletter', revenue: '$780', purchases: 5, width: '42%' },
  { name: 'Direct', revenue: '$540', purchases: 3, width: '29%' },
];

const BARS = [
  38, 52, 44, 61, 49, 68, 57, 74, 63, 81, 70, 88, 76, 92, 83, 96, 88, 100, 91, 97, 86, 94, 89, 99,
];

const STEPS = [
  {
    title: 'Install the tracker',
    copy: 'Add one script tag to your site. It works with any framework, and you can verify the first event before you subscribe.',
  },
  {
    title: 'Connect revenue data',
    copy: 'Link the payment provider that already handles your checkout. Every payment is matched back to the visit that produced it.',
  },
  {
    title: 'Grow what works',
    copy: 'See revenue by channel, campaign, and landing page. Move budget toward the sources that create paying customers.',
  },
];

const FEATURES = [
  {
    title: 'Web analytics',
    copy: 'Traffic, sources, pages, and devices without the dashboard maze. Useful context for the revenue story, not the headline.',
  },
  {
    title: 'Revenue attribution',
    copy: 'First- and last-touch attribution stored per website. Open any payment and see the visit, campaign, and page behind it.',
  },
  {
    title: 'Goals, funnels, journeys',
    copy: 'Track signups, trials, and purchases as goals. Follow the path from first click to conversion, then fix the step that leaks.',
  },
  {
    title: 'Live visitor intelligence',
    copy: 'Watch sessions as they happen and inspect what a visitor did before they paid. No sampling, no delayed rollups.',
  },
];

const WHY = [
  {
    title: 'Which channel brings customers?',
    copy: 'Not clicks. Not sessions. Revenue, per source, with the purchases that produced it.',
  },
  {
    title: 'Which page precedes a payment?',
    copy: 'The landing page, campaign, and referrer are stored with every journey, so the answer is inspectable.',
  },
  {
    title: 'Where should the next dollar go?',
    copy: 'Compare revenue per visitor across channels and put budget behind the source that actually converts.',
  },
];

const FAQS = [
  {
    question: 'Do I have to change my payment provider?',
    answer:
      'No. Connect Stripe, Dodo Payments, Lemon Squeezy, Polar, or Yolfi, or send payments through the manual payment API. Your checkout stays where it is.',
  },
  {
    question: 'Is there a free tier?',
    answer:
      'No. There are exactly two paid plans: Starter and Pro. A new workspace gets a one-time 1,000-event setup allowance so you can verify the tracker before checkout; after that, ingestion pauses until you subscribe. It is not an ongoing free plan.',
  },
  {
    question: 'How does attribution work?',
    answer:
      'First-touch and last-touch attribution are stored per website. When a payment arrives, it is linked to the visit that produced it, including the source, campaign, and landing page.',
  },
  {
    question: 'What happens to pageviews and sessions?',
    answer:
      'They stay in the analytics engine. Events and replay payloads are isolated by website, and revenue is linked back to the visit that produced it.',
  },
  {
    question: 'Can I export my data?',
    answer:
      'Yes. Reports can be exported as CSV, and activity backups can be downloaded from a website’s data settings.',
  },
  {
    question: 'How many websites can I track?',
    answer:
      'Starter covers one website. Pro covers up to twenty. The limit comes from the plan configuration, so it is the same number everywhere in the product.',
  },
];

function planHighlights(plan: Plan, billing: Billing) {
  const items = [
    `${plan.websiteLimit} website${plan.websiteLimit === 1 ? '' : 's'}`,
    `${plan.eventsPerMonth.toLocaleString('en-US')} events / month`,
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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.check}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={styles.globe}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function DashboardPreview() {
  return (
    <div className={styles.demoFrame}>
      <div className={styles.browserBar}>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.browserUrl}>
          app.{BRAND.domain}
          <span className={styles.browserPath}>/overview</span>
        </span>
        <span className={styles.sampleTag}>Sample data</span>
      </div>

      <div className={styles.dashboard}>
        <div className={styles.dashTop}>
          <div className={styles.dashIdentity}>
            <span className={styles.dashSite}>{BRAND.name}</span>
            <span className={styles.dashRange}>Last 30 days</span>
          </div>
          <div className={styles.dashTabs} aria-hidden="true">
            <span className={styles.dashTabActive}>Revenue</span>
            <span>Traffic</span>
            <span>Journeys</span>
          </div>
        </div>

        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Revenue</span>
            <strong className={styles.kpiValue}>$4,280.00</strong>
            <span className={styles.kpiDelta}>+18.4%</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Revenue / visitor</span>
            <strong className={styles.kpiValue}>$0.84</strong>
            <span className={styles.kpiDelta}>+6.2%</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Purchase rate</span>
            <strong className={styles.kpiValue}>3.2%</strong>
            <span className={styles.kpiDelta}>+0.4 pt</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Visitors</span>
            <strong className={styles.kpiValue}>5,094</strong>
            <span className={styles.kpiDelta}>+11.8%</span>
          </div>
        </div>

        <div className={styles.dashBody}>
          <div className={styles.chartCard}>
            <div className={styles.panelHead}>
              <span>Revenue</span>
              <span className={styles.panelMeta}>Last 30 days</span>
            </div>
            <div className={styles.barChart} aria-hidden="true">
              {BARS.map((height, index) => (
                <span
                  key={`bar-${index}`}
                  className={styles.bar}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className={styles.chartAxis} aria-hidden="true">
              <span>Oct 7</span>
              <span>Oct 21</span>
              <span>Nov 5</span>
            </div>
          </div>

          <div className={styles.channelCard}>
            <div className={styles.panelHead}>
              <span>Revenue by channel</span>
              <span className={styles.panelMeta}>First touch</span>
            </div>
            <ul className={styles.channelList}>
              {CHANNELS.map(channel => (
                <li key={channel.name} className={styles.channelRow}>
                  <div className={styles.channelTop}>
                    <span className={styles.channelName}>{channel.name}</span>
                    <span className={styles.channelRevenue}>{channel.revenue}</span>
                  </div>
                  <div className={styles.channelTrack}>
                    <span style={{ width: channel.width }} />
                  </div>
                  <span className={styles.channelPurchases}>
                    {channel.purchases} purchase{channel.purchases === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <pre className={styles.codeBlock}>
        <code>
          {`<script
  defer
  src="${BRAND.url}/script.js"
  data-website-id="YOUR_ID"
></script>`}
        </code>
      </pre>
    );
  }

  if (index === 1) {
    return (
      <div className={styles.providerGrid}>
        {PAYMENT_PROVIDERS.map(provider => (
          <span key={provider} className={styles.providerChip}>
            <span className={styles.providerMark}>{provider.slice(0, 1)}</span>
            {provider}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.miniChannels}>
      {CHANNELS.slice(0, 3).map(channel => (
        <div key={channel.name} className={styles.miniChannel}>
          <span>{channel.name}</span>
          <div className={styles.miniTrack}>
            <span style={{ width: channel.width }} />
          </div>
          <strong>{channel.revenue}</strong>
        </div>
      ))}
    </div>
  );
}

function FeatureVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className={styles.featureMock}>
        <div className={styles.mockStats}>
          <span>
            Visitors <strong>5,094</strong>
          </span>
          <span>
            Pageviews <strong>12,840</strong>
          </span>
          <span>
            Bounce <strong>38%</strong>
          </span>
        </div>
        <svg viewBox="0 0 320 90" className={styles.sparkline} aria-hidden="true">
          <defs>
            <linearGradient id="landing-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e16540" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#e16540" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 72 24 64 48 68 72 52 96 58 120 44 144 50 168 34 192 40 216 26 240 32 264 20 288 26 320 12 V90 H0 Z"
            fill="url(#landing-area)"
          />
          <path
            d="M0 72 24 64 48 68 72 52 96 58 120 44 144 50 168 34 192 40 216 26 240 32 264 20 288 26 320 12"
            fill="none"
            stroke="#e16540"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className={styles.featureMock}>
        <ul className={styles.attributionList}>
          {CHANNELS.map(channel => (
            <li key={channel.name}>
              <span className={styles.attributionDot} />
              <span className={styles.attributionName}>{channel.name}</span>
              <span className={styles.attributionBar}>
                <i style={{ width: channel.width }} />
              </span>
              <strong>{channel.revenue}</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className={styles.featureMock}>
        <div className={styles.funnel}>
          {[
            { label: 'Visited pricing', value: '2,140', width: '100%' },
            { label: 'Started trial', value: '486', width: '68%' },
            { label: 'Connected payments', value: '212', width: '45%' },
            { label: 'Paid', value: '96', width: '28%' },
          ].map(step => (
            <div key={step.label} className={styles.funnelStep}>
              <span>{step.label}</span>
              <div className={styles.funnelTrack}>
                <i style={{ width: step.width }} />
              </div>
              <strong>{step.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.featureMock}>
      <div className={styles.liveHead}>
        <span className={styles.liveDot} />
        <span>3 visitors online</span>
      </div>
      <ul className={styles.liveFeed}>
        <li>
          <span className={styles.liveSource}>X / Twitter</span>
          <span>viewed /pricing</span>
        </li>
        <li>
          <span className={styles.liveSource}>Google</span>
          <span>started checkout</span>
        </li>
        <li>
          <span className={styles.liveSource}>Newsletter</span>
          <span>paid $79.90</span>
        </li>
      </ul>
    </div>
  );
}

export function LandingPage({ className }: { className?: string }) {
  const [billing, setBilling] = useState<Billing>('monthly');
  const starter = PLANS[0];

  return (
    <div className={`${styles.page} ${className ?? ''}`}>
      <header className={styles.header}>
        <nav className={styles.headerInner} aria-label="Main">
          <Link href="/" className={styles.brandLink} aria-label={BRAND.name}>
            <BrandMark size={32} />
            <span className={styles.wordmark}>{BRAND.name}</span>
          </Link>

          <div className={styles.navLinks}>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/docs">Docs</Link>
          </div>

          <div className={styles.headerActions}>
            <Link href="/login" className={styles.ghostButton}>
              Log in
            </Link>
            <Link href="/signup" className={styles.smallButton}>
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <h1 id="hero-title" className={styles.heroTitle}>
              Revenue-first analytics
            </h1>
            <p className={styles.heroSubtitle}>
              See which channels bring paying customers, not just pageviews. {BRAND.name} connects
              the visit to the payment so you can grow what actually works.
            </p>

            <form className={styles.signupForm} action="/signup" method="get">
              <div className={styles.inputGroup}>
                <GlobeIcon />
                <input
                  className={styles.input}
                  type="text"
                  name="website"
                  placeholder="yourwebsite.com"
                  aria-label="Your website"
                  autoComplete="url"
                />
              </div>
              <button className={styles.primaryButtonWide} type="submit">
                Add my website
                <ArrowIcon className={styles.buttonArrow} />
              </button>
            </form>

            <p className={styles.heroMeta}>
              Two plans. No free tier. Starter {formatMonthlyPrice(starter)}/mo.
            </p>
            <p className={styles.heroMetaSoft}>
              New workspaces get a one-time {SETUP_EVENT_ALLOWANCE.toLocaleString('en-US')}-event
              setup allowance.
            </p>
          </div>

          <DashboardPreview />
        </section>

        <section className={styles.logos} aria-label="Payment integrations">
          <p className={styles.logosLabel}>Connect the payments you already use</p>
          <div className={styles.marquee}>
            <div className={styles.marqueeTrack}>
              {PAYMENT_PROVIDERS.map(provider => (
                <span key={provider} className={styles.logoPill}>
                  <span className={styles.logoMark}>{provider.slice(0, 1)}</span>
                  {provider}
                </span>
              ))}
              {PAYMENT_PROVIDERS.map(provider => (
                <span key={`dup-${provider}`} className={styles.logoPill} aria-hidden="true">
                  <span className={styles.logoMark}>{provider.slice(0, 1)}</span>
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="how">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>How it works</p>
            <h2 className={styles.h2}>Find revenue opportunities in 3 steps</h2>
          </div>

          <div className={styles.steps}>
            {STEPS.map((step, index) => (
              <Fragment key={step.title}>
                <article className={styles.stepCard}>
                  <div className={styles.stepVisual}>
                    <StepVisual index={index} />
                  </div>
                  <div className={styles.stepBody}>
                    <h3 className={styles.h3}>
                      <span className={styles.stepNumber}>{index + 1}.</span> {step.title}
                    </h3>
                    <p className={styles.muted}>{step.copy}</p>
                  </div>
                </article>
                {index < STEPS.length - 1 && <ArrowIcon className={styles.stepArrow} />}
              </Fragment>
            ))}
          </div>
        </section>

        <section className={styles.section} id="features">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Features</p>
            <h2 className={styles.h2}>Analytics that show you the money, not the noise</h2>
          </div>

          <div className={styles.featureGrid}>
            {FEATURES.map((feature, index) => (
              <article key={feature.title} className={styles.featureCard}>
                <div className={styles.featureCopy}>
                  <h3 className={styles.h3}>{feature.title}</h3>
                  <p className={styles.muted}>{feature.copy}</p>
                </div>
                <div className={styles.featureVisual}>
                  <FeatureVisual index={index} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.tools}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2}>Works with your favorite tools</h2>
          </div>
          <div className={styles.toolsGrid}>
            <div className={styles.toolsColumn}>
              <h3 className={styles.toolsLabel}>Code</h3>
              <div className={styles.toolTiles}>
                {CODE_TOOLS.map(tool => (
                  <span key={tool} className={styles.toolTile}>
                    <span className={styles.toolMark}>{tool.slice(0, 1)}</span>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.toolsColumn}>
              <h3 className={styles.toolsLabel}>No-code</h3>
              <div className={styles.toolTiles}>
                {NO_CODE_TOOLS.map(tool => (
                  <span key={tool} className={styles.toolTile}>
                    <span className={styles.toolMark}>{tool.slice(0, 1)}</span>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className={styles.toolsNote}>
            One script tag. No framework lock-in, no plugin to keep in sync.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Why revenue-first</p>
            <h2 className={styles.h2}>Three questions most analytics tools cannot answer</h2>
          </div>
          <div className={styles.whyGrid}>
            {WHY.map((item, index) => (
              <article key={item.title} className={styles.whyCard}>
                <span className={styles.whyNumber}>{String(index + 1).padStart(2, '0')}</span>
                <h3 className={styles.h3}>{item.title}</h3>
                <p className={styles.muted}>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.pricingSection} id="pricing">
          <div className={styles.sectionHead}>
            <h2 className={styles.h2}>Simple plans that match your growth</h2>
            <p className={styles.sectionSub}>
              Every plan includes first- and last-touch revenue attribution. Pick the site count you
              need, cancel any time.
            </p>
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

          <div className={styles.planGrid}>
            {PLANS.map(plan => {
              const price =
                billing === 'monthly'
                  ? formatMonthlyPrice(plan)
                  : formatUsd(Math.round(plan.annualPriceCents / 12));

              return (
                <article
                  key={plan.id}
                  className={`${styles.planCard} ${plan.highlight ? styles.planHighlight : ''}`}
                  data-plan={plan.id}
                >
                  <div className={styles.planTop}>
                    <h3 className={styles.planName}>{plan.name}</h3>
                    <p className={styles.planTagline}>{plan.tagline}</p>
                  </div>

                  <div className={styles.priceRow}>
                    <span className={styles.price}>{price}</span>
                    <span className={styles.pricePeriod}>/ month</span>
                  </div>
                  <p className={styles.priceNote}>
                    {billing === 'monthly'
                      ? 'Billed monthly. Cancel any time.'
                      : `${formatUsd(plan.annualPriceCents)} billed yearly — save ${formatUsd(
                          annualSavingsCents(plan),
                        )}.`}
                  </p>

                  <Link
                    href={`/login?returnUrl=${encodeURIComponent(`/app?plan=${plan.id}`)}`}
                    className={plan.highlight ? styles.planCtaPrimary : styles.planCtaSecondary}
                  >
                    Start with {plan.name}
                  </Link>

                  <ul className={styles.planFeatures}>
                    {planHighlights(plan, billing).map(item => (
                      <li key={item}>
                        <CheckIcon />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className={styles.planFoot}>{plan.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.faqSection} id="faq">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 className={styles.h2}>Questions worth asking</h2>
          </div>
          <div className={styles.faqList}>
            {FAQS.map(item => (
              <details key={item.question} className={styles.faqItem}>
                <summary className={styles.faqSummary}>
                  <span>{item.question}</span>
                  <span className={styles.faqIcon} aria-hidden="true" />
                </summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaInner}>
              <h2 className={styles.ctaTitle}>Find the revenue hiding in your traffic</h2>
              <p className={styles.ctaCopy}>
                Discover which marketing channels bring customers so you can grow your business,
                fast.
              </p>
              <Link href="/signup" className={styles.primaryButtonWide}>
                Start with {starter.name}
              </Link>
              <p className={styles.ctaNote}>
                Two plans. No free tier. {formatMonthlyPrice(starter)}/mo to start.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.brandLink} aria-label={BRAND.name}>
              <BrandMark size={32} />
              <span className={styles.wordmark}>{BRAND.name}</span>
            </Link>
            <p>{BRAND.description}</p>
            <p className={styles.footerMeta}>Revenue-first analytics for indie SaaS founders.</p>
          </div>

          <div className={styles.footerColumns}>
            <div className={styles.footerColumn}>
              <h3>Product</h3>
              <Link href="/pricing">Pricing</Link>
              <Link href="/docs/install">Install</Link>
              <Link href="/alternatives">Compare</Link>
              <Link href="/signup">Get started</Link>
            </div>
            <div className={styles.footerColumn}>
              <h3>Resources</h3>
              <Link href="/docs">Documentation</Link>
              <Link href="/docs/revenue-guides">Revenue guides</Link>
              <Link href="/login">Log in</Link>
            </div>
            <div className={styles.footerColumn}>
              <h3>Company</h3>
              <Link href="/legal">Legal</Link>
              <a href={`mailto:${BRAND.supportEmail}`}>Contact</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {BRAND.legalEntity}
          </span>
          <span>All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
