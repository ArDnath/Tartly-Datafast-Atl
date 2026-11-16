import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  countPlanFactsBlocks,
  extractPlanFactsBlock,
  normalizePlanFactsBlock,
  renderPlanFacts,
} from '@/lib/plan-facts';
import { PLANS } from '@/lib/plans';

const docsRoot = join(process.cwd(), 'docs');
const pricingDoc = join(docsRoot, 'PRICING_ECONOMICS.md');

// Point-in-time audits and competitor research quote old claims on purpose.
const HISTORICAL_DIRS = new Set(['product-audit', 'market-intelligence', 'autonomous-engineering']);

function listDocs(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      return HISTORICAL_DIRS.has(entry) ? [] : listDocs(path);
    }

    return path.endsWith('.md') ? [path] : [];
  });
}

describe('generated plan facts', () => {
  test('render from the plan config', () => {
    const block = renderPlanFacts(PLANS);

    expect(block).toContain('| **Starter** | **Pro** |');
    expect(block).toContain('| Websites | 1 | 20 |');
    expect(block).toContain('| Billable events / month | 100,000 | 1,000,000 |');
    expect(block).toContain('| Session replay | not included |');
    expect(block).toContain('| Payment connections | 1 | unlimited |');
  });

  test('PRICING_ECONOMICS renders exactly the config block', () => {
    const markdown = readFileSync(pricingDoc, 'utf8');

    expect(countPlanFactsBlocks(markdown)).toBe(1);

    const block = extractPlanFactsBlock(markdown);

    expect(block).not.toBeNull();
    expect(normalizePlanFactsBlock(block ?? '')).toBe(
      normalizePlanFactsBlock(renderPlanFacts(PLANS)),
    );
  });

  test('no current document overstates the Pro website limit', () => {
    const proLimit = PLANS.find(plan => plan.id === 'pro')?.websiteLimit;
    const offenders: string[] = [];

    for (const path of listDocs(docsRoot)) {
      const text = readFileSync(path, 'utf8');

      for (const match of text.matchAll(/up to (\d+) websites/gi)) {
        if (Number(match[1]) !== proLimit) {
          offenders.push(`${relative(process.cwd(), path)}: "${match[0]}"`);
        }
      }
    }

    expect(offenders, `Pro allows ${proLimit} websites`).toEqual([]);
  });
});
