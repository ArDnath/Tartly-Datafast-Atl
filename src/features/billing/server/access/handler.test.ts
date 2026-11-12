import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { getWorkspaceBillingAccess } from '@/features/billing/server/access/service';
import { GET } from './handler';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/workspace-auth', () => ({ requireWorkspaceAccess: vi.fn() }));
vi.mock('@/features/billing/server/access/service', () => ({
  getWorkspaceBillingAccess: vi.fn(),
}));

const state = {
  workspaceId: 'workspace-1',
  planId: 'starter',
  subscriptionStatus: 'incomplete',
  configured: true,
  paid: false,
  requiresPayment: true,
  subscription: null,
  availableProducts: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: { workspaceId: 'workspace-1' },
  } as any);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({ role: 'VIEWER' } as any);
  vi.mocked(getWorkspaceBillingAccess).mockResolvedValue(state);
});

test('returns the access state with the caller role', async () => {
  const response = await GET(
    new Request('https://app.example.com/api/billing/access?workspaceId=workspace-1'),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ ...state, role: 'VIEWER' });
  expect(requireWorkspaceAccess).toHaveBeenCalledWith({ id: 'user-1' }, 'workspace-1', 'VIEWER');
});

test('does not leak a workspace the caller cannot access', async () => {
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

  const response = await GET(
    new Request('https://app.example.com/api/billing/access?workspaceId=workspace-1'),
  );

  expect(response.status).toBe(404);
  expect(getWorkspaceBillingAccess).not.toHaveBeenCalled();
});
