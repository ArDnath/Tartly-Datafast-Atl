'use client';

import Link from '@/components/common/Link';
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import styles from './PaymentConfirmation.module.css';

/**
 * Shown after Dodo returns to `/app?checkout=success` while the webhook has
 * not landed yet. The subscription flips live only when the verified webhook
 * writes it; this screen polls the read model and never activates anything.
 */
export function PaymentConfirmation({ onRefresh }: { onRefresh: () => void }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const slow = seconds >= 45;

  return (
    <section className={styles.wrap} aria-labelledby="payment-confirmation-title">
      <div className={styles.card}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1 className={styles.title} id="payment-confirmation-title">
          Payment received.
        </h1>
        <p className={styles.subtitle}>
          We are confirming your subscription with Dodo Payments. This usually takes a few seconds.
          Your workspace will open automatically once the payment is confirmed.
        </p>

        {slow && (
          <div className={styles.hint} role="status">
            This is taking longer than usual. You can wait, refresh the confirmation, or contact{' '}
            {BRAND.supportEmail} if the charge appears in your bank account.
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={`${styles.button} border-0`} onClick={onRefresh}>
            Check again
          </button>
          <Link href="/app/settings/billing" className={styles.link}>
            Plan and usage
          </Link>
        </div>
      </div>
    </section>
  );
}
