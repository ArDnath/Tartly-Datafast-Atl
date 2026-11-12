/**
 * The single source of truth for pricing and limits.
 *
 * Commercial model (owner-fixed, updated 2026-11-12):
 * - Two paid plans: Starter and Pro. There is no free trial and no free tier.
 * - Starter $7.99/mo at 100,000 events; Pro $14.99/mo at 1,000,000 events.
 * - Pro includes 50 websites. Starter includes 1.
 * - The traffic slider raises the included events and the price together.
 * - An unpaid workspace may finish onboarding (one website, one member) and
 *   then sees the paywall. Ingestion requires an active subscription.
 *
 * Any UI or API that needs a limit must read it from here. Do not hardcode
 * plan limits in components, routes, or webhook handlers.
 */

export const PLAN_IDS = ['starter', 'pro'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type PlanFeature =
  | 'revenue_attribution'
  | 'advanced_attribution'
  | 'funnels'
  | 'journeys'
  | 'session_replay'
  | 'client_reporting'
  | 'priority_support'
  | 'api_access'
  | 'full_backup'
  | 'csv_export';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  description: string;
  /** Integer cents. Never use floats for money. */
  monthlyPriceCents: number;
  /** Annual price with two months free. */
  annualPriceCents: number;
  currency: 'USD';
  /** Maximum websites. Starter is exactly 1; Pro is a cap. */
  websiteLimit: number;
  memberLimit: number;
  /** Billable, accepted, deduplicated, non-bot events per month. */
  eventsPerMonth: number;
  /** Analytics data retention in days. */
  retentionDays: number;
  /** Replay sessions per month. 0 means the feature is not included. */
  replaySessionsPerMonth: number;
  /** Replay payload retention in days. 0 when replay is not included. */
  replayRetentionDays: number;
  /** Payment provider connections. `null` means unlimited. */
  paymentConnectionLimit: number | null;
  features: readonly PlanFeature[];
  /** Shown first in the pricing UI. */
  highlight?: boolean;
}

export interface TrafficTier {
  /** Included events per month on Starter. */
  starterEventsPerMonth: number;
  /** Included events per month on Pro. */
  proEventsPerMonth: number;
  /** Integer cents for Starter at this traffic tier. */
  starterPriceCents: number;
  /** Integer cents for Pro at this traffic tier. */
  proPriceCents: number;
}

/**
 * Traffic tiers shown by the pricing slider. The default tier is the
 * owner-fixed price point. Every entry stays below DataFast's published
 * $9/mo Starter and $19/mo Growth entry prices while including more events.
 */
export const TRAFFIC_TIERS: readonly TrafficTier[] = [
  {
    starterEventsPerMonth: 10_000,
    proEventsPerMonth: 100_000,
    starterPriceCents: 599,
    proPriceCents: 1099,
  },
  {
    starterEventsPerMonth: 25_000,
    proEventsPerMonth: 250_000,
    starterPriceCents: 699,
    proPriceCents: 1299,
  },
  {
    starterEventsPerMonth: 50_000,
    proEventsPerMonth: 500_000,
    starterPriceCents: 749,
    proPriceCents: 1399,
  },
  {
    starterEventsPerMonth: 100_000,
    proEventsPerMonth: 1_000_000,
    starterPriceCents: 799,
    proPriceCents: 1499,
  },
  {
    starterEventsPerMonth: 250_000,
    proEventsPerMonth: 2_500_000,
    starterPriceCents: 1199,
    proPriceCents: 2299,
  },
  {
    starterEventsPerMonth: 500_000,
    proEventsPerMonth: 5_000_000,
    starterPriceCents: 1699,
    proPriceCents: 3199,
  },
  {
    starterEventsPerMonth: 1_000_000,
    proEventsPerMonth: 10_000_000,
    starterPriceCents: 2499,
    proPriceCents: 4799,
  },
  {
    starterEventsPerMonth: 2_000_000,
    proEventsPerMonth: 10_000_000,
    starterPriceCents: 3999,
    proPriceCents: 7499,
  },
] as const;

/** The owner-fixed price point: $7.99 Starter / $14.99 Pro. */
export const DEFAULT_TRAFFIC_TIER_INDEX = 3;

/**
 * Allowances that let a new workspace finish onboarding before payment.
 * They are not a free plan: paid features and ingestion stay locked until a
 * subscription is active. There is no time limit on them because there is no
 * trial clock; the paywall appears as soon as the workspace enters the app.
 */
export const SETUP_WEBSITES = 1;
export const SETUP_MEMBERS = 1;

