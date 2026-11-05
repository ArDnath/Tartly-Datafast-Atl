import { parseRequest } from '@/lib/request';
import { json, notFound } from '@/lib/response';
import { getWorkspaceUsage } from '@/lib/usage';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';

/**
 * Usage is visible to every member (VIEWER and above) because the dashboard
 * should explain why ingestion paused. Only the owner can manage billing.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { workspaceId } = await params;
  const access = await requireWorkspaceAccess(auth.user, workspaceId, 'VIEWER');

  if (!access) {
    return notFound({ message: 'Workspace not found.' });
  }

  const usage = await getWorkspaceUsage(workspaceId);

  if (!usage) {
    return notFound({ message: 'Workspace not found.' });
  }

  return json({
    workspaceId: usage.workspaceId,
    role: access.role,
    planId: usage.planId,
    plan: {
      id: usage.plan.id,
      name: usage.plan.name,
      monthlyPriceCents: usage.plan.monthlyPriceCents,
      annualPriceCents: usage.plan.annualPriceCents,
      currency: usage.plan.currency,
      websiteLimit: usage.plan.websiteLimit,
      memberLimit: usage.plan.memberLimit,
      eventsPerMonth: usage.plan.eventsPerMonth,
      retentionDays: usage.plan.retentionDays,
      replaySessionsPerMonth: usage.plan.replaySessionsPerMonth,
      features: usage.plan.features,
    },
    subscriptionStatus: usage.subscriptionStatus,
    periodStart: usage.periodStart.toISOString(),
    periodEnd: usage.periodEnd.toISOString(),
    resetAt: usage.resetAt.toISOString(),
    events: usage.events,
    replays: usage.replays,
    websites: usage.websites,
    members: usage.members,
  });
}
