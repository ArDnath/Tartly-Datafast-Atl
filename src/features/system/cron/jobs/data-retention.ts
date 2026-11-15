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
 * - billing/provider row: 365 days
 *
 * Stripe invoice events keep their raw payload until the row is deleted: the
 * refund path reads customer, amount, and paid-at from that payload and a
 * refund can arrive long after the invoice. The audit row itself is retained
 * (the IP is the personal field); deleting the security trail is a separate
 * policy decision.
 *
 * The unique provider event key is kept for the row lifetime. A replay older
 * than a year is not a supported recovery path; providers do not reuse IDs.
 */
export const WEBHOOK_PAYLOAD_RETENTION_DAYS = 90;
export const OPERATIONAL_ROW_RETENTION_DAYS = 365;

/** Event types whose payload is still read by the refund reconciler. */
export const REFUND_CONTEXT_EVENT_TYPES = ['invoice.paid', 'invoice.payment_succeeded'];

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
}

export async function runOperationalDataRetentionJob({
  client = prisma.client,
  now = new Date(),
}: OperationalRetentionOptions = {}): Promise<OperationalRetentionSummary> {
  const payloadCutoff = daysBefore(now, WEBHOOK_PAYLOAD_RETENTION_DAYS);
  const rowCutoff = daysBefore(now, OPERATIONAL_ROW_RETENTION_DAYS);

  const providerPayloads = await client.providerEvent.updateMany({
    where: {
      receivedAt: { lt: payloadCutoff },
      eventType: { notIn: REFUND_CONTEXT_EVENT_TYPES },
    },
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

  return {
    providerPayloadsRedacted: providerPayloads.count,
    billingPayloadsRedacted: billingPayloads.count,
    auditIpsRedacted: auditIps.count,
    providerEventsDeleted: providerEvents.count,
    billingEventsDeleted: billingEvents.count,
  };
}
