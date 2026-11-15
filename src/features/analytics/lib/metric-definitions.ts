/**
 * In-product metric definitions. Keep these tied to the query that produces
 * each number; a definition that drifts from the SQL is worse than none.
 *
 * The overview values come from `calculateOverviewMetrics` in
 * `src/features/analytics/lib/dashboard-overview.ts` and the stats query.
 */
export const METRIC_DEFINITIONS = {
  revenue:
    'Attributed payment revenue for successful payments in the selected range, using the selected attribution model (first-touch by default). Refunds and disputes follow the stored payment status.',
  revenuePerVisitor: 'Attributed revenue divided by unique visitors in the selected range.',
  conversionRate:
    'Matched payments divided by unique visitors, times 100. Renewals count as payments, so a small returning customer base can produce a value above 100%.',
  visitors:
    'Unique visitors in the selected range. Tracking is cookieless, so uniqueness uses a rotating keyed hash: the same person after the rotation window (monthly by default) counts again, and visitors sharing an IP address and browser are counted once per window.',
  bounceRate: 'Visits with exactly one pageview divided by all visits in the range.',
  visitDuration: 'Total time spent across visits divided by the number of visits.',
  online: 'Distinct visitors with at least one event in the last 5 minutes.',
} as const;

export type MetricDefinitionKey = keyof typeof METRIC_DEFINITIONS;
