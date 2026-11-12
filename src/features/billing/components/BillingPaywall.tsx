'use client';

import { useApi } from '@/components/hooks';
import { Check } from '@/components/icons';
import { type CSSProperties, useState } from 'react';
import type {
  BillingProductAvailability,
  WorkspaceBillingAccessResponse,
} from '@/features/billing/lib/access';
import { isBillingProductAvailable } from '@/features/billing/lib/access';
import { BRAND } from '@/lib/brand';
import {
  clampTrafficTierIndex,
  formatTrafficEvents,
  formatUsd,
  getPlan,
  getTrafficAnnualCents,
  getTrafficDisplayPriceCents,
  getTrafficEvents,
  TRAFFIC_TIERS,
  type Plan,
} from '@/lib/plans';
import styles from './BillingPaywall.module.css';

const SLIDER_LABELS = [0, 2, 3, 5, TRAFFIC_TIERS.length - 1];

function features(plan: Plan, events: number, annual: boolean) {
  const items = [
    `${events.toLocaleString('en-US')} events / month`,
    `${plan.websiteLimit} website${plan.websiteLimit === 1 ? '' : 's'}`,
    `${plan.memberLimit} team member${plan.memberLimit === 1 ? '' : 's'}`,
    `${plan.retentionDays}-day analytics retention`,
    'First- and last-touch revenue attribution',
  ];

  if (plan.replaySessionsPerMonth > 0) {
    items.push(`${plan.replaySessionsPerMonth.toLocaleString('en-US')} session replays / month`);
  }
  if (plan.features.includes('client_reporting')) {
    items.push('Client-ready reporting');
  }
  if (annual) {
    items.push('Two months free, billed yearly');
  }

  return items;
}

function findAvailability(
  products: readonly BillingProductAvailability[],
  planId: Plan['id'],
  interval: 'monthly' | 'annual',
  tierIndex: number,
) {
  return isBillingProductAvailable(products, planId, interval, tierIndex);
}