export const PLANS: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Your first revenue signal',
    description:
      'One site, real revenue attribution, and 100,000 events to find the channel that actually pays.',
    monthlyPriceCents: 799,
    annualPriceCents: 7990,
    currency: 'USD',
    websiteLimit: 1,
    memberLimit: 1,
    eventsPerMonth: 100_000,
    retentionDays: 90,
    replaySessionsPerMonth: 0,
    replayRetentionDays: 0,
    paymentConnectionLimit: 1,
    features: ['revenue_attribution', 'funnels', 'csv_export'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For indie SaaS, teams, and small agencies',
    description:
      'Up to 50 sites, 1,000,000 events, session replay, advanced attribution, and client-ready reporting.',
    monthlyPriceCents: 1499,
    annualPriceCents: 14990,
    currency: 'USD',
    websiteLimit: 50,
    memberLimit: 10,
    eventsPerMonth: 1_000_000,
    retentionDays: 365,
    replaySessionsPerMonth: 2_000,
    replayRetentionDays: 30,
    paymentConnectionLimit: null,
    features: [
      'revenue_attribution',
      'advanced_attribution',
      'funnels',
      'journeys',
      'session_replay',
      'client_reporting',
      'priority_support',
      'api_access',
      'full_backup',
      'csv_export',
    ],
    highlight: true,
  },
] as const;

const PLAN_MAP = new Map<PlanId, Plan>(PLANS.map(plan => [plan.id, plan]));

/**
 * Resolve the plan the workspace actually bought. The public price list has
 * traffic tiers; the provider product records which tier was purchased, so
 * entitlement checks must use that tier rather than the default allowance.
 */
export function resolvePlanForTrafficTier(
  plan: Plan | PlanId,
  tierIndex: number | null | undefined,
): Plan {
  const resolved = typeof plan === 'string' ? getPlan(plan) : plan;

  if (tierIndex === null || tierIndex === undefined || !Number.isInteger(tierIndex)) {
    return resolved;
  }

  return {
    ...resolved,
    monthlyPriceCents: getTrafficPriceCents(resolved.id, tierIndex),
    annualPriceCents: getTrafficAnnualCents(resolved.id, tierIndex),
    eventsPerMonth: getTrafficEvents(resolved.id, tierIndex),
  };
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}

export function getPlan(id: PlanId): Plan {
  const plan = PLAN_MAP.get(id);

  if (!plan) {
    throw new Error(`Unknown plan: ${id}`);
  }

  return plan;
}

export function getPlanOrNull(id: unknown): Plan | null {
  return isPlanId(id) ? getPlan(id) : null;
}

export function planHasFeature(plan: Plan | PlanId, feature: PlanFeature): boolean {
  const resolved = typeof plan === 'string' ? getPlan(plan) : plan;

  return resolved.features.includes(feature);
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatMonthlyPrice(plan: Plan): string {
  return formatUsd(plan.monthlyPriceCents);
}

export function formatAnnualPrice(plan: Plan): string {
  return formatUsd(plan.annualPriceCents);
}

export function annualSavingsCents(plan: Plan): number {
  return plan.monthlyPriceCents * 12 - plan.annualPriceCents;
}

export function clampTrafficTierIndex(index: number): number {
  if (!Number.isFinite(index)) {
    return DEFAULT_TRAFFIC_TIER_INDEX;
  }

  return Math.min(TRAFFIC_TIERS.length - 1, Math.max(0, Math.round(index)));
}

export function getTrafficTier(index: number): TrafficTier {
  return TRAFFIC_TIERS[clampTrafficTierIndex(index)];
}

export function getTrafficEvents(planId: PlanId, index: number): number {
  const tier = getTrafficTier(index);

  return planId === 'pro' ? tier.proEventsPerMonth : tier.starterEventsPerMonth;
}

export function getTrafficPriceCents(planId: PlanId, index: number): number {
  const tier = getTrafficTier(index);

  return planId === 'pro' ? tier.proPriceCents : tier.starterPriceCents;
}

/** Annual price for a traffic tier: monthly price × 10 (two months free). */
export function getTrafficAnnualCents(planId: PlanId, index: number): number {
  return getTrafficPriceCents(planId, index) * 10;
}

export function getTrafficDisplayPriceCents(
  planId: PlanId,
  index: number,
  billing: 'monthly' | 'annual',
): number {
  const monthly = getTrafficPriceCents(planId, index);

  return billing === 'annual' ? Math.round((monthly * 10) / 12) : monthly;
}

export function formatTrafficEvents(events: number): string {
  if (events >= 1_000_000) {
    const millions = events / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (events >= 1_000) {
    return `${Math.round(events / 1_000)}k`;
  }

  return String(events);
}
