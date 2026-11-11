'use client';

import { TrialBanner } from '@/features/billing/components/TrialBanner';
import { useBillingAccessQuery } from '@/features/billing/hooks/useBillingAccessQuery';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';

/**
 * The trial strip sits above the app navbar so the countdown is the first
 * thing an owner sees. It shares the billing-access query cache with the
 * paywall gate; only the gate owns the refresh interval.
 */
export function AppTrialBanner() {
  const { workspaceId } = useActiveWorkspace();
  const access = useBillingAccessQuery(workspaceId, { refetchInterval: false });

  if (!workspaceId || !access.data?.trial.active) {
    return null;
  }

  return <TrialBanner access={access.data} />;
}
