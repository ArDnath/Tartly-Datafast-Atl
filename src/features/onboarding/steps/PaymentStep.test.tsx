import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { PaymentStep } from './PaymentStep';

const apiPost = vi.hoisted(() => vi.fn());

vi.mock('@/components/hooks', () => ({
  useApi: () => ({ post: apiPost }),
}));

beforeEach(() => {
  apiPost.mockReset();
  apiPost.mockResolvedValue({ id: 'connection-1' });
});

test('connects Stripe with the key typed into the onboarding step', async () => {
  const user = userEvent.setup();

  render(
    <PaymentStep
      websiteId="website-1"
      connectedProviders={[]}
      busy={false}
      error={null}
      onFinish={() => {}}
      onBack={() => {}}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Connect revenue' })).toBeInTheDocument();

  await user.type(screen.getByLabelText('Stripe restricted key'), 'rk_live_example');
  await user.click(screen.getByRole('button', { name: 'Connect Stripe' }));

  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith('/websites/website-1/payment-provider-connections', {
      providerName: 'stripe',
      apiKey: 'rk_live_example',
    }),
  );
  expect(await screen.findByText('Stripe connected')).toBeInTheDocument();
});

test('finishes setup without connecting a provider', async () => {
  const user = userEvent.setup();
  const onFinish = vi.fn();

  render(
    <PaymentStep
      websiteId="website-1"
      connectedProviders={[]}
      busy={false}
      error={null}
      onFinish={onFinish}
      onBack={() => {}}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Finish setup' }));

  expect(onFinish).toHaveBeenCalled();
});

test('shows an already connected provider from the resume state', () => {
  render(
    <PaymentStep
      websiteId="website-1"
      connectedProviders={['stripe']}
      busy={false}
      error={null}
      onFinish={() => {}}
      onBack={() => {}}
    />,
  );

  expect(screen.getByText('Stripe connected')).toBeInTheDocument();
});
