import { getPlan, getPlanOrNull } from '@/lib/plans';
import prisma from '@/lib/prisma';

/**
 * Analytics payload retention.
 *
 * Rules:
 * - Each website is reduced using the plan that currently owns it. The plan
 *   codes are read from `platform_subscription` first, then the workspace
 *   mirror, and finally Starter. Unpaid workspaces have no paid plan, so
 *   Starter is the conservative floor for legacy rows.
 * - The job is tenant-scoped: every delete and detach carries the website id.
 *   It never takes a tenant id from a request and never returns row contents.
 * - The job is idempotent. `deleteMany` and `updateMany` are safe to run twice;
 *   the second run only sees rows that are still older than the cutoff.
 * - Payment, subscription, refund, dispute, invoice, usage, audit, and billing
 *   records are durable business records and are not deleted. Only their
 *   optional links to expired analytics sessions are detached.
 * - Session replay is metered and retained separately. A plan with no replay
 *   entitlement (`replayRetentionDays` = 0) has no replay payload storage, so
 *   every replay row for that website is removed.
 * - `ANALYTICS_RETENTION_DRY_RUN=true` (or `dryRun: true`) counts the payload
 *   rows without deleting them.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AnalyticsRetentionWebsite {
  id: string;
  deletedAt?: Date | null;
  workspace: {
    planId: string | null;
    deletedAt?: Date | null;
    platformSubscription: { planId: string } | null;
  } | null;
}

export interface AnalyticsRetentionOptions {
  client?: any;
  transaction?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  now?: Date;
  dryRun?: boolean;
  websiteIds?: string[];
}

export interface WebsiteRetentionResult {
  websiteId: string;
  closed: boolean;
  planId: string;
  retentionDays: number;
  replayRetentionDays: number;
  events: number;
  eventData: number;
  sessionData: number;
  replays: number;
  savedReplays: number;
  sessions: number;
  revenue: number;
  dryRun: boolean;
}

function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - Math.max(0, days) * MS_PER_DAY);
}

function getPlanForWebsite(website: AnalyticsRetentionWebsite) {
  const planId = website.workspace?.platformSubscription?.planId || website.workspace?.planId;

  return getPlanOrNull(planId) || getPlan('starter');
}

/**
 * The session purge follows the same reference order as the website reset
 * path: detach optional links from durable billing/attribution rows, delete
 * analytics revenue and payload rows, then delete the sessions themselves.
 */
async function purgeWebsitePayloads({
  tx,
  websiteId,
  eventCutoff,
  replayCutoff,
}: {
  tx: any;
  websiteId: string;
  eventCutoff: Date;
  replayCutoff: Date | null;
}) {
  const replayWhere = {
    websiteId,
    ...(replayCutoff ? { createdAt: { lt: replayCutoff } } : {}),
  };

  const replays = await tx.sessionReplay.deleteMany({ where: replayWhere });
  const savedReplays = await tx.sessionReplaySaved.deleteMany({ where: replayWhere });

  const eventData = await tx.eventData.deleteMany({
    where: { websiteId, createdAt: { lt: eventCutoff } },
  });
  const sessionData = await tx.sessionData.deleteMany({
    where: { websiteId, createdAt: { lt: eventCutoff } },
  });

  // Payment and attribution records keep their snapshot fields. These links
  // point at raw events/sessions and must be detached before the payload goes.
  const detachDetectionEvents = await tx.paymentDetectionEvent.updateMany({
    where: {
      websiteId,
      websiteEvent: { is: { createdAt: { lt: eventCutoff } } },
    },
    data: { websiteEventId: null },
  });
  const detachAttributionEvents = await tx.paymentAttribution.updateMany({
    where: {
      websiteId,
      conversionEvent: { is: { createdAt: { lt: eventCutoff } } },
    },
    data: { conversionEventId: null },
  });

  const events = await tx.websiteEvent.deleteMany({
    where: { websiteId, createdAt: { lt: eventCutoff } },
  });

  const revenue = await tx.revenue.deleteMany({
    where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
  });

  await tx.payment.updateMany({
    where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
    data: { sessionId: null },
  });
  await tx.subscription.updateMany({
    where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
    data: { sessionId: null },
  });
  await tx.paymentDetectionEvent.updateMany({
    where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
    data: { sessionId: null },
  });
  await tx.paymentMatch.updateMany({
    where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
    data: { sessionId: null },
  });
  await tx.paymentAttribution.updateMany({
    where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
    data: { sessionId: null },
  });
  await tx.visitorIdentityLink.updateMany({
    where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
    data: { sessionId: null },
  });

  // Visitor first/last pointers use onDelete: Restrict, so detach them too.
  await tx.visitor.updateMany({
    where: { websiteId, firstSession: { is: { createdAt: { lt: eventCutoff } } } },
    data: { firstSessionId: null },
  });
  await tx.visitor.updateMany({
    where: { websiteId, lastSession: { is: { createdAt: { lt: eventCutoff } } } },
    data: { lastSessionId: null },
  });

  const sessions = await tx.session.deleteMany({
    where: { websiteId, createdAt: { lt: eventCutoff } },
  });

  return {
    events: events.count,
    eventData: eventData.count,
    sessionData: sessionData.count,
    replays: replays.count,
    savedReplays: savedReplays.count,
    sessions: sessions.count,
    revenue: revenue.count,
    detachedEventLinks: detachDetectionEvents.count + detachAttributionEvents.count,
  };
}

