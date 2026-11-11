import { expect, test } from 'vitest';
import type { WorkspaceBillingAccess } from '@/features/billing/lib/access';
import { render, screen } from '@/test/render';
import { TrialBanner } from './TrialBanner';

function access(overrides: Partial<WorkspaceBillingAccess> = {}): WorkspaceBillingAccess {
  const endsAt = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  return {
    workspaceId: 'workspace-1',
    planId: 'starter',
    subscriptionStatus: 'incomplete',
    configured: true,
    paid: false,
    trial: { active: true, endsAt, daysRemaining: 6 },
    requiresPayment: false,
    subscription: null,
    availableProducts: [],
    ...overrides,
  };
}

test('shows the trial countdown, end date, and plan link', () => {
  render(<TrialBanner access={access()} />, { route: '/app' });

  expect(screen.getByRole('status')).toHaveTextContent(/6 days left/i);
  expect(screen.getByText(/ends/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Choose a plan/i })).toHaveAttribute(
    'href',
    '/app/settings/billing',
  );
});

test('shows the final day clearly', () => {
  const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  render(<TrialBanner access={access({ trial: { active: true, endsAt, daysRemaining: 1 } })} />, {
    route: '/app',
  });

  expect(screen.getByRole('status')).toHaveTextContent(/Ends today/i);
});

test('renders nothing for a paid workspace or an expired trial', () => {
  render(
    <TrialBanner
      access={access({
        paid: true,
        trial: { active: false, endsAt: null, daysRemaining: 0 },
        requiresPayment: false,
      })}
    />,
    { route: '/app' },
  );

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Choose a plan/i })).not.toBeInTheDocument();
});
