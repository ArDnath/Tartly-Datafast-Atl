import { beforeEach, expect, test, vi } from 'vitest';
import type { WorkspaceBillingAccessResponse } from '@/features/billing/lib/access';
import { render, screen } from '@/test/render';
import { AppBillingGate } from './AppBillingGate';

const accessState = vi.hoisted(() => ({
  data: null as WorkspaceBillingAccessResponse | null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock('@/features/workspaces/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => ({ workspaceId: 'workspace-1' }),
}));

vi.mock('@/features/billing/hooks/useBillingAccessQuery', () => ({
  useBillingAccessQuery: () => accessState,
}));

vi.mock('@/features/app-shell/UsageBanner', () => ({
  UsageBanner: () => null,
}));

function expiredAccess(): WorkspaceBillingAccessResponse {
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
    availableProducts: [{ planId: 'starter', interval: 'monthly', tierIndex: 3 }],
  };
}

beforeEach(() => {
  accessState.isLoading = false;
  accessState.isError = false;
  accessState.data = expiredAccess();
});

test('replaces the app content with the paywall after the trial ends', () => {
  render(
    <AppBillingGate>
      <p>Private dashboard</p>
    </AppBillingGate>,
    { route: '/app' },
  );

  expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Your free trial has ended/i })).toBeInTheDocument();
});

test('keeps the app open during the trial', () => {
  accessState.data = {
    ...expiredAccess(),
    requiresPayment: false,
    trial: {
      active: true,
      endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: 4,
    },
  };

  render(
    <AppBillingGate>
      <p>Private dashboard</p>
    </AppBillingGate>,
    { route: '/app' },
  );

  expect(screen.getByText('Private dashboard')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /free trial has ended/i })).not.toBeInTheDocument();
});

test('shows the confirmation screen while a successful payment is waiting for the webhook', () => {
  render(
    <AppBillingGate>
      <p>Private dashboard</p>
    </AppBillingGate>,
    { route: '/app?checkout=success' },
  );

  expect(screen.getByRole('heading', { name: /Payment received/i })).toBeInTheDocument();
  expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
});

test('renders the app when the caller has paid access', () => {
  accessState.data = {
    ...expiredAccess(),
    paid: true,
    requiresPayment: false,
  };

  render(
    <AppBillingGate>
      <p>Private dashboard</p>
    </AppBillingGate>,
    { route: '/app' },
  );

  expect(screen.getByText('Private dashboard')).toBeInTheDocument();
});
