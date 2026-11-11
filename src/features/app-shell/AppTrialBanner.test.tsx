import { expect, test, vi } from 'vitest';
import type { WorkspaceBillingAccessResponse } from '@/features/billing/lib/access';
import { render, screen } from '@/test/render';
import { AppTrialBanner } from './AppTrialBanner';

const state = vi.hoisted(() => ({
  access: null as WorkspaceBillingAccessResponse | null,
}));

vi.mock('@/features/workspaces/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => ({ workspaceId: 'workspace-1' }),
}));

vi.mock('@/features/billing/hooks/useBillingAccessQuery', () => ({
  useBillingAccessQuery: () => ({ data: state.access }),
}));

function access(): WorkspaceBillingAccessResponse {
  return {
    workspaceId: 'workspace-1',
    role: 'OWNER',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    configured: true,
    paid: false,
    trial: {
      active: true,
      endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: 5,
    },
    requiresPayment: false,
    subscription: null,
    availableProducts: [],
  };
}

test('renders the trial countdown strip during the trial', () => {
  state.access = access();

  render(<AppTrialBanner />, { route: '/app' });

  expect(screen.getByRole('status')).toHaveTextContent(/days left/i);
});

test('renders nothing after the trial or before billing state loads', () => {
  state.access = {
    ...access(),
    trial: { active: false, endsAt: null, daysRemaining: 0 },
    requiresPayment: true,
  };

  const { rerender } = render(<AppTrialBanner />, { route: '/app' });

  expect(screen.queryByRole('status')).not.toBeInTheDocument();

  state.access = null;
  rerender(<AppTrialBanner />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
