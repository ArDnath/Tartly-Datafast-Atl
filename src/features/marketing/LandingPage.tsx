'use client';
import Link from 'next/link';
import { BrandWordmark } from '@/components/brand/BrandMark';
import { BRAND } from '@/lib/brand';
import { PLANS, formatMonthlyPrice } from '@/lib/plans';
import styles from './Landing.module.css';

export function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brandLink} aria-label={BRAND.name}>
          <BrandWordmark />
        </Link>
        <nav className={styles.navLinks} aria-label="Main">
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className={styles.navCta}>
            Get started
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <span className={styles.eyebrow}>Revenue analytics for indie SaaS</span>
          <h1 id="hero-title" className={styles.title}>
            See which channels actually make money.
          </h1>
          <p className={styles.subtitle}>{BRAND.promise}</p>
          <div className={styles.actions}>
            <Link href="/signup" className={styles.primary}>
              Start with Starter
            </Link>
            <Link href="/pricing" className={styles.secondary}>
              See pricing
            </Link>
          </div>
          <span className={styles.note}>
            Two plans. No free tier. Starter {formatMonthlyPrice(PLANS[0])}/mo.
          </span>
        </section>

        <section className={styles.preview} aria-label="Product preview">
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>Revenue overview</span>
            <span className={styles.previewTitle}>Last 30 days</span>
          </div>
          <div className={styles.previewGrid} aria-hidden="true">
            {['Revenue', 'Revenue / visitor', 'Purchase rate', 'Visitors'].map((label, index) => (
              <div key={label} className={styles.previewMetric}>
                <span className={styles.previewMetricLabel}>{label}</span>
                <span
                  className={`${styles.previewBar} ${
                    index === 0
                      ? styles.previewBarSignal
                      : index === 3
                        ? styles.previewBarWide
                        : styles.previewBarShort
                  }`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="why-title">
          <h2 id="why-title" className={styles.sectionTitle}>
            Built around one question: where did the money come from?
          </h2>
          <p className={styles.sectionSubtitle}>
            Traffic dashboards stop at pageviews. {BRAND.name} connects the visit to the payment so
            you can see the source, campaign, and page behind each sale.
          </p>
          <div className={styles.proofGrid}>
            <article className={styles.proof}>
              <h3>Revenue first</h3>
              <p>
                Revenue, revenue per visitor, purchase rate, and revenue by source lead every
                report. Traffic is supporting context, not the headline.
              </p>
            </article>
            <article className={styles.proof}>
              <h3>Attribution you can inspect</h3>
              <p>
                First-touch and last-touch attribution are stored per website. Open the journey to
                see which visit preceded the payment.
              </p>
            </article>
            <article className={styles.proof}>
              <h3>Priced for small teams</h3>
              <p>
                One site for {formatMonthlyPrice(PLANS[0])}/mo, or up to {PLANS[1].websiteLimit}{' '}
                sites for {formatMonthlyPrice(PLANS[1])}/mo. No enterprise call, no free-tier
                funnel.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="plans-title">
          <h2 id="plans-title" className={styles.sectionTitle}>
            Two plans, no hidden tiers
          </h2>
          <p className={styles.sectionSubtitle}>
            Choose the site count you need. Every plan includes first- and last-touch revenue
            attribution.
          </p>
          <div className={styles.planGrid}>
            {PLANS.map(plan => (
              <article
                key={plan.id}
                className={`${styles.plan} ${plan.highlight ? styles.planHighlight : ''}`}
              >
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  <strong>{formatMonthlyPrice(plan)}</strong>
                  <span>per month</span>
                </div>
                <p className={styles.planCopy}>{plan.description}</p>
                <Link href="/pricing" className={styles.planLink}>
                  Compare plans
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.sectionTitle}>
            Questions worth asking
          </h2>
          <div className={styles.faq}>
            <details className={styles.faqItem}>
              <summary>Do I have to change my payment provider?</summary>
              <p>
                No. Connect Stripe, Dodo Payments, Lemon Squeezy, Polar, or Yolfi, or send payments
                through the manual payment API. Your checkout stays where it is.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Is there a free tier?</summary>
              <p>
                No. There are exactly two paid plans: Starter and Pro. That keeps the product funded
                without inventing usage limits later.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>What happens to pageviews and sessions?</summary>
              <p>
                They stay in the analytics engine. Events and replay payloads are isolated by
                website, and revenue is linked back to the visit that produced it.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Can I export my data?</summary>
              <p>
                Yes. Reports can be exported as CSV, and activity backups can be downloaded from a
                website&apos;s data settings.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} {BRAND.legalEntity}
        </span>
        <nav aria-label="Footer">
          <Link href="/pricing">Pricing</Link>
          {' · '}
          <Link href="/docs">Docs</Link>
          {' · '}
          <Link href="/alternatives">Compare</Link>
          {' · '}
          <Link href="/signup">Sign up</Link>
          {' · '}
          <Link href="/login">Sign in</Link>
          {' · '}
          <Link href="/legal">Legal</Link>
        </nav>
      </footer>
    </div>
  );
}
