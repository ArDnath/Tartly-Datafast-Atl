import { beforeEach, expect, test, vi } from 'vitest';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import prisma from '@/lib/prisma';
import { authenticateApiKey } from '@/features/websites/lib/api-key';
import { authenticateDeveloperRequest } from './context';

vi.mock('@/features/websites/lib/api-key', () => ({
  authenticateApiKey: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      website: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/entitlements', () => ({
  entitlementsHaveFeature: (entitlements: any, feature: string) =>
    Boolean(entitlements?.active && entitlements.plan?.features?.includes(feature)),
  getWorkspaceEntitlements: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authenticateApiKey).mockResolvedValue({
    id: 'key-1',
    websiteId: 'website-1',
  } as any);
  (prisma.client.website.findFirst as any).mockResolvedValue({
    id: 'website-1',
    name: 'Site',
    domain: 'example.com',
    workspaceId: 'workspace-1',
  });
});

test('allows the developer API on a Pro workspace', async () => {
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    active: true,
    plan: { features: ['api_access'] },
  } as any);

  const resolved = await authenticateDeveloperRequest(
    new Request('https://analytics.example.com/api/developer/events'),
  );

  expect(resolved).toHaveProperty('context');
});

test('refuses the developer API on a Starter workspace without blocking manual payment keys', async () => {
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    active: true,
    plan: { features: ['revenue_attribution'] },
  } as any);

  const resolved = await authenticateDeveloperRequest(
    new Request('https://analytics.example.com/api/developer/events'),
  );

  expect(resolved).toHaveProperty('response');
  if ('response' in resolved) {
    expect(resolved.response.status).toBe(403);
  }
});
