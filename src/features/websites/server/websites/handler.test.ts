import { beforeEach, expect, test, vi } from 'vitest';
import { getWorkspaceEntitlements, getWebsiteLimit } from '@/lib/entitlements';
import { parseRequest } from '@/lib/request';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { canCreateWebsite } from '@/permissions';
import { createWebsite, findWorkspaceWebsiteByDomain } from '@/queries/prisma';
import { countWorkspaceWebsites } from '@/queries/prisma/website';
import { POST } from './handler';

vi.mock('@/lib/request', () => ({
  getQueryFilters: vi.fn(),
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canCreateWebsite: vi.fn(),
}));

vi.mock('@/lib/workspace-auth', () => ({
  requireWorkspaceAccess: vi.fn(),
}));

vi.mock('@/lib/entitlements', () => ({
  getWorkspaceEntitlements: vi.fn(),
  getWebsiteLimit: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createWebsite: vi.fn(),
  findWorkspaceWebsiteByDomain: vi.fn(),
}));

vi.mock('@/queries/prisma/website', () => ({
  countWorkspaceWebsites: vi.fn(),
  getDefaultWorkspaceForUser: vi.fn(),
  getUserWebsites: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1', role: 'admin', isAdmin: true } },
    body: { workspaceId: '11111111-1111-4111-8111-111111111111', domain: 'example.com' },
  } as any);
  vi.mocked(canCreateWebsite).mockResolvedValue(true);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({ role: 'OWNER' } as any);
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    plan: { name: 'Pro' },
  } as any);
  vi.mocked(getWebsiteLimit).mockReturnValue(20);
  vi.mocked(countWorkspaceWebsites).mockResolvedValue(1);
  vi.mocked(findWorkspaceWebsiteByDomain).mockResolvedValue(null);
});

test('creates a website when the domain is free in the workspace', async () => {
  vi.mocked(createWebsite).mockResolvedValue({
    id: 'website-1',
    name: 'example.com',
    domain: 'example.com',
  } as any);

  const response = await POST(new Request('https://tartly.test/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.id).toBe('website-1');
  expect(findWorkspaceWebsiteByDomain).toHaveBeenCalledWith(
    '11111111-1111-4111-8111-111111111111',
    'example.com',
  );
});

test('rejects a duplicate domain in the same workspace before writing', async () => {
  vi.mocked(findWorkspaceWebsiteByDomain).mockResolvedValue({
    id: 'website-existing',
    name: 'example.com',
    domain: 'example.com',
  });

  const response = await POST(new Request('https://tartly.test/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(409);
  expect(body.error.code).toBe('website-exists');
  expect(createWebsite).not.toHaveBeenCalled();
});
