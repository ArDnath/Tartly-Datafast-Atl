import { beforeEach, describe, expect, test, vi } from 'vitest';

const { parseRequest, prisma, revokeAllAuthSessions, recordAuditEvent } = vi.hoisted(() => ({
  parseRequest: vi.fn(),
  prisma: {
    client: {
      user: { findUnique: vi.fn(), update: vi.fn() },
      workspace: { findUnique: vi.fn(), update: vi.fn() },
    },
  },
  revokeAllAuthSessions: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock('@/lib/request', () => ({ parseRequest }));
vi.mock('@/lib/prisma', () => ({ default: prisma }));
vi.mock('@/lib/auth-session', () => ({ revokeAllAuthSessions }));
vi.mock('@/queries/prisma', () => ({ recordAuditEvent }));

import { createSuspensionHandler } from './suspension';

const workspaceHandler = createSuspensionHandler('workspace');
const userHandler = createSuspensionHandler('user');

function request(body: unknown = {}) {
  return new Request('https://app.test/api/admin/suspension', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function params(id: string, key = 'workspaceId') {
  return { params: Promise.resolve({ [key]: id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  parseRequest.mockResolvedValue({
    auth: { user: { id: 'operator-1', isPlatformAdmin: true } },
    body: { suspended: true, reason: 'abuse' },
  });
  prisma.client.workspace.findUnique.mockResolvedValue({
    id: 'ws-1',
    suspendedAt: null,
    suspensionReason: null,
  });
  prisma.client.workspace.update.mockResolvedValue({ id: 'ws-1' });
});

describe('platform-admin suspension', () => {
  test('rejects a non-platform admin before reading the target', async () => {
    parseRequest.mockResolvedValue({
      auth: { user: { id: 'owner-1', isPlatformAdmin: false } },
      body: { suspended: true },
    });

    const response = await workspaceHandler.POST(request(), params('ws-1'));

    expect(response.status).toBe(403);
    expect(prisma.client.workspace.findUnique).not.toHaveBeenCalled();
  });

  test('returns 404 for an unknown workspace', async () => {
    prisma.client.workspace.findUnique.mockResolvedValue(null);

    const response = await workspaceHandler.POST(request(), params('missing'));

    expect(response.status).toBe(404);
  });

  test('sets a suspension timestamp and records an audit event', async () => {
    const response = await workspaceHandler.POST(request(), params('ws-1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.suspendedAt).toBeTruthy();
    expect(prisma.client.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ws-1' },
        data: expect.objectContaining({ suspensionReason: 'abuse' }),
      }),
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'workspace.suspended', resourceId: 'ws-1' }),
    );
  });

  test('clears the suspension and reason', async () => {
    parseRequest.mockResolvedValue({
      auth: { user: { id: 'operator-1', isPlatformAdmin: true } },
      body: { suspended: false },
    });

    const response = await workspaceHandler.POST(request(), params('ws-1'));
    const payload = await response.json();

    expect(payload.suspendedAt).toBeNull();
    expect(prisma.client.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { suspendedAt: null, suspensionReason: null },
      }),
    );
  });

  test('suspending a user revokes their sessions', async () => {
    prisma.client.user.findUnique.mockResolvedValue({
      id: 'user-1',
      suspendedAt: null,
      suspensionReason: null,
    });
    prisma.client.user.update.mockResolvedValue({ id: 'user-1' });

    const response = await userHandler.POST(request(), params('user-1', 'userId'));

    expect(response.status).toBe(200);
    expect(revokeAllAuthSessions).toHaveBeenCalledWith('user-1');
  });
});
