import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/render';
import { TrackerReminder } from './TrackerReminder';

const statusState = vi.hoisted(() => ({
  data: { data: [] as Array<Record<string, unknown>> },
}));

const accessState = vi.hoisted(() => ({
  data: { requiresPayment: false as boolean },
}));

vi.mock('@/features/workspaces/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => ({ workspaceId: 'workspace-1' }),
}));

vi.mock('../hooks/useInstallStatusQuery', () => ({
  useInstallStatusQuery: () => statusState,
}));

vi.mock('@/features/billing/hooks/useBillingAccessQuery', () => ({
  useBillingAccessQuery: () => accessState,
}));

beforeEach(() => {
  sessionStorage.clear();
  accessState.data = { requiresPayment: false };
  statusState.data = {
    data: [
      {
        id: 'website-1',
        name: 'Acme',
        domain: 'acme.com',
        connected: false,
      },
    ],
  };
});

test('shows a reminder for a website that has never sent an event', () => {
  render(<TrackerReminder />, { route: '/app' });

  expect(screen.getByRole('complementary', { name: 'Tracker setup reminder' })).toBeInTheDocument();
  expect(screen.getByText('Tracker not connected')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Finish setup' })).toHaveAttribute(
    'href',
    '/app/website-1/settings#tracking',
  );
});

test('shows across website reports but not inside that website settings', () => {
  const websiteRoute = '/app/50f07dc0-ea8f-4d75-9ddd-b074922b3681';

  const first = render(<TrackerReminder />, { route: websiteRoute });
  expect(screen.getByText('Tracker not connected')).toBeInTheDocument();
  first.unmount();

  const second = render(<TrackerReminder />, { route: `${websiteRoute}/revenue` });
  expect(screen.getByText('Tracker not connected')).toBeInTheDocument();
  second.unmount();

  render(<TrackerReminder />, { route: `${websiteRoute}/settings` });
  expect(screen.queryByText('Tracker not connected')).not.toBeInTheDocument();
});

test('disappears after an event is recorded', () => {
  statusState.data = {
    data: [
      {
        id: 'website-1',
        name: 'Acme',
        domain: 'acme.com',
        connected: true,
      },
    ],
  };

  render(<TrackerReminder />, { route: '/app' });

  expect(screen.queryByText('Tracker not connected')).not.toBeInTheDocument();
});

test('stays hidden behind a required payment paywall', () => {
  accessState.data = { requiresPayment: true };

  render(<TrackerReminder />, { route: '/app' });

  expect(screen.queryByText('Tracker not connected')).not.toBeInTheDocument();
});

test('stays hidden while the customer is already inside setup', () => {
  render(<TrackerReminder />, { route: '/app/new' });

  expect(screen.queryByText('Tracker not connected')).not.toBeInTheDocument();
});

test('dismissal lasts for the browser session only', async () => {
  const user = userEvent.setup();

  render(<TrackerReminder />, { route: '/app' });

  await user.click(screen.getByRole('button', { name: 'Dismiss reminder for Acme' }));

  expect(screen.queryByText('Tracker not connected')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('tartly-install-reminder-dismissed')).toBe('["website-1"]');
});
