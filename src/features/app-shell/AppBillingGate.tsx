'use client';

import { Column, Loading } from '@talivia/react-zen';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { useBillingAccessQuery } from '@/features/billing/hooks/useBillingAccessQuery';
import { BillingPaywall } from '@/features/billing/components/BillingPaywall';
import { PaymentConfirmation } from '@/features/billing/components/PaymentConfirmation';
import { UsageBanner } from '@/features/app-shell/UsageBanner';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';

const CHECKOUT_CANCELLED_NOTICE = 'Checkout was cancelled. Nothing was charged.';

/**
 * The `/app` paywall guard rail.
 *
 * The read model comes from `/api/billing/access`; the UI never grants access
 * itself. Every billing-sensitive API still checks the workspace role and the
 * ingestion path still enforces the plan allowance. If the read model is
 * temporarily unavailable the shell fails open for read-only screens rather
 * than locking an owner out of their own data.
 */
export function AppBillingGate({ children }: { children: ReactNode }) {
  const { workspaceId } = useActiveWorkspace();
  const searchParams = useSearchParams();
  const initialCheckout = searchParams.get('checkout');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(initialCheckout === 'success');
  const [cancelledNotice] = useState(
    initialCheckout === 'cancelled' ? CHECKOUT_CANCELLED_NOTICE : null,
  );
  const access = useBillingAccessQuery(workspaceId, {
    refetchInterval: awaitingConfirmation ? 2500 : 60_000,
  });

  useEffect(() => {
    if (!access.data) {
      return;
    }

    if (awaitingConfirmation && !access.data.requiresPayment) {
      setAwaitingConfirmation(false);
    }

    if (
      (initialCheckout === 'success' || initialCheckout === 'cancelled') &&
      !access.data.requiresPayment
    ) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [access.data, awaitingConfirmation, initialCheckout]);

  if (!workspaceId) {
    return (
      <>
        <UsageBanner />
        <Column alignItems="center">{children}</Column>
      </>
    );
  }

  if (!access.data) {
    if (access.isError) {
      return (
        <>
          <UsageBanner />
          <Column alignItems="center">{children}</Column>
        </>
      );
    }

    return <Loading placement="absolute" />;
  }

  if (access.data.requiresPayment) {
    if (awaitingConfirmation) {
      return <PaymentConfirmation onRefresh={() => void access.refetch()} />;
    }

    return (
      <BillingPaywall
        access={{ ...access.data, role: access.data.role }}
        workspaceId={workspaceId}
        notice={cancelledNotice}
      />
    );
  }

  return (
    <>
      <UsageBanner />
      <Column alignItems="center">{children}</Column>
    </>
  );
}
