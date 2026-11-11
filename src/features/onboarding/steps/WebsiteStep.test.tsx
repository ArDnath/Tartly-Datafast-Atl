import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { WebsiteStep } from './WebsiteStep';

test('renders the website URL step and forwards the typed value', async () => {
  const user = userEvent.setup();
  const onDomainChange = vi.fn();
  const onSubmit = vi.fn(event => event.preventDefault());

  render(
    <WebsiteStep
      domain=""
      busy={false}
      error={null}
      editing={false}
      onDomainChange={onDomainChange}
      onSubmit={onSubmit}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Start tracking revenue' })).toBeInTheDocument();
  expect(screen.getByLabelText('Website URL')).toBeInTheDocument();

  await user.type(screen.getByLabelText('Website URL'), 'acme.com');
  expect(onDomainChange).toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(onSubmit).toHaveBeenCalled();
});

test('shows the inline error from the parent', () => {
  render(
    <WebsiteStep
      domain="localhost"
      busy={false}
      error="Enter the domain you want to track, for example acme.com."
      editing={false}
      onDomainChange={() => {}}
      onSubmit={() => {}}
    />,
  );

  expect(
    screen.getByText('Enter the domain you want to track, for example acme.com.'),
  ).toBeInTheDocument();
});
