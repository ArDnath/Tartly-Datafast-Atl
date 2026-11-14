import prisma from '@/lib/prisma';

/**
 * Operational-data retention.
 *
 * Webhook payloads and audit IPs are useful for a short investigation window,
 * but they are not analytics data and must not be kept forever. Raw provider
 * payloads contain customer and payment details. The job redacts the payload
 * first, then removes the operational row after the longer retention window.
 *
 * Retention windows are deliberately simple and documented:
 * - raw webhook payload + audit IP: 90 days
 * - billing/provider/audit row: 365 days
 *
 * The unique provider event key is kept for the row lifetime. A replay older
 * than a year is not a supported recovery path; providers do not reuse IDs.
 */
export const WEBHOOK_PAYLOAD_RETENTION_DAYS = 90;
export const OPERATIONAL_ROW_RETENTION_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

export interface OperationalRetentionOptions {
  client?: typeof prisma.client;
  now?: Date;
}

export interface OperationalRetentionSummary {
  providerPayloadsRedacted: number;
  billingPayloadsRedacted: number;
  auditIpsRedacted: number;
  providerEventsDeleted: number;
  billingEventsDeleted: number;
  auditEventsDeleted: number;
}

export async function runOperationalDataRetentionJob({
  client = prisma.client,
  now = new Date(),
}: OperationalRetentionOptions = {}): Promise<OperationalRetentionSummary> {
  const payloadCutoff = daysBefore(now, WEBHOOK_PAYLOAD_RETENTION_DAYS);
  const rowCutoff = daysBefore(now, OPERATIONAL_ROW_RETENTION_DAYS);

  const providerPayloads = await client.providerEvent.updateMany({
    where: { receivedAt: { lt: payloadCutoff } },
    data: { rawPayload: null, rawPayloadRef: null },
  });

  const billingPayloads = await client.billingEvent.updateMany({
    where: { receivedAt: { lt: payloadCutoff } },
    data: { payload: {} },
  });

  const auditIps = await client.auditEvent.updateMany({
    where: { createdAt: { lt: payloadCutoff }, ipAddress: { not: null } },
    data: { ipAddress: null },
  });

  const providerEvents = await client.providerEvent.deleteMany({
    where: { receivedAt: { lt: rowCutoff } },
  });

  const billingEvents = await client.billingEvent.deleteMany({
    where: { receivedAt: { lt: rowCutoff } },
  });

  const auditEvents = await client.auditEvent.deleteMany({
    where: { createdAt: { lt: rowCutoff } },
  });

  return {
    providerPayloadsRedacted: providerPayloads.count,
    billingPayloadsRedacted: billingPayloads.count,
    auditIpsRedacted: auditIps.count,
    providerEventsDeleted: providerEvents.count,
    billingEventsDeleted: billingEvents.count,
    auditEventsDeleted: auditEvents.count,
  };
}
