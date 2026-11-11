'use client';

import Link from '@/components/common/Link';
import { useEffect, useState } from 'react';
import type { WorkspaceBillingAccess } from '@/features/billing/lib/access';
import { getTrialDaysRemaining } from '@/lib/plans';
import styles from './TrialBanner.module.css';

function formatEndDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

/**
 * Small, always-visible countdown during the local 7-day trial. The server
 * sends the exact end timestamp; this component only advances the clock so a
 * tab left open overnight shows the new day.
 */
export function TrialBanner({ access }: { access: WorkspaceBillingAccess }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!access.trial.active) {
      return;
    }

    const timer = window.setInterval(() => setNow(new Date()), 60_000);

    return () => window.clearInterval(timer);
  }, [access.trial.active]);

  if (!access.trial.active || !access.trial.endsAt) {
    return null;
  }

  const days = getTrialDaysRemaining(access.trial.endsAt, now);
  const urgent = days <= 1;
  const countdown = days > 1 ? `${days} days left` : days === 1 ? 'Ends today' : 'Ending now';

  return (
    <div
      className={`${styles.banner} ${urgent ? styles.urgent : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.inner}>
        <span className={styles.pill}>
          <span className={styles.dot} aria-hidden="true" />
          Free trial
        </span>
        <span className={styles.copy}>
          <strong>{countdown}</strong> · ends {formatEndDate(access.trial.endsAt)}
        </span>
        <Link href="/app/settings/billing" className={styles.link}>
          Choose a plan
        </Link>
      </div>
    </div>
  );
}
