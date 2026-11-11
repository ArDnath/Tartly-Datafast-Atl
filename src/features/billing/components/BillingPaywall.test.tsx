import { beforeEach, expect, test, vi } from 'vitest';
import type { WorkspaceBillingAccessResponse } from '@/features/billing/lib/access';
import { render, screen } from '@/test/render';
import { BillingPaywall } from './BillingPaywall';

const api = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('@/components/hooks', () => ({
  useApi: () => api,
}));

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
    trial: { active: false, endsAt: null, daysRemaining: 0 },
    requiresPayment: true,
    subscription: null,
    availableProducts: [
      { planId: 'starter', interval: 'monthly', tierIndex: 3 },
      { planId: 'pro', interval: 'monthly', tierIndex: 3 },
      { planId: 'starter', interval: 'annual', tierIndex: 3 },
      { planId: 'pro', interval: 'annual', tierIndex: 3 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('shows both glass plan cards and starts checkout with the selected tier', async () => {
  api.post.mockRejectedValue(new Error('provider offline'));
  const { user } = render(<BillingPaywall access={access()} workspaceId="workspace-1" />, {
    route: '/app',
  });

  expect(screen.getByRole('heading', { name: /Your free trial has ended/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Starter' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
  expect(screen.getByText('$7.99')).toBeInTheDocument();
  expect(screen.getByText('$14.99')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Choose Starter/i }));

  expect(api.post).toHaveBeenCalledWith('/billing/checkout', {
    workspaceId: 'workspace-1',
    planId: 'starter',
    interval: 'monthly',
    tierIndex: 3,
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('provider offline');
});

test('switches the price to annual billing', async () => {
  const { user } = render(<BillingPaywall access={access()} workspaceId="workspace-1" />, {
    route: '/app',
  });

  await user.click(screen.getByRole('button', { name: /Yearly/i }));

  expect(screen.getByText('$6.66')).toBeInTheDocument();
  expect(screen.getByText('$12.49')).toBeInTheDocument();
});

test('disables checkout for an invited member', () => {
  render(<BillingPaywall access={access({ role: 'MEMBER' })} workspaceId="workspace-1" />, {
    route: '/app',
  });

  expect(screen.getByText(/Only the workspace owner can choose a plan/i)).toBeInTheDocument();

  for (const button of screen.getAllByRole('button', { name: /Owner must choose/i })) {
    expect(button).toBeDisabled();
  }
});

test('explains when billing is not configured', () => {
  render(
    <BillingPaywall
      access={access({ configured: false, availableProducts: [] })}
      workspaceId="workspace-1"
    />,
    { route: '/app' },
  );

  expect(screen.getByText(/Payments are temporarily unavailable/i)).toBeInTheDocument();

  for (const button of screen.getAllByRole('button', { name: /Payments unavailable/i })) {
    expect(button).toBeDisabled();
  }
});
