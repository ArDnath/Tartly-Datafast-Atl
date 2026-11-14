import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canUpdateWebsite, canViewWebsite, getWebsiteAccess } from '@/permissions';
import { findWorkspaceWebsiteByDomain, getWebsite, updateWebsite } from '@/queries/prisma';
import { GET, POST } from './handler';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canDeleteWebsite: vi.fn(),
  canUpdateWebsite: vi.fn(),
  canViewWebsite: vi.fn(),
  getWebsiteAccess: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  deleteWebsite: vi.fn(),
  findWorkspaceWebsiteByDomain: vi.fn(),
  getWebsite: vi.fn(),
  recordAuditEvent: vi.fn(),
  updateWebsite: vi.fn(),
}));

const website = {
  id: 'website-1',
  name: 'Example',
  domain: 'example.com',
  userId: 'user-1',
  teamId: 'team-1',
  createdBy: 'user-1',
  replayEnabled: true,
  replayConfig: { maskAllInputs: true },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(canViewWebsite).mockResolvedValue(true);
  vi.mocked(getWebsite).mockResolvedValue(website as any);
});

test('returns only public website fields to a share token', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: {
      shareToken: {
        purpose: 'share',
        shareId: 'share-1',
        shareSlug: 'public-share',
        shareType: 1,
        websiteId: website.id,
      },
    },
  } as any);

  const response = await GET(
    new Request(`https://analytics.example.com/api/websites/${website.id}`),
    {
      params: Promise.resolve({ websiteId: website.id }),
    },
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual({
    id: website.id,
    name: website.name,
    domain: website.domain,
    access: {
      role: null,
      canView: true,
      canUpdate: false,
      canDelete: false,
      canManageMembers: false,
    },
  });
  expect(getWebsiteAccess).not.toHaveBeenCalled();
});

test('keeps the full website response for authenticated users', async () => {
  const access = {
    role: 'owner',
    canView: true,
    canUpdate: true,
    canDelete: true,
    canManageMembers: true,
  };

  vi.mocked(parseRequest).mockResolvedValue({
    auth: {
      user: {
        id: 'user-1',
        role: 'admin',
        isAdmin: true,
      },
    },
  } as any);
  vi.mocked(getWebsiteAccess).mockResolvedValue(access as any);

  const response = await GET(
    new Request(`https://analytics.example.com/api/websites/${website.id}`),
    {
      params: Promise.resolve({ websiteId: website.id }),
    },
  );

  expect(await response.json()).toEqual({
    ...website,
    createdAt: website.createdAt.toISOString(),
    updatedAt: website.updatedAt.toISOString(),
    access,
  });
});

test('rejects renaming a website to a domain already used in the workspace', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1', role: 'admin', isAdmin: true } },
    body: { domain: 'other.example.com' },
  } as any);
  vi.mocked(canUpdateWebsite).mockResolvedValue(true);
  vi.mocked(getWebsite).mockResolvedValue({ ...website, workspaceId: 'workspace-1' } as any);
  vi.mocked(findWorkspaceWebsiteByDomain).mockResolvedValue({
    id: 'website-2',
    name: 'Other',
    domain: 'other.example.com',
  } as any);

  const response = await POST(
    new Request(`https://analytics.example.com/api/websites/${website.id}`, { method: 'POST' }),
    { params: Promise.resolve({ websiteId: website.id }) },
  );
  const body = await response.json();

  expect(response.status).toBe(409);
  expect(body.error.code).toBe('website-exists');
  expect(updateWebsite).not.toHaveBeenCalled();
});
