import type { Report } from '@/generated/prisma/client';
import type { Auth } from '@/lib/types';
import { canDeleteWebsite, canUpdateWebsite, canViewWebsite } from './website';

/**
 * Reports are tenant data. Access is derived from the website they belong to,
 * never from the user who happened to create them.
 */
export async function canViewReport(auth: Auth, report: Report) {
  return canViewWebsite(auth, report.websiteId);
}

export async function canUpdateReport(auth: Auth, report: Report) {
  return canUpdateWebsite(auth, report.websiteId);
}

export async function canDeleteReport(auth: Auth, report: Report) {
  return canDeleteWebsite(auth, report.websiteId);
}