async function countWebsitePayloads({
  client,
  websiteId,
  eventCutoff,
  replayCutoff,
}: {
  client: any;
  websiteId: string;
  eventCutoff: Date;
  replayCutoff: Date | null;
}) {
  const replayWhere = {
    websiteId,
    ...(replayCutoff ? { createdAt: { lt: replayCutoff } } : {}),
  };

  const [events, eventData, sessionData, replays, savedReplays, sessions, revenue] =
    await Promise.all([
      client.websiteEvent.count({ where: { websiteId, createdAt: { lt: eventCutoff } } }),
      client.eventData.count({ where: { websiteId, createdAt: { lt: eventCutoff } } }),
      client.sessionData.count({ where: { websiteId, createdAt: { lt: eventCutoff } } }),
      client.sessionReplay.count({ where: replayWhere }),
      client.sessionReplaySaved.count({ where: replayWhere }),
      client.session.count({ where: { websiteId, createdAt: { lt: eventCutoff } } }),
      client.revenue.count({
        where: { websiteId, session: { is: { createdAt: { lt: eventCutoff } } } },
      }),
    ]);

  return { events, eventData, sessionData, replays, savedReplays, sessions, revenue };
}

export async function runAnalyticsRetentionJob({
  client = prisma.client,
  transaction = prisma.transaction as unknown as AnalyticsRetentionOptions['transaction'],
  now = new Date(),
  dryRun = process.env.ANALYTICS_RETENTION_DRY_RUN === 'true',
  websiteIds,
}: AnalyticsRetentionOptions = {}) {
  const websites: AnalyticsRetentionWebsite[] = await client.website.findMany({
    where: {
      ...(websiteIds?.length ? { id: { in: websiteIds } } : {}),
    },
    select: {
      id: true,
      deletedAt: true,
      workspace: {
        select: {
          planId: true,
          deletedAt: true,
          platformSubscription: {
            select: { planId: true },
          },
        },
      },
    },
  });

  const results: WebsiteRetentionResult[] = [];

  for (const website of websites) {
    // A deleted website or workspace is a closed tenant. Its analytics payload
    // is purged immediately instead of waiting for a plan window, while durable
    // payment/billing/audit rows are kept and detached.
    const closed = Boolean(website.deletedAt || website.workspace?.deletedAt);
    const plan = closed ? getPlan('starter') : getPlanForWebsite(website);
    const eventCutoff = closed ? now : daysBefore(now, plan.retentionDays);
    const replayCutoff = closed
      ? null
      : plan.replayRetentionDays > 0
        ? daysBefore(now, plan.replayRetentionDays)
        : null;

    if (dryRun) {
      const counts = await countWebsitePayloads({
        client,
        websiteId: website.id,
        eventCutoff,
        replayCutoff,
      });

      results.push({
        websiteId: website.id,
        closed,
        planId: plan.id,
        retentionDays: plan.retentionDays,
        replayRetentionDays: plan.replayRetentionDays,
        ...counts,
        dryRun: true,
      });
      continue;
    }

    const counts = await transaction(async tx =>
      purgeWebsitePayloads({
        tx,
        websiteId: website.id,
        eventCutoff,
        replayCutoff,
      }),
    );

    results.push({
      websiteId: website.id,
      closed,
      planId: plan.id,
      retentionDays: plan.retentionDays,
      replayRetentionDays: plan.replayRetentionDays,
      events: counts.events,
      eventData: counts.eventData,
      sessionData: counts.sessionData,
      replays: counts.replays,
      savedReplays: counts.savedReplays,
      sessions: counts.sessions,
      revenue: counts.revenue,
      dryRun: false,
    });
  }

  return {
    dryRun,
    websites: results.length,
    events: results.reduce((sum, result) => sum + result.events, 0),
    eventData: results.reduce((sum, result) => sum + result.eventData, 0),
    sessionData: results.reduce((sum, result) => sum + result.sessionData, 0),
    replays: results.reduce((sum, result) => sum + result.replays, 0),
    savedReplays: results.reduce((sum, result) => sum + result.savedReplays, 0),
    sessions: results.reduce((sum, result) => sum + result.sessions, 0),
    revenue: results.reduce((sum, result) => sum + result.revenue, 0),
    results,
  };
}
