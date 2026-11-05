import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import { isUniqueConstraintError } from '@/lib/prisma-error';
import { getPlan, getPlanOrNull, type Plan } from '@/lib/plans';

/**
 * Usage metering and plan enforcement.
 *
 * Rules:
 * - The database is the source of truth. `UsagePeriod` is never derived from
 *   analytics rows at request time, because events can be deleted or moved.
 * - Only accepted, valid, deduplicated, non-bot events are counted. The
 *   collector reserves a slot before it writes the event and releases it if
 *   the write fails.
 * - The period is the UTC calendar month. Billing periods become
 *   provider-driven when platform billing lands; the counters are keyed by
 *   `periodStart`, so changing the boundary is a migration, not a rewrite.
 * - At 80% we warn. At 100% we enter a small grace window. After the grace
 *   window, billable ingestion pauses while the dashboard stays readable.
 */

export const USAGE_WARNING_RATIO = 0.8;
/** Extra events accepted after the plan allowance before ingestion pauses. */
export const EVENT_GRACE = 1_000;
/** Extra replay sessions accepted after the plan allowance. */
export const REPLAY_GRACE = 100;

export type UsageStatus = 'ok' | 'warning' | 'grace' | 'limit';

export interface UsageMeter {
  used: number;
  limit: number;
  grace: number;
  hardLimit: number;
  remaining: number;
  percent: number;
  status: UsageStatus;
  included: boolean;
}

export interface WorkspaceUsageSnapshot {
  workspaceId: string;
  planId: string | null;
  plan: Plan;
  subscriptionStatus: string;
  periodStart: Date;
  periodEnd: Date;
  resetAt: Date;
  events: UsageMeter;
  replays: UsageMeter;
  websites: { used: number; limit: number };
  members: { used: number; limit: number };
}

export function getUsagePeriodRange(now: Date = new Date()) {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );

  return { periodStart, periodEnd };
}

export function getUsageStatus(used: number, limit: number, grace: number = 0): UsageStatus {
  if (limit <= 0) {
    return used > 0 ? 'limit' : 'ok';
  }

  if (used >= limit + grace) {
    return 'limit';
  }

  if (used >= limit) {
    return 'grace';
  }

  if (used >= Math.ceil(limit * USAGE_WARNING_RATIO)) {
    return 'warning';
  }

  return 'ok';
}

export function createUsageMeter(used: number, limit: number, grace: number = 0): UsageMeter {
  const safeUsed = Math.max(0, used);
  const safeLimit = Math.max(0, limit);
  const included = safeLimit > 0;

  return {
    used: safeUsed,
    limit: safeLimit,
    grace: included ? Math.max(0, grace) : 0,
    hardLimit: included ? safeLimit + Math.max(0, grace) : 0,
    remaining: included ? Math.max(0, safeLimit - safeUsed) : 0,
    percent:
      included && safeLimit > 0 ? Math.min(100, (safeUsed / safeLimit) * 100) : safeUsed ? 100 : 0,
    status: getUsageStatus(safeUsed, safeLimit, grace),
    included,
  };
}

export function isBillableEvent(eventType: number) {
  // Pageviews, custom events, link clicks, and pixel events are billable.
  // Performance beacons and identify calls are free.
  return eventType >= 1 && eventType <= 4;
}

export interface ReserveResult {
  allowed: boolean;
  used: number;
  limit: number;
  hardLimit: number;
}

/**
 * Atomically reserve one event from the workspace's monthly allowance.
 *
 * The INSERT ... ON CONFLICT ... WHERE pattern makes the increment and the
 * limit check a single statement, so parallel ingestion cannot push the
 * counter past the hard limit.
 */
