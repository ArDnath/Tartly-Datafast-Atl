import prisma from '@/lib/prisma';

/**
 * Activation funnel for internal operators.
 *
 * Every number is derived from durable records that already exist. We do not
 * write synthetic activation events, and we do not count a stage until the
 * underlying record exists:
 *
 *   signup (user) -> workspace -> website -> first event -> payment connection
 *   -> attributed payment
 *
 * "Tracker installed" and "first event" are the same real signal: the first
 * `website_event` row proves the script ran. They are displayed as one stage so
 * the funnel cannot show a fake second step.
 *
 * This query is platform-admin only. It never returns tenant payloads, only
 * aggregate counts.
 */
const ACTIVATION_SQL = `
  SELECT
    (SELECT COUNT(*) FROM "user") AS users,
    (SELECT COUNT(*) FROM "workspace" WHERE deleted_at IS NULL) AS workspaces,
    (SELECT COUNT(*) FROM "website" WHERE deleted_at IS NULL) AS websites,
    (SELECT COUNT(DISTINCT website_id) FROM "website_event") AS websites_with_events,
    (SELECT COUNT(DISTINCT website_id) FROM "payment_provider_connection"
      WHERE disconnected_at IS NULL AND connection_status = 'active') AS websites_with_payments,
    (SELECT COUNT(DISTINCT website_id) FROM "payment_attribution"
      WHERE unattributed_reason IS NULL) AS websites_with_attribution,
    (SELECT COUNT(*) FROM "website_event") AS events,
    (SELECT COUNT(*) FROM "payment") AS payments
`;

export interface ActivationStage {
  key: string;
  label: string;
  description: string;
  count: number;
  /** Share of the first stage, 0–100. */
  fromStartPercent: number;
  /** Share of the previous stage, 0–100. */
  stepPercent: number;
}

export interface ActivationFunnel {
  generatedAt: string;
  stages: ActivationStage[];
  totals: {
    events: number;
    payments: number;
  };
}

interface ActivationRow {
  users: bigint | number;
  workspaces: bigint | number;
  websites: bigint | number;
  websites_with_events: bigint | number;
  websites_with_payments: bigint | number;
  websites_with_attribution: bigint | number;
  events: bigint | number;
  payments: bigint | number;
}

function toNumber(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 1000) / 10;
}

export function buildActivationFunnel(row: ActivationRow): ActivationFunnel {
  const users = toNumber(row.users);
  const raw = [
    {
      key: 'signup',
      label: 'Signed up',
      description: 'Accounts created, including accounts later closed.',
      count: users,
    },
    {
      key: 'workspace',
      label: 'Workspace created',
      description: 'Live personal or team workspaces.',
      count: toNumber(row.workspaces),
    },
    {
      key: 'website',
      label: 'Website added',
      description: 'Live websites attached to a workspace.',
      count: toNumber(row.websites),
    },
    {
      key: 'first_event',
      label: 'First event received',
      description: 'Websites whose tracker has delivered a real event.',
      count: toNumber(row.websites_with_events),
    },
    {
      key: 'payment_connected',
      label: 'Payment provider connected',
      description: 'Websites with an active analytics payment connection.',
      count: toNumber(row.websites_with_payments),
    },
    {
      key: 'attributed_payment',
      label: 'First attributed payment',
      description: 'Websites with a payment matched to a visit.',
      count: toNumber(row.websites_with_attribution),
    },
  ];

  const first = raw[0]?.count ?? 0;

  const stages = raw.map((stage, index) => {
    const previous = index === 0 ? stage.count : (raw[index - 1]?.count ?? 0);

    return {
      ...stage,
      fromStartPercent: percent(stage.count, first),
      stepPercent: percent(stage.count, previous),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    stages,
    totals: {
      events: toNumber(row.events),
      payments: toNumber(row.payments),
    },
  };
}

export async function getActivationFunnel() {
  const [row] = (await prisma.rawQuery(ACTIVATION_SQL, {})) as ActivationRow[];

  if (!row) {
    return buildActivationFunnel({
      users: 0,
      workspaces: 0,
      websites: 0,
      websites_with_events: 0,
      websites_with_payments: 0,
      websites_with_attribution: 0,
      events: 0,
      payments: 0,
    });
  }

  return buildActivationFunnel(row);
}
