import { billingSubscriptionHasAccess } from '@/lib/billing-lifecycle';
import { getPublicOrigin } from '@/lib/get-base-url';
import { sendUsageNoticeEmail, type UsageNoticeEmail } from '@/lib/email';
import { getPlan, getPlanOrNull } from '@/lib/plans';
import prisma from '@/lib/prisma';
import { EVENT_GRACE, getUsagePeriodRange, getUsageStatus } from '@/lib/usage';

/**
 * Transactional usage notices.
 *
 * - One 80% warning and one 100% notice per workspace per period. The
 *   timestamps already live on `usage_period`, so a retry cannot spam the
 *   owner and the job stays idempotent.
 * - Only the workspace owner receives the email. Suspended and deleted
 *   workspaces/users are skipped.
 * - Sending is best effort. A provider failure leaves the timestamp unset so
 *   the next daily run can retry.
 * - The job never deletes data. The limit notice explains the grace window and
 *   the pause behaviour that the collector already enforces.
 */

export interface UsageNoticeJobOptions {
  client?: any;
  now?: Date;
  send?: (message: UsageNoticeEmail) => Promise<void>;
  origin?: string;
}

interface NoticeResult {
  workspaceId: string;
  level: 'warning' | 'limit';
  sent: boolean;
  error?: string;
}

function billingUrl(origin: string) {
  return `${origin.replace(/\/$/, '')}/app/settings/billing`;
}

export async function runUsageNoticeJob({
  client = prisma.client,
  now = new Date(),
  send = sendUsageNoticeEmail,
  origin = getPublicOrigin({ headers: new Headers(), url: 'http://localhost:3000' }),
}: UsageNoticeJobOptions = {}) {
  const { periodStart } = getUsagePeriodRange(now);

  const periods = await client.usagePeriod.findMany({
    where: { periodStart, workspace: { deletedAt: null, suspendedAt: null } },
    select: {
      workspaceId: true,
      eventsCount: true,
      warningNotifiedAt: true,
      limitNotifiedAt: true,
      workspace: {
        select: {
          name: true,
          planId: true,
          subscriptionStatus: true,
          platformSubscription: {
            select: {
              planId: true,
              lifecycleStatus: true,
              cancelAtPeriodEnd: true,
              currentPeriodEnd: true,
            },
          },
          owner: {
            select: { username: true, deletedAt: true, suspendedAt: true },
          },
        },
      },
    },
  });

  const results: NoticeResult[] = [];

  for (const period of periods) {
    const workspace = period.workspace;

    if (!workspace?.owner?.username || workspace.owner.deletedAt || workspace.owner.suspendedAt) {
      continue;
    }

    const subscription = workspace.platformSubscription;
    const active = subscription
      ? billingSubscriptionHasAccess(
          {
            lifecycleStatus: subscription.lifecycleStatus,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
          now,
        )
      : workspace.subscriptionStatus === 'active' || workspace.subscriptionStatus === 'trialing';

    // Setup-only workspaces have no paid plan. They get an in-app setup
    // allowance message, not a plan-limit email that would be misleading.
    if (!active) {
      continue;
    }

    const planId = subscription?.planId ?? workspace.planId;
    const plan = getPlanOrNull(planId) || getPlan('starter');
    const status = getUsageStatus(period.eventsCount, plan.eventsPerMonth, EVENT_GRACE);

    let level: 'warning' | 'limit' | null = null;

    if ((status === 'grace' || status === 'limit') && !period.limitNotifiedAt) {
      level = 'limit';
    } else if (status === 'warning' && !period.warningNotifiedAt) {
      level = 'warning';
    }
    if (!level) {
      continue;
    }

    const percentage = plan.eventsPerMonth
      ? Math.min(100, Math.round((period.eventsCount / plan.eventsPerMonth) * 100))
      : 100;

    try {
      await send({
        to: workspace.owner.username,
        workspaceName: workspace.name,
        planName: plan.name,
        used: period.eventsCount,
        limit: plan.eventsPerMonth,
        percentage,
        resetAt: getUsagePeriodRange(now).periodEnd,
        billingUrl: billingUrl(origin),
        level,
      });

      await client.usagePeriod.updateMany({
        where: {
          workspaceId: period.workspaceId,
          periodStart,
          ...(level === 'warning' ? { warningNotifiedAt: null } : { limitNotifiedAt: null }),
        },
        data: level === 'warning' ? { warningNotifiedAt: now } : { limitNotifiedAt: now },
      });

      results.push({ workspaceId: period.workspaceId, level, sent: true });
    } catch (error) {
      results.push({
        workspaceId: period.workspaceId,
        level,
        sent: false,
        error: error instanceof Error ? error.message.slice(0, 200) : 'Unknown error',
      });
    }
  }

  return {
    periodStart,
    scanned: periods.length,
    sent: results.filter(result => result.sent).length,
    failed: results.filter(result => !result.sent).length,
    results,
  };
}
