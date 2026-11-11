'use client';

import Link from '@/components/common/Link';
import { BrandMark } from '@/components/brand/BrandMark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useApi } from '@/components/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { useBillingAccessQuery } from '@/features/billing/hooks/useBillingAccessQuery';
import { isBillingProductAvailable } from '@/features/billing/lib/access';
import { buildCheckoutPath, type CheckoutIntent } from '@/features/billing/lib/checkout-intent';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { BRAND } from '@/lib/brand';
import {
  formatTrafficEvents,
  formatUsd,
  getPlan,
  getTrafficAnnualCents,
  getTrafficDisplayPriceCents,
  getTrafficEvents,
} from '@/lib/plans';
import styles from './CheckoutHandoff.module.css';

/**
 * The one place every landing-page pricing card lands.
 *
 * Signed-out visitors continue through Google; new accounts finish onboarding
 * first. A live trial goes straight to `/app` (the owner can subscribe early
 * from settings), while an expired trial is handed to Dodo checkout. Nothing
 * here activates a plan: the webhook remains the source of truth.
 */
export function CheckoutHandoff({ intent }: { intent: CheckoutIntent }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useLoginQuery();
  const { workspaces, workspaceId, isLoading: workspacesLoading, save } = useActiveWorkspace();
  const { post } = useApi();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const startedRef = useRef(false);
  const checkoutPath = useMemo(() => buildCheckoutPath(intent), [intent]);

  const targetWorkspaceId =
    workspaceId ||
    workspaces.find(workspace => workspace.role === 'OWNER')?.id ||
    workspaces[0]?.id ||
    null;
  const access = useBillingAccessQuery(targetWorkspaceId);
  const plan = getPlan(intent.planId);
  const displayPriceCents = getTrafficDisplayPriceCents(
    intent.planId,
    intent.tierIndex,
    intent.interval,
  );
  const billingNote =
    intent.interval === 'annual'
      ? `${formatUsd(getTrafficAnnualCents(intent.planId, intent.tierIndex))} billed yearly`
      : 'Billed monthly · cancel any time';

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.replace(`/api/auth/google?returnUrl=${encodeURIComponent(checkoutPath)}`);
      return;
    }

    if (user.onboardingRequired) {
      router.replace(`/onboarding?next=${encodeURIComponent(checkoutPath)}`);
      return;
    }

    if (workspacesLoading) {
      return;
    }

    if (!targetWorkspaceId) {
      router.replace(`/onboarding?next=${encodeURIComponent(checkoutPath)}`);
      return;
    }

    if (workspaceId !== targetWorkspaceId) {
      save(targetWorkspaceId);
    }
  }, [
    authLoading,
    checkoutPath,
    router,
    save,
    targetWorkspaceId,
    user,
    workspaceId,
    workspacesLoading,
  ]);

  useEffect(() => {
    if (!access.data || access.isLoading) {
      return;
    }

    if (access.data.paid || access.data.trial.active) {
      router.replace('/app');
      return;
    }

    if (
      !access.data.requiresPayment ||
      !access.data.configured ||
      !isBillingProductAvailable(
        access.data.availableProducts,
        intent.planId,
        intent.interval,
        intent.tierIndex,
      ) ||
      startedRef.current
    ) {
      return;
    }

    startedRef.current = true;
    void startCheckout();
  }, [access.data, access.isLoading, intent, router]);

  async function startCheckout() {
    if (!targetWorkspaceId) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const { url } = (await post('/billing/checkout', {
        workspaceId: targetWorkspaceId,
        planId: intent.planId,
        interval: intent.interval,
        tierIndex: intent.tierIndex,
      })) as { url: string };

      window.location.assign(url);
    } catch (cause) {
      setStarting(false);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not start checkout. Please try again in a moment.',
      );
    }
  }

  const unavailable =
    access.data?.configured &&
    !isBillingProductAvailable(
      access.data.availableProducts,
      intent.planId,
      intent.interval,
      intent.tierIndex,
    );

  return (
    <main className={styles.page}>
      <ThemeToggle floating />
      <div className={styles.card}>
        <div className={styles.lockup}>
          <BrandMark size={34} alt="" />
          <span>{BRAND.name}</span>
        </div>

        <h1 className={styles.title}>
          {access.data?.trial.active ? 'Taking you to your dashboard' : 'Preparing your checkout'}
        </h1>
        <p className={styles.subtitle}>
          {access.data?.trial.active
            ? 'Your free trial is still active, so there is nothing to pay yet.'
            : 'Secure subscription checkout is handled by Dodo Payments. Your plan starts after the payment is confirmed.'}
        </p>

        <div className={styles.summary}>
          <div className={styles.row}>
            <span>Plan</span>
            <strong>
              {plan.name} · {intent.interval === 'annual' ? 'Yearly' : 'Monthly'}
            </strong>
          </div>
          <div className={styles.row}>
            <span>Included traffic</span>
            <strong>
              {formatTrafficEvents(getTrafficEvents(intent.planId, intent.tierIndex))} events /
              month
            </strong>
          </div>
          <div className={styles.row}>
            <span>Price</span>
            <span className={styles.price}>
              {formatUsd(displayPriceCents)}
              <span style={{ fontSize: 12, fontWeight: 600 }}> /mo</span>
            </span>
          </div>
          <div className={styles.row}>
            <span>Billing</span>
            <strong>{billingNote}</strong>
          </div>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {unavailable && (
          <div className={styles.error} role="alert">
            This traffic tier is not available for {intent.interval} billing yet. Choose another
            tier on the pricing page.
          </div>
        )}

        {!access.data?.configured && !access.isLoading && !access.isError && (
          <div className={styles.error} role="alert">
            Payments are temporarily unavailable. Nothing has been charged. Please try again later
            or contact {BRAND.supportEmail}.
          </div>
        )}

        {access.isError && (
          <div className={styles.error} role="alert">
            We could not verify your workspace. Refresh the page or contact {BRAND.supportEmail}.
          </div>
        )}

        {starting && !error && (
          <span className={styles.spinnerRow}>
            <span className={styles.spinner} aria-hidden="true" />
            Opening Dodo Payments…
          </span>
        )}

        {(error || unavailable || (!access.data?.configured && !access.isLoading)) && (
          <div className={styles.actions}>
            {!unavailable && error && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  startedRef.current = true;
                  void startCheckout();
                }}
              >
                Try again
              </button>
            )}
            <Link href="/pricing" className={styles.secondary}>
              Back to pricing
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
