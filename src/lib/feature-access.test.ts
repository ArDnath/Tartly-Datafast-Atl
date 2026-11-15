import { beforeEach, expect, test, vi } from 'vitest';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { getWebsiteWorkspaceAccess } from '@/permissions';
import { canUseWebsiteFeature, getWebsiteEntitlements } from './feature-access';

vi.mock('@/permissions', () => ({
  getWebsiteWorkspaceAccess: vi.fn(),
}));

vi.mock('@/lib/entitlements', () => ({
  entitlementsHaveFeature: (entitlements: any, feature: string) =>
    Boolean(entitlements?.active && entitlements.plan?.features?.includes(feature)),
  getWorkspaceEntitlements: vi.fn(),
}));

const auth = { user: { id: 'user-1' } } as any;
const websiteId = '5ca9c481-3222-48b6-8bfa-b13e9d8e9209';

beforeEach(() => {
  vi.clearAllMocks();
});

test('refuses a share token for paid-feature checks', async () => {
  const result = await getWebsiteEntitlements({ ...auth, shareToken: {} } as any, websiteId);

  expect(result).toBeNull();
  expect(getWebsiteWorkspaceAccess).not.toHaveBeenCalled();
});

test('refuses a website outside the signed-in workspace', async () => {
  vi.mocked(getWebsiteWorkspaceAccess).mockResolvedValue(null);

  await expect(canUseWebsiteFeature(auth, websiteId, 'journeys')).resolves.toBe(false);
  expect(getWorkspaceEntitlements).not.toHaveBeenCalled();
});

test('gates a Pro feature for a Starter workspace', async () => {
  vi.mocked(getWebsiteWorkspaceAccess).mockResolvedValue({
    websiteId,
    workspaceId: 'workspace-1',
    role: 'OWNER',
  } as any);
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    active: true,
    plan: { features: ['revenue_attribution', 'funnels', 'csv_export'] },
  } as any);

  await expect(canUseWebsiteFeature(auth, websiteId, 'journeys')).resolves.toBe(false);
  await expect(canUseWebsiteFeature(auth, websiteId, 'csv_export')).resolves.toBe(true);
});

test('allows a Pro feature for an active Pro workspace', async () => {
  vi.mocked(getWebsiteWorkspaceAccess).mockResolvedValue({
    websiteId,
    workspaceId: 'workspace-1',
    role: 'OWNER',
  } as any);
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    active: true,
    plan: { features: ['journeys', 'api_access', 'client_reporting'] },
  } as any);

  await expect(canUseWebsiteFeature(auth, websiteId, 'journeys')).resolves.toBe(true);
  await expect(canUseWebsiteFeature(auth, websiteId, 'api_access')).resolves.toBe(true);
});
