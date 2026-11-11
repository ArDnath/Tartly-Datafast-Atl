import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { TrackerStep } from './TrackerStep';

const apiGet = vi.hoisted(() => vi.fn());

vi.mock('@/components/hooks', () => ({
  useApi: () => ({ get: apiGet }),
}));

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockResolvedValue({ installed: false, eventCount: 0, lastEventAt: null });
});

test('renders the tracker snippet and live verification state', async () => {
  render(
    <TrackerStep
      website={{ id: 'website-1', domain: 'acme.com' }}
      onContinue={() => {}}
      onBack={() => {}}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Install the tracker' })).toBeInTheDocument();
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();
  expect(screen.getByText('Waiting for the first event')).toBeInTheDocument();

  await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/websites/website-1/onboarding/verify'));
});

test('switches framework guides and continues without a verified event', async () => {
  const user = userEvent.setup();
  const onContinue = vi.fn();

  render(
    <TrackerStep
      website={{ id: 'website-1', domain: 'acme.com' }}
      onContinue={onContinue}
      onBack={() => {}}
    />,
  );

  await user.click(screen.getByRole('tab', { name: 'Next.js' }));
  expect(screen.getByText(/import Script from 'next\/script'/)).toBeInTheDocument();

  await user.click(screen.getByRole('tab', { name: 'Other / No-code' }));
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();
  expect(screen.queryByText(/import Script from 'next\/script'/)).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(onContinue).toHaveBeenCalled();
});
