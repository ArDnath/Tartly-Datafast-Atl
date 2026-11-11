import { beforeEach, expect, test, vi } from 'vitest';
import { getTestRouter } from '@/test/navigation';
import { render, screen, waitFor } from '@/test/render';
import { OnboardingFlow } from './OnboardingFlow';

const loginState = vi.hoisted(() => ({
  user: { id: 'user-new', onboardingRequired: true } as Record<string, unknown> | null,
  setUser: vi.fn(),
  isLoading: false,
}));

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/features/auth/hooks/useLoginQuery', () => ({
  useLoginQuery: () => loginState,
}));

vi.mock('@/components/hooks', () => ({
  useApi: () => api,
}));

beforeEach(() => {
  loginState.user = { id: 'user-new', onboardingRequired: true };
  loginState.setUser.mockReset();
  api.get.mockReset();
  api.post.mockReset();
});

test('starts the website step for a brand-new account with no workspace', async () => {
  api.get.mockResolvedValue([]);

  render(<OnboardingFlow />, { route: '/onboarding' });

  expect(
    await screen.findByRole('heading', { name: 'Start tracking revenue' }),
  ).toBeInTheDocument();
  expect(getTestRouter().replace).not.toHaveBeenCalledWith('/app');
});

test('sends an invited member without an owned workspace to the app', async () => {
  loginState.user = { id: 'user-invited', onboardingRequired: false };
  api.get.mockResolvedValue([
    {
      role: 'MEMBER',
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
        slug: 'acme',
        logoUrl: null,
        planId: 'pro',
        subscriptionStatus: 'active',
        onboardingCompletedAt: '2026-11-01T00:00:00.000Z',
      },
    },
  ]);

  render(<OnboardingFlow />, { route: '/onboarding' });

  await waitFor(() => expect(getTestRouter().replace).toHaveBeenCalledWith('/app'));
});
