import { beforeEach, describe, expect, test, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  client: {
    workspaceMembership: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));

const { isOnboardingRequired, resolvePostSignInPath } = await import('./post-signin');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.client.workspaceMembership.findMany.mockResolvedValue([]);
});

describe('isOnboardingRequired', () => {
  test('is true when the user has no live workspace membership', async () => {
    await expect(isOnboardingRequired('user-1')).resolves.toBe(true);
  });

  test('is true when the only owned workspace is still mid-onboarding', async () => {
    prismaMock.client.workspaceMembership.findMany.mockResolvedValue([
      { role: 'OWNER', workspace: { onboardingCompletedAt: null } },
    ]);

    await expect(isOnboardingRequired('user-1')).resolves.toBe(true);
  });

  test('is false when the owned workspace completed onboarding', async () => {
    prismaMock.client.workspaceMembership.findMany.mockResolvedValue([
      { role: 'OWNER', workspace: { onboardingCompletedAt: new Date('2026-11-09T10:00:00Z') } },
    ]);

    await expect(isOnboardingRequired('user-1')).resolves.toBe(false);
  });

  test('is false for an invited member who owns no workspace', async () => {
    prismaMock.client.workspaceMembership.findMany.mockResolvedValue([
      { role: 'MEMBER', workspace: { onboardingCompletedAt: null } },
    ]);

    await expect(isOnboardingRequired('user-1')).resolves.toBe(false);
  });

  test('does not force onboarding when one live workspace is already complete', async () => {
    prismaMock.client.workspaceMembership.findMany.mockResolvedValue([
      { role: 'OWNER', workspace: { onboardingCompletedAt: null } },
      { role: 'VIEWER', workspace: { onboardingCompletedAt: new Date('2026-11-09T10:00:00Z') } },
    ]);

    await expect(isOnboardingRequired('user-1')).resolves.toBe(false);
  });
});

describe('resolvePostSignInPath', () => {
  test('sends a first-time user to onboarding instead of /app', async () => {
    await expect(resolvePostSignInPath('user-1', '/app')).resolves.toBe('/onboarding');
  });

  test('keeps an explicit onboarding return URL and its website query', async () => {
    await expect(resolvePostSignInPath('user-1', '/onboarding?website=acme.com')).resolves.toBe(
      '/onboarding?website=acme.com',
    );
  });

  test('carries a pricing checkout through first-run onboarding', async () => {
    await expect(
      resolvePostSignInPath('user-1', '/checkout?plan=pro&interval=annual&tier=3'),
    ).resolves.toBe('/onboarding?next=%2Fcheckout%3Fplan%3Dpro%26interval%3Dannual%26tier%3D3');
  });

  test('keeps the requested app URL for an existing member', async () => {
    prismaMock.client.workspaceMembership.findMany.mockResolvedValue([
      { role: 'MEMBER', workspace: { onboardingCompletedAt: new Date() } },
    ]);

    await expect(resolvePostSignInPath('user-1', '/app/revenue')).resolves.toBe('/app/revenue');
  });

  test('rejects an external return URL before checking membership', async () => {
    prismaMock.client.workspaceMembership.findMany.mockResolvedValue([
      { role: 'MEMBER', workspace: { onboardingCompletedAt: new Date() } },
    ]);

    await expect(resolvePostSignInPath('user-1', 'https://evil.example/phish')).resolves.toBe(
      '/app',
    );
  });
});