export async function reserveEventUsage(
  workspaceId: string,
  limit: number,
  grace: number = EVENT_GRACE,
): Promise<ReserveResult> {
  const { periodStart, periodEnd } = getUsagePeriodRange();
  const safeLimit = Math.max(0, limit);
  const hardLimit = safeLimit > 0 ? safeLimit + Math.max(0, grace) : 0;

  if (hardLimit <= 0) {
    return { allowed: false, used: 0, limit: safeLimit, hardLimit: 0 };
  }

  const rows = await prisma.client.$queryRaw<Array<{ events_count: number }>>`
    INSERT INTO usage_period (
      usage_period_id, workspace_id, period_start, period_end,
      events_count, replay_sessions_count, created_at, updated_at
    )
    VALUES (${uuid()}, ${workspaceId}, ${periodStart}, ${periodEnd}, 1, 0, now(), now())
    ON CONFLICT (workspace_id, period_start) DO UPDATE
      SET events_count = usage_period.events_count + 1,
          updated_at = now()
      WHERE usage_period.events_count < ${hardLimit}
    RETURNING events_count
  `;

  if (rows.length > 0) {
    return {
      allowed: true,
      used: Number(rows[0].events_count),
      limit: safeLimit,
      hardLimit,
    };
  }

  const current = await prisma.client.usagePeriod.findUnique({
    where: {
      workspaceId_periodStart: {
        workspaceId,
        periodStart,
      },
    },
    select: { eventsCount: true },
  });

  return {
    allowed: false,
    used: current?.eventsCount ?? hardLimit,
    limit: safeLimit,
    hardLimit,
  };
}

/** Release a reservation when the event write failed. */
export async function releaseEventUsage(
  workspaceId: string,
  now: Date = new Date(),
): Promise<void> {
  const { periodStart } = getUsagePeriodRange(now);

  await prisma.client.$executeRaw`
    UPDATE usage_period
    SET events_count = GREATEST(events_count - 1, 0),
        updated_at = now()
    WHERE workspace_id = ${workspaceId}
      AND period_start = ${periodStart}
  `;
}

export interface ReplayReservation {
  allowed: boolean;
  metered: boolean;
  used: number;
  limit: number;
  hardLimit: number;
}

/**
 * Reserve one replay session. A session is metered at most once per period:
 * the unique (usagePeriodId, sessionId) row makes chunk retries idempotent.
 */
export async function reserveReplaySession({
  workspaceId,
  websiteId,
  sessionId,
  limit,
  grace = REPLAY_GRACE,
}: {
  workspaceId: string;
  websiteId: string;
  sessionId: string;
  limit: number;
  grace?: number;
}): Promise<ReplayReservation> {
  const { periodStart, periodEnd } = getUsagePeriodRange();
  const safeLimit = Math.max(0, limit);
  const hardLimit = safeLimit > 0 ? safeLimit + Math.max(0, grace) : 0;

  if (hardLimit <= 0) {
    return { allowed: false, metered: false, used: 0, limit: safeLimit, hardLimit: 0 };
  }

  try {
    const runTransaction = prisma.transaction.bind(prisma) as unknown as <T>(
      fn: (tx: any) => Promise<T>,
    ) => Promise<T>;

    return await runTransaction(async tx => {
      const period = await tx.usagePeriod.upsert({
        where: {
          workspaceId_periodStart: {
            workspaceId,
            periodStart,
          },
        },
        create: {
          id: uuid(),
          workspaceId,
          periodStart,
          periodEnd,
        },
        update: {},
        select: {
          id: true,
          replaySessionsCount: true,
        },
      });

      const alreadyMetered = await tx.usageReplaySession.findUnique({
        where: {
          usagePeriodId_sessionId: {
            usagePeriodId: period.id,
            sessionId,
          },
        },
        select: { id: true },
      });

      if (alreadyMetered) {
        return {
          allowed: true,
          metered: false,
          used: period.replaySessionsCount,
          limit: safeLimit,
          hardLimit,
        };
      }

      const updated = await tx.$executeRaw`
        UPDATE usage_period
        SET replay_sessions_count = replay_sessions_count + 1,
            updated_at = now()
        WHERE usage_period_id = ${period.id}
          AND replay_sessions_count < ${hardLimit}
      `;

      if (updated === 0) {
        return {
          allowed: false,
          metered: false,
          used: period.replaySessionsCount,
          limit: safeLimit,
          hardLimit,
        };
      }

      await tx.usageReplaySession.create({
        data: {
          id: uuid(),
          usagePeriodId: period.id,
          websiteId,
          sessionId,
        },
        select: { id: true },
      });

      return {
        allowed: true,
        metered: true,
        used: period.replaySessionsCount + 1,
        limit: safeLimit,
        hardLimit,
      };
    });
  } catch (cause) {
    if (isUniqueConstraintError(cause)) {
      // Another chunk for the same session won the race. It is already
      // metered, so this chunk is allowed and must not count twice.
      return {
        allowed: true,
        metered: false,
        used: 0,
        limit: safeLimit,
        hardLimit,
      };
    }

    throw cause;
  }
}

