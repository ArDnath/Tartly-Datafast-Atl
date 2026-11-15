import { expect, test, vi } from 'vitest';
import {
  OPERATIONAL_ROW_RETENTION_DAYS,
  REFUND_CONTEXT_EVENT_TYPES,
  runOperationalDataRetentionJob,
  WEBHOOK_PAYLOAD_RETENTION_DAYS,
} from './data-retention';

vi.mock('@/lib/prisma', () => ({ default: { client: {} } }));

function clientFor() {
  return {
    providerEvent: {
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    billingEvent: {
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditEvent: {
      updateMany: vi.fn().mockResolvedValue({ count: 4 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

test('redacts payloads and IPs, then deletes rows past the longer window', async () => {
  const client = clientFor();
  const now = new Date('2026-11-15T00:00:00.000Z');

  const result = await runOperationalDataRetentionJob({ client: client as any, now });

  const payloadCutoff = new Date(
    now.getTime() - WEBHOOK_PAYLOAD_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const rowCutoff = new Date(now.getTime() - OPERATIONAL_ROW_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  expect(client.providerEvent.updateMany).toHaveBeenCalledWith({
    where: {
      receivedAt: { lt: payloadCutoff },
      eventType: { notIn: REFUND_CONTEXT_EVENT_TYPES },
    },
    data: { rawPayload: null, rawPayloadRef: null },
  });
  expect(client.billingEvent.updateMany).toHaveBeenCalledWith({
    where: { receivedAt: { lt: payloadCutoff } },
    data: { payload: {} },
  });
  expect(client.auditEvent.updateMany).toHaveBeenCalledWith({
    where: { createdAt: { lt: payloadCutoff }, ipAddress: { not: null } },
    data: { ipAddress: null },
  });
  expect(client.providerEvent.deleteMany).toHaveBeenCalledWith({
    where: { receivedAt: { lt: rowCutoff } },
  });
  expect(client.billingEvent.deleteMany).toHaveBeenCalledWith({
    where: { receivedAt: { lt: rowCutoff } },
  });
  expect(client.auditEvent.deleteMany).not.toHaveBeenCalled();

  expect(result).toEqual({
    providerPayloadsRedacted: 2,
    billingPayloadsRedacted: 3,
    auditIpsRedacted: 4,
    providerEventsDeleted: 1,
    billingEventsDeleted: 1,
  });
});