export function BillingPaywall({
  access,
  workspaceId,
  notice,
}: {
  access: WorkspaceBillingAccessResponse;
  workspaceId: string;
  notice?: string | null;
}) {
  const { post } = useApi();
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [tierIndex, setTierIndex] = useState(() =>
    clampTrafficTierIndex(access.subscription?.trafficTierIndex ?? 3),
  );
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = access.role === 'OWNER';
  const ownerBlocked = !isOwner || !access.configured;
  const sliderPercent = (tierIndex / (TRAFFIC_TIERS.length - 1)) * 100;

  async function startCheckout(planId: Plan['id']) {
    setBusyPlan(planId);
    setError(null);

    try {
      const { url } = (await post('/billing/checkout', {
        workspaceId,
        planId,
        interval,
        tierIndex,
      })) as { url: string };

      window.location.assign(url);
    } catch (cause) {
      setBusyPlan(null);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not start checkout. Please try again in a moment.',
      );
    }
  }

  return (
    <section className={styles.wrap} aria-labelledby="paywall-title">
      <div className={styles.inner}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            Subscription required
          </span>
          <h1 className={styles.title} id="paywall-title">
            Choose a plan to activate this workspace.
          </h1>
          <p className={styles.subtitle}>
            Your workspace and first website are ready. Choose a plan to start collecting events.
            Checkout is handled securely by Dodo Payments. Cancel any time.
          </p>
        </div>

        {notice && (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        )}

        {!isOwner && (
          <div className={styles.notice} role="status">
            Only the workspace owner can choose a plan. Ask the owner to subscribe, then refresh
            this page.
          </div>
        )}

        {!access.configured && isOwner && (
          <div className={styles.notice} role="status">
            Payments are temporarily unavailable. Nothing has been charged. Please try again later
            or contact {BRAND.supportEmail}.
          </div>
        )}

        {error && (
          <div className={styles.alert} role="alert">
            {error}
          </div>
        )}

        <div className={styles.controls} role="group" aria-label="Billing period">
          <button
            type="button"
            className={`${styles.control} border-0`}
            data-active={interval === 'monthly'}
            aria-pressed={interval === 'monthly'}
            onClick={() => setInterval('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`${styles.control} border-0`}
            data-active={interval === 'annual'}
            aria-pressed={interval === 'annual'}
            onClick={() => setInterval('annual')}
          >
            Yearly · 2 months free
          </button>
        </div>

        <div className={styles.traffic}>
          <div className={styles.trafficHead}>
            <span className={styles.trafficLabel}>Monthly traffic</span>
            <span className={styles.trafficValue}>
              Starter {formatTrafficEvents(getTrafficEvents('starter', tierIndex))} · Pro{' '}
              {formatTrafficEvents(getTrafficEvents('pro', tierIndex))}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={TRAFFIC_TIERS.length - 1}
            step={1}
            value={tierIndex}
            onChange={event => setTierIndex(Number(event.target.value))}
            aria-label="Monthly traffic"
            aria-valuetext={`${getTrafficEvents('starter', tierIndex).toLocaleString('en-US')} Starter events, ${getTrafficEvents('pro', tierIndex).toLocaleString('en-US')} Pro events`}
            className={styles.range}
            style={{ '--range-progress': `${sliderPercent}%` } as CSSProperties}
          />
          <div className={styles.rangeLabels}>
            {SLIDER_LABELS.map(index => (
              <span key={index}>{formatTrafficEvents(getTrafficEvents('starter', index))}</span>
            ))}
          </div>
        </div>

        <div className={styles.grid}>
          {(['starter', 'pro'] as const).map(planId => {
            const plan = getPlan(planId);
            const events = getTrafficEvents(planId, tierIndex);
            const monthly = getTrafficDisplayPriceCents(planId, tierIndex, interval);
            const annual = getTrafficAnnualCents(planId, tierIndex);
            const available = findAvailability(
              access.availableProducts,
              planId,
              interval,
              tierIndex,
            );
            const disabled = ownerBlocked || !available || busyPlan !== null;

            return (
              <article
                key={planId}
                className={`${styles.card} ${plan.highlight ? styles.cardHighlight : ''}`}
                data-plan={planId}
              >
                {plan.highlight && <span className={styles.badge}>Popular</span>}

                <div className={styles.planHead}>
                  <h2 className={styles.planName}>{plan.name}</h2>
                  <p className={styles.planTagline}>{plan.tagline}</p>
                </div>

                <div className={styles.priceBlock}>
                  <span className={styles.price}>{formatUsd(monthly)}</span>
                  <span className={styles.period}>/mo</span>
                  <p className={styles.priceNote}>
                    {interval === 'annual'
                      ? `${formatUsd(annual)} billed yearly · save ${formatUsd(monthly * 2)}`
                      : 'Billed monthly · cancel any time'}
                  </p>
                  <p className={styles.trafficNote}>{formatTrafficEvents(events)} events / month</p>
                </div>

                <button
                  type="button"
                  className={`${styles.cta} ${plan.highlight ? styles.ctaPrimary : styles.ctaSecondary} border-0`}
                  disabled={disabled}
                  onClick={() => void startCheckout(planId)}
                >
                  {busyPlan === planId
                    ? 'Opening Dodo Payments…'
                    : !isOwner
                      ? 'Owner must choose'
                      : !access.configured
                        ? 'Payments unavailable'
                        : !available
                          ? 'Tier not configured'
                          : `Choose ${plan.name}`}
                </button>

                <ul className={styles.features}>
                  {features(plan, events, interval === 'annual').map(feature => (
                    <li key={feature} className={styles.feature}>
                      <span className={styles.check} aria-hidden="true">
                        <Check width={9} height={9} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className={styles.foot}>
          Subscriptions renew until cancelled. Cancel from Plan and usage in your account. Payments
          are processed by Dodo Payments; {BRAND.name} never stores card details.
        </p>
      </div>
    </section>
  );
}
