import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/queries/prisma';
import { POST } from './handler';

const markOnboardingComplete = vi.hoisted(() => vi.fn());

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/workspace-auth', () => ({ requireWorkspaceAccess: vi.fn() }));
vi.mock('@/queries/prisma', () => ({ recordAuditEvent: vi.fn() }));
vi.mock('../queries/onboarding', () => ({ markOnboardingComplete }));

const workspace = {
  id: 'workspace-1',
  name: 'Acme',
  slug: 'acme',
  logoUrl: null,
  ownerId: 'user-1',
  planId: 'starter',
  subscriptionStatus: 'incomplete',
};

function request() {
  return new Request('https://app.example.com/api/onboarding/complete', { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { workspaceId: '00000000-0000-4000-8000-000000000001' },
    query: {},
  } as any);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({
    workspaceId: workspace.id,
    role: 'OWNER',
    workspace,
  } as any);
  markOnboardingComplete.mockResolvedValue({
    id: workspace.id,
    onboardingCompletedAt: new Date('2026-11-09T10:00:00Z'),
  });
});

test('marks the owner workspace complete and records it', async () => {
  const response = await POST(request());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(markOnboardingComplete).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
  expect(recordAuditEvent).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: 'workspace.onboarding_completed' }),
  );
  expect(body.onboardingCompletedAt).toBeTruthy();
});

test('rejects a workspace the user does not own', async () => {
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

  const response = await POST(request());

  expect(response.status).toBe(404);
  expect(markOnboardingComplete).not.toHaveBeenCalled();
});

test('requires a signed-in user', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: {}, body: {}, query: {} } as any);

  const response = await POST(request());

  expect(response.status).toBe(401);
});
