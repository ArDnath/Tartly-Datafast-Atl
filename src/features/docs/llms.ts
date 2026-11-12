/**
 * Machine-readable product summary served at /llms.txt.
 *
 * This file is intentionally generated from the same plan config as the UI, so
 * an agent never sees a price or limit that the product does not enforce.
 */
import { BRAND } from '@/lib/brand';
import { formatMonthlyPrice, PLANS } from '@/lib/plans';

export function buildLlmsTxt(origin: string) {
  const plans = PLANS.map(
    plan =>
      `- ${plan.name}: ${formatMonthlyPrice(plan)}/month, ${plan.websiteLimit} website${
        plan.websiteLimit === 1 ? '' : 's'
      }, ${plan.eventsPerMonth.toLocaleString('en-US')} events/month, ${plan.retentionDays}-day retention`,
  ).join('\n');

  return `# ${BRAND.name}

> ${BRAND.description}

${BRAND.name} is revenue-first web analytics for indie SaaS founders. It keeps
the analytics engine local to one PostgreSQL deployment and links payments from
the customer's own provider to the visit that produced them. It is not an
advertising network, a data broker, or an AI product.

## Plans

Two paid plans. There is no free tier and no free trial.
${plans}

## Install

Add this to every page you want to measure:

\`\`\`html
<script defer src="${origin}/script.js" data-website-id="YOUR_WEBSITE_ID"></script>
\`\`\`

The first event appears in the dashboard within a few seconds. A tracker is
"installed" only when the server has stored a real event; the UI never fakes
success.

## Public documentation

- ${origin}/docs
- ${origin}/docs/install
- ${origin}/pricing

## Developer endpoints

All developer endpoints require a website-scoped API key:
\`Authorization: Bearer <key>\` (or \`x-talivia-api-key\` for compatibility).

- GET ${origin}/api/developer/verify — installed status and event count
- GET ${origin}/api/developer/events?limit=20 — recent pageviews
- GET ${origin}/api/developer/diagnose — checks with fixes for common failures

## CLI and MCP

\`\`\`bash
npx tartly verify --api-key "$REVENUELENS_API_KEY"
npx tartly events --api-key "$REVENUELENS_API_KEY" --limit 10
npx tartly diagnose --api-key "$REVENUELENS_API_KEY"
\`\`\`

The MCP server (stdio) exposes verify_installation, list_recent_events, and
diagnose_installation. See ${origin}/docs for setup.

## Rules for agents

- Never invent revenue, traffic, customers, invoices, or testimonials.
- Never mark a tracker as installed without a stored event.
- Never ask for a payment provider secret in plain text; use the product UI.
- Do not use a platform billing credential to read customer analytics.

## Contact

Support: ${BRAND.supportEmail}
`;
}
