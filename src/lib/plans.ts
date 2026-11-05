/**
 * The single source of truth for the paid plans.
 *
 * Rules (owner-fixed):
 * - Exactly two plans: Starter and Pro.
 * - No free tier.
 * - Starter $7.99/mo, Pro $14.99/mo.
 * - Starter 1 website, Pro up to 20 websites.
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

export const PLANS: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Your first revenue signal',
    description:
      'One site, real revenue attribution, and enough events to find the channel that actually pays.',
    monthlyPriceCents: 799,
    annualPriceCents: 7990,
    currency: 'USD',
    websiteLimit: 1,
    memberLimit: 1,
    eventsPerMonth: 50_000,
    retentionDays: 90,
    replaySessionsPerMonth: 0,
    replayRetentionDays: 0,
    paymentConnectionLimit: 1,
    features: ['revenue_attribution', 'funnels', 'csv_export'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For indie SaaS and small teams',
    description:
      'Up to 20 sites, 10× the event allowance, session replay, advanced attribution, and client-ready reporting.',
    monthlyPriceCents: 1499,
    annualPriceCents: 14990,
    currency: 'USD',
    websiteLimit: 20,
    memberLimit: 5,
    eventsPerMonth: 500_000,
    retentionDays: 180,
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
 * Install-verification allowance for a workspace with no active paid
 * subscription. This is NOT a free plan: it exists only so onboarding can
 * verify the tracker before checkout, and it is capped per calendar month.
 * After it is consumed, billable ingestion pauses until the workspace
 * subscribes.
 */
export const SETUP_EVENT_ALLOWANCE = 1_000;

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
