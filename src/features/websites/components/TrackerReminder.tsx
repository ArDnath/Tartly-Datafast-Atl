'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from '@/components/common/Link';
import { useBillingAccessQuery } from '@/features/billing/hooks/useBillingAccessQuery';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { useInstallStatusQuery } from '../hooks/useInstallStatusQuery';
import styles from './TrackerReminder.module.css';

const DISMISSED_KEY = 'tartly-install-reminder-dismissed';

const WEBSITE_PATH =
  /^\/app\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/.*)?$/i;

function isDashboardPath(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  if (pathname === '/app') {
    return true;
  }

  // Settings already shows the install panel; do not stack the reminder on it.
  return WEBSITE_PATH.test(pathname) && !pathname.includes('/settings');
}

/**
 * A quiet, bottom-right reminder for a website that exists but has never sent
 * an event. It is driven by the event store, not by a client-side install flag,
 * and it disappears on its own after the first real event. Dismissal lasts for
 * the browser session only, so an unfinished setup is not hidden forever.
 */
export function TrackerReminder() {
  const pathname = usePathname();
  const visible = isDashboardPath(pathname);
  const { workspaceId } = useActiveWorkspace();
  const status = useInstallStatusQuery(visible ? workspaceId : null);
  const access = useBillingAccessQuery(visible ? workspaceId : null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DISMISSED_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setDismissed(parsed.filter(value => typeof value === 'string'));
        }
      }
    } catch {
      // A blocked or corrupt session storage must not break the dashboard.
    }
  }, []);

  if (!visible || !access.data || access.data.requiresPayment) {
    return null;
  }

  const website = (status.data?.data ?? []).find(
    item => !item.connected && !dismissed.includes(item.id),
  );

  if (!website) {
    return null;
  }

  function dismiss(websiteId: string) {
    setDismissed(current => {
      const next = [...new Set([...current, websiteId])];

      try {
        sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // Session-only preference; failure is harmless.
      }

      return next;
    });
  }

  return (
    <aside className={styles.reminder} aria-label="Tracker setup reminder">
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Setup reminder</p>
        <p className={styles.title}>Tracker not connected</p>
        <p className={styles.body}>
          {website.domain || website.name} has not sent an event yet. Install the snippet, or hand
          the AI prompt to your coding agent, to start collecting revenue data.
        </p>
        <Link className={styles.action} href={`/app/${website.id}/settings#tracking`}>
          Finish setup
        </Link>
      </div>
      <button
        type="button"
        className={styles.close}
        aria-label={`Dismiss reminder for ${website.name}`}
        onClick={() => dismiss(website.id)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
