import { beforeEach, expect, test, vi } from 'vitest';
import type { WorkspaceBillingAccessResponse } from '@/features/billing/lib/access';
import { render, screen, waitFor } from '@/test/render';
import { getTestRouter } from '@/test/navigation';
import { CheckoutHandoff } from './CheckoutHandoff';

const state = vi.hoisted(() => ({
  user: { id: 'user-1', onboardingRequired: false } as Record<string, unknown> | null,
  access: null as WorkspaceBillingAccessResponse | null,
  post: vi.fn(() => new Promise(() => {})),
}));

vi.mock('@/features/auth/hooks/useLoginQuery', () => ({
  useLoginQuery: () => ({ user: state.user, isLoading: false }),
}));

vi.mock('@/features/workspaces/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => ({
    workspaces: [{ id: 'workspace-1', role: 'OWNER' }],
    workspaceId: 'workspace-1',
    isLoading: false,
    save: vi.fn(),
  }),
}));

vi.mock('@/features/billing/hooks/useBillingAccessQuery', () => ({
  useBillingAccessQuery: () => ({
    data: state.access,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/components/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/components/hooks')>('@/components/hooks');

  return { ...actual, useApi: () => ({ post: state.post }) };
});

beforeEach(() => {
  state.post.mockClear();
});

function access(
  overrides: Partial<WorkspaceBillingAccessResponse> = {},
): WorkspaceBillingAccessResponse {
  return {
    workspaceId: 'workspace-1',
    role: 'OWNER',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    configured: true,
    paid: false,
    requiresPayment: true,
    subscription: null,
    availableProducts: [{ planId: 'pro', interval: 'monthly', tierIndex: 3 }],
    ...overrides,
  };
}

test('sends a workspace with paid access straight to the app', async () => {
  state.user = { id: 'user-1', onboardingRequired: false };
  state.access = access({ paid: true, requiresPayment: false });

  render(<CheckoutHandoff intent={{ planId: 'pro', interval: 'monthly', tierIndex: 3 }} />, {
    route: '/checkout?plan=pro&interval=monthly&tier=3',
  });

  await waitFor(() => expect(getTestRouter().replace).toHaveBeenCalledWith('/app'));
});

test('shows the checkout summary when payment is required', () => {
  state.user = { id: 'user-1', onboardingRequired: false };
  state.access = access();

  render(<CheckoutHandoff intent={{ planId: 'pro', interval: 'monthly', tierIndex: 3 }} />, {
    route: '/checkout?plan=pro&interval=monthly&tier=3',
  });

  expect(screen.getByText('Pro · Monthly')).toBeInTheDocument();
  expect(screen.getByText('$14.99')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
