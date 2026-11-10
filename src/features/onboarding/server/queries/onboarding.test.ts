import { beforeEach, expect, test, vi } from 'vitest';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { createWorkspaceForUser } from '@/lib/workspace-auth';
import { countWorkspaceWebsites, createWebsite } from '@/queries/prisma';
import {
  createOnboardingWebsite,
  ensureOnboardingWorkspace,
  getOnboardingWorkspaceSlug,
  getWorkspaceNameFromDomain,
  markOnboardingComplete,
  OnboardingError,
} from './onboarding';

const prisma = vi.hoisted(() => ({
  client: {
    workspace: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    website: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prisma }));
vi.mock('@/lib/crypto', () => ({ uuid: () => '00000000-0000-4000-8000-000000000001' }));
vi.mock('@/lib/workspace-auth', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/workspace-auth')>();

  return { ...actual, createWorkspaceForUser: vi.fn() };
});
vi.mock('@/lib/entitlements', () => ({
  getWorkspaceEntitlements: vi.fn(),
  getWebsiteLimit: (entitlements: { plan?: { websiteLimit?: number } } | null) =>
    entitlements?.plan?.websiteLimit ?? 0,
}));
vi.mock('@/queries/prisma', () => ({
  countWorkspaceWebsites: vi.fn(),
  createWebsite: vi.fn(),
}));

const workspace = {
  id: 'workspace-1',
  name: 'Acme',
  slug: 'acme-user1',
  logoUrl: null,
  ownerId: 'user-1',
  planId: 'starter',
  subscriptionStatus: 'incomplete',
  onboardingCompletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.client.workspace.findFirst as any).mockResolvedValue(null);
  (prisma.client.website.findFirst as any).mockResolvedValue(null);
  (prisma.client.workspace.update as any).mockResolvedValue({
    id: 'workspace-1',
    onboardingCompletedAt: new Date('2026-11-09T10:00:00Z'),
  });
  vi.mocked(createWorkspaceForUser).mockResolvedValue(workspace as any);
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({
    workspaceId: workspace.id,
    plan: { name: 'Starter', websiteLimit: 1 },
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    active: false,
    trial: true,
    trialEndsAt: new Date(),
    setup: true,
  } as any);
  vi.mocked(countWorkspaceWebsites).mockResolvedValue(0);
  vi.mocked(createWebsite).mockResolvedValue({
    id: 'website-1',
    name: 'acme.com',
    domain: 'acme.com',
    workspaceId: 'workspace-1',
  } as any);
});

test('derives a quiet workspace name and deterministic slug', () => {
  expect(getWorkspaceNameFromDomain('acme.com')).toBe('Acme');
  expect(getWorkspaceNameFromDomain('www.my-site.dev')).toBe('My-site');
  expect(getOnboardingWorkspaceSlug('Acme', '00000000-0000-4000-8000-000000000001')).toBe(
    'acme-0000000000',
  );
});

test('creates a workspace when the customer owns none', async () => {
  const result = await ensureOnboardingWorkspace(
    '00000000-0000-4000-8000-000000000001',
    'acme.com',
  );

  expect(result.created).toBe(true);
  expect(createWorkspaceForUser).toHaveBeenCalledWith({
    userId: '00000000-0000-4000-8000-000000000001',
    name: 'Acme',
    slug: 'acme-0000000000',
  });
});

test('reuses an incomplete workspace on a resumed flow', async () => {
  (prisma.client.workspace.findFirst as any).mockResolvedValue(workspace);

  const result = await ensureOnboardingWorkspace('user-1', 'acme.com');

  expect(result.created).toBe(false);
  expect(createWorkspaceForUser).not.toHaveBeenCalled();
});

test('does not create a second workspace after onboarding completed', async () => {
  (prisma.client.workspace.findFirst as any).mockResolvedValue({
    ...workspace,
    onboardingCompletedAt: new Date('2026-11-09T10:00:00Z'),
  });

  await expect(ensureOnboardingWorkspace('user-1', 'acme.com')).rejects.toMatchObject({
    code: 'already-onboarded',
    status: 409,
  });
});

test('recovers from a double submit that races the unique slug', async () => {
  (prisma.client.workspace.findFirst as any)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(workspace);
  vi.mocked(createWorkspaceForUser).mockRejectedValue(
    Object.assign(new Error('unique'), { code: 'P2002' }),
  );

  const result = await ensureOnboardingWorkspace('user-1', 'acme.com');

  expect(result.created).toBe(false);
  expect(result.workspace.id).toBe('workspace-1');
});

test('returns an existing website for the same domain instead of duplicating it', async () => {
  (prisma.client.website.findFirst as any).mockResolvedValue({
    id: 'website-existing',
    name: 'acme.com',
    domain: 'acme.com',
    workspaceId: 'workspace-1',
  });

  const website = await createOnboardingWebsite('workspace-1', 'user-1', 'acme.com');

  expect(website.id).toBe('website-existing');
  expect(createWebsite).not.toHaveBeenCalled();
});

test('enforces the plan website limit before creating', async () => {
  vi.mocked(countWorkspaceWebsites).mockResolvedValue(1);

  await expect(createOnboardingWebsite('workspace-1', 'user-1', 'acme.com')).rejects.toBeInstanceOf(
    OnboardingError,
  );
  expect(createWebsite).not.toHaveBeenCalled();
});

test('creates the first website in the workspace', async () => {
  const website = await createOnboardingWebsite('workspace-1', 'user-1', 'acme.com');

  expect(createWebsite).toHaveBeenCalledWith(
    expect.objectContaining({
      workspaceId: 'workspace-1',
      domain: 'acme.com',
      createdBy: 'user-1',
    }),
  );
  expect(website.id).toBe('website-1');
});

test('marks onboarding complete idempotently', async () => {
  await markOnboardingComplete('workspace-1');

  expect(prisma.client.workspace.update).toHaveBeenCalledWith({
    where: { id: 'workspace-1' },
    data: { onboardingCompletedAt: expect.any(Date) },
    select: { id: true, onboardingCompletedAt: true },
  });
});
