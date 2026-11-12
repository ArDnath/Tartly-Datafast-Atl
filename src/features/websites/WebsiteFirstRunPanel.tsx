'use client';

import Link from '@/components/common/Link';
import { ArrowRight } from '@/components/icons';
import { BRAND } from '@/lib/brand';
import styles from './WebsiteFirstRunPanel.module.css';

const STEPS = [
  {
    label: 'Website',
    detail: 'Add the domain visitors use.',
  },
  {
    label: 'Tracker',
    detail: 'Copy the snippet or hand the AI prompt to your coding agent.',
  },
  {
    label: 'Revenue',
    detail: 'Connect the payment provider that already handles your revenue.',
  },
];

/**
 * The empty portfolio is an invitation to act, not a dead end. It uses the
 * same three-step language as /onboarding and /app/new, so the setup path is
 * recognizable before the customer enters it.
 */
export function WebsiteFirstRunPanel() {
  return (
    <section className={styles.panel} aria-labelledby="first-website-title">
      <p className={styles.eyebrow}>First website</p>
      <h2 className={styles.title} id="first-website-title">
        Connect your first website
      </h2>
      <p className={styles.body}>
        Add your site, install one tracker, then connect payments. {BRAND.name} matches every
        payment to the traffic that produced it.
      </p>

      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li className={styles.step} key={step.label}>
            <span className={styles.stepIndex} aria-hidden="true">
              {index + 1}
            </span>
            <span>
              <span className={styles.stepLabel}>{step.label}</span>
              <span className={styles.stepDetail}>{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <Link className={styles.action} href="/app/new">
        Add your first website
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