/** Release a replay reservation when the recording write failed. */
export async function releaseReplaySession({
  workspaceId,
  sessionId,
  now = new Date(),
}: {
  workspaceId: string;
  sessionId: string;
  now?: Date;
}): Promise<void> {
  const { periodStart } = getUsagePeriodRange(now);

  await prisma.transaction(async tx => {
    const period = await tx.usagePeriod.findUnique({
      where: {
        workspaceId_periodStart: {
          workspaceId,
          periodStart,
        },
      },
      select: { id: true },
    });

    if (!period) {
      return;
    }

    const deleted = await tx.usageReplaySession.deleteMany({
      where: {
        usagePeriodId: period.id,
        sessionId,
      },
    });

    if (deleted.count > 0) {
      await tx.usagePeriod.updateMany({
        where: {
          id: period.id,
          replaySessionsCount: { gt: 0 },
        },
        data: {
          replaySessionsCount: { decrement: 1 },
        },
      });
    }
  });
}

export async function getWorkspaceUsage(
  workspaceId: string,
  now: Date = new Date(),
): Promise<WorkspaceUsageSnapshot | null> {
  const { periodStart, periodEnd } = getUsagePeriodRange(now);

  const [workspace, period, websiteCount, memberCount, pendingInvites] = await Promise.all([
    prisma.client.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: {
        id: true,
        planId: true,
        subscriptionStatus: true,
        platformSubscription: {
          select: { planId: true, lifecycleStatus: true },
        },
      },
    }),
    prisma.client.usagePeriod.findUnique({
      where: {
        workspaceId_periodStart: {
          workspaceId,
          periodStart,
        },
      },
      select: {
        eventsCount: true,
        replaySessionsCount: true,
      },
    }),
    prisma.client.website.count({
      where: { workspaceId, deletedAt: null },
    }),
    prisma.client.workspaceMembership.count({
      where: { workspaceId },
    }),
    prisma.client.workspaceInvitation.count({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ]);

  if (!workspace) {
    return null;
  }

  const planId = workspace.platformSubscription?.planId ?? workspace.planId;
  const plan = getPlanOrNull(planId) || getPlan('starter');

  return {
    workspaceId: workspace.id,
    planId,
    plan,
    subscriptionStatus:
      workspace.platformSubscription?.lifecycleStatus ?? workspace.subscriptionStatus,
    periodStart,
    periodEnd,
    resetAt: periodEnd,
    events: createUsageMeter(period?.eventsCount ?? 0, plan.eventsPerMonth, EVENT_GRACE),
    replays: createUsageMeter(
      period?.replaySessionsCount ?? 0,
      plan.replaySessionsPerMonth,
      REPLAY_GRACE,
    ),
    websites: { used: websiteCount, limit: plan.websiteLimit },
    members: { used: memberCount + pendingInvites, limit: plan.memberLimit },
  };
}

/** Mark the 80%/100% notice as sent. Notifications are best-effort. */
export async function markUsageNotice(
  workspaceId: string,
  level: 'warning' | 'limit',
  now: Date = new Date(),
): Promise<void> {
  const { periodStart } = getUsagePeriodRange(now);

  await prisma.client.usagePeriod.updateMany({
    where: {
      workspaceId,
      periodStart,
      ...(level === 'warning'
        ? { warningNotifiedAt: null }
        : { limitNotifiedAt: null }),
    },
    data: level === 'warning' ? { warningNotifiedAt: now } : { limitNotifiedAt: now },
  });
}
