/**
 * Fails when the generated plan-facts block in docs/PRICING_ECONOMICS.md no
 * longer matches src/lib/plans.ts.
 *
 *   pnpm docs:check          # verify
 *   pnpm docs:check --write  # regenerate the block after an intentional change
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PLAN_FACTS_END,
  PLAN_FACTS_START,
  countPlanFactsBlocks,
  extractPlanFactsBlock,
  normalizePlanFactsBlock,
  renderPlanFacts,
} from '../src/lib/plan-facts';
import { PLANS } from '../src/lib/plans';

const docPath = join(process.cwd(), 'docs', 'PRICING_ECONOMICS.md');
const write = process.argv.includes('--write');
const markdown = readFileSync(docPath, 'utf8');
const rendered = renderPlanFacts(PLANS);

if (countPlanFactsBlocks(markdown) !== 1) {
  console.error(
    `docs:check: expected exactly one generated plan-facts block in ${docPath}. ` +
      'Delete any hand-written plan table and keep the generated one.',
  );
  process.exit(1);
}

const current = extractPlanFactsBlock(markdown);

if (!current) {
  console.error(`docs:check: missing ${PLAN_FACTS_START} … ${PLAN_FACTS_END} in ${docPath}.`);
  process.exit(1);
}

if (write) {
  writeFileSync(docPath, markdown.replace(current, rendered), 'utf8');
  console.info(`docs:check: regenerated the plan-facts block in ${docPath}.`);
  process.exit(0);
}

if (normalizePlanFactsBlock(current) !== normalizePlanFactsBlock(rendered)) {
  console.error(
    'docs:check: docs/PRICING_ECONOMICS.md disagrees with src/lib/plans.ts.\n' +
      'Run `pnpm docs:check --write` and commit the regenerated block.',
  );
  process.exit(1);
}

console.info('docs:check: plan facts match src/lib/plans.ts.');
