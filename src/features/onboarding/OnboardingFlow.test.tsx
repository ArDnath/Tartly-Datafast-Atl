import { beforeEach, expect, test, vi } from 'vitest';
import { getTestRouter } from '@/test/navigation';
import { render, screen, userEvent, waitFor } from '@/test/render';
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

const touchMock = vi.hoisted(() => vi.fn());

const workspaceState = vi.hoisted(() => ({
  activeWorkspace: {
    id: 'workspace-1',
    name: 'Acme',
    slug: 'acme',
    logoUrl: null,
    planId: 'pro',
    subscriptionStatus: 'active',
    onboardingCompletedAt: '2026-11-01T00:00:00.000Z',
    role: 'OWNER',
  } as Record<string, unknown>,
  workspaceId: 'workspace-1',
  workspaces: [] as Array<Record<string, unknown>>,
  isLoading: false,
}));

vi.mock('@/features/auth/hooks/useLoginQuery', () => ({
  useLoginQuery: () => loginState,
}));

vi.mock('@/components/hooks', () => ({
  useApi: () => api,
  useModified: () => ({ touch: touchMock }),
}));

vi.mock('@/features/workspaces/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => workspaceState,
}));

beforeEach(() => {
  loginState.user = { id: 'user-new', onboardingRequired: true };
  loginState.setUser.mockReset();
  api.get.mockReset();
  api.post.mockReset();
  touchMock.mockReset();
  api.get.mockResolvedValue({});
  workspaceState.activeWorkspace = {
    id: 'workspace-1',
    name: 'Acme',
    slug: 'acme',
    logoUrl: null,
    planId: 'pro',
    subscriptionStatus: 'active',
    onboardingCompletedAt: '2026-11-01T00:00:00.000Z',
    role: 'OWNER',
  };
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

test('add mode creates the website in the active workspace instead of onboarding a new one', async () => {
  const user = userEvent.setup();
  api.post.mockResolvedValue({
    id: 'website-new',
    name: 'new.example',
    domain: 'new.example',
    workspaceId: 'workspace-1',
  });

  render(<OnboardingFlow mode="add-website" />, { route: '/app/new' });

  expect(
    await screen.findByRole('heading', { name: 'Start tracking revenue' }),
  ).toBeInTheDocument();

  await user.type(screen.getByLabelText('Website URL'), 'new.example');
  await user.click(screen.getByRole('button', { name: 'Continue' }));

  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/websites', {
      domain: 'new.example',
      name: 'new.example',
      workspaceId: 'workspace-1',
    }),
  );
  expect(api.post).not.toHaveBeenCalledWith('/onboarding/website', expect.anything());
  expect(touchMock).toHaveBeenCalledWith('websites');
  expect(await screen.findByText('Install the tracker')).toBeInTheDocument();
});

test('add mode blocks a workspace viewer before showing the form', async () => {
  workspaceState.activeWorkspace = {
    ...(workspaceState.activeWorkspace as Record<string, unknown>),
    role: 'VIEWER',
  };

  render(<OnboardingFlow mode="add-website" />, { route: '/app/new' });

  expect(
    await screen.findByText('Only workspace owners and admins can add a website.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Start tracking revenue' })).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('add mode returns to the app from the first step', async () => {
  const user = userEvent.setup();

  render(<OnboardingFlow mode="add-website" />, { route: '/app/new' });

  await user.click(await screen.findByRole('button', { name: 'Back to websites' }));

  expect(getTestRouter().push).toHaveBeenCalledWith('/app');
});

test('add mode finishes on the website, never completes workspace onboarding', async () => {
  api.post.mockResolvedValue({
    id: 'website-new',
    name: 'new.example',
    domain: 'new.example',
    workspaceId: 'workspace-1',
  });

  render(<OnboardingFlow mode="add-website" />, { route: '/app/new' });

  expect(
    await screen.findByRole('heading', { name: 'Start tracking revenue' }),
  ).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalledWith('/onboarding/complete', expect.anything());
  expect(loginState.setUser).not.toHaveBeenCalled();
});
