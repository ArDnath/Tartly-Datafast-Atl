import { formatUsd, type Plan } from './plans';

/**
 * Renders the plan-facts table that appears in `docs/PRICING_ECONOMICS.md`.
 *
 * The point is to make plan numbers unable to drift: the document renders this
 * block, and `pnpm docs:check` fails when the block and `src/lib/plans.ts`
 * disagree. Commentary may surround the block; it must not restate the numbers.
 */

export const PLAN_FACTS_START = '<!-- BEGIN GENERATED: plan-facts -->';
export const PLAN_FACTS_END = '<!-- END GENERATED: plan-facts -->';

type PlanFactRow = readonly [label: string, value: (plan: Plan) => string];

const int = (value: number) => new Intl.NumberFormat('en-US').format(value);

const ROWS: readonly PlanFactRow[] = [
  ['Monthly', plan => formatUsd(plan.monthlyPriceCents)],
  ['Annual (two months free)', plan => formatUsd(plan.annualPriceCents)],
  ['Free trial', () => 'none'],
  ['Websites', plan => int(plan.websiteLimit)],
  ['Members', plan => int(plan.memberLimit)],
  ['Billable events / month', plan => int(plan.eventsPerMonth)],
  ['Analytics retention', plan => `${plan.retentionDays} days`],
  [
    'Session replay',
    plan =>
      plan.replaySessionsPerMonth > 0
        ? `${int(plan.replaySessionsPerMonth)} sessions/mo, ${plan.replayRetentionDays}-day retention`
        : 'not included',
  ],
  [
    'Payment connections',
    plan => (plan.paymentConnectionLimit === null ? 'unlimited' : int(plan.paymentConnectionLimit)),
  ],
];

export function renderPlanFacts(plans: readonly Plan[]): string {
  const header = `| | ${plans.map(plan => `**${plan.name}**`).join(' | ')} |`;
  const divider = `| ${['---', ...plans.map(() => '---')].join(' | ')} |`;
  const rows = ROWS.map(
    ([label, value]) => `| ${label} | ${plans.map(plan => value(plan)).join(' | ')} |`,
  );

  return [PLAN_FACTS_START, header, divider, ...rows, PLAN_FACTS_END].join('\n');
}

function normalizeLine(line: string): string {
  const trimmed = line.trim();

  if (!trimmed.startsWith('|')) {
    return trimmed;
  }

  const cells = trimmed
    .split('|')
    .slice(1, -1)
    .map(cell => {
      const value = cell.trim();

      // Biome pads separator rows with extra dashes; the shape is what matters.
      return /^:?-{3,}:?$/.test(value) ? '---' : value;
    });

  return `| ${cells.join(' | ')} |`;
}

/**
 * Whitespace-insensitive comparison. Markdown formatters align table pipes, so
 * the checked-in block will not match the renderer byte for byte.
 */
export function normalizePlanFactsBlock(block: string): string {
  return block.split('\n').map(normalizeLine).join('\n');
}

export function extractPlanFactsBlock(markdown: string): string | null {
  const start = markdown.indexOf(PLAN_FACTS_START);

  if (start === -1) {
    return null;
  }

  const end = markdown.indexOf(PLAN_FACTS_END, start);

  if (end === -1) {
    return null;
  }

  return markdown.slice(start, end + PLAN_FACTS_END.length);
}

export function countPlanFactsBlocks(markdown: string): number {
  return markdown.split(PLAN_FACTS_START).length - 1;
}
