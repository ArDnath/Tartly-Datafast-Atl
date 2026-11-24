import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { PricingPage } from './PricingPage';

describe('pricing page', () => {
  test('keeps the owner-fixed default prices and the editorial headline', () => {
    render(<PricingPage />);

    expect(
      screen.getByRole('heading', {
        name: "Know what's working. Pay for what matters.",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('$7.99')).toBeInTheDocument();
    expect(screen.getByText('$14.99')).toBeInTheDocument();
    expect(screen.getByText('Most popular')).toBeInTheDocument();
  });

  test('keeps plan entitlements sourced from the plan config', () => {
    const { container } = render(<PricingPage />);

    const starter = container.querySelector('[data-plan="starter"]');
    const pro = container.querySelector('[data-plan="pro"]');

    expect(starter).not.toBeNull();
    expect(pro).not.toBeNull();

    expect(starter).toHaveTextContent('1 website');
    expect(starter).toHaveTextContent('Session replay available on Pro');
    expect(pro).toHaveTextContent('20 websites');
    expect(pro).toHaveTextContent('2,000 replays / month');
    expect(pro).toHaveTextContent('Unlimited payment connections');
  });

  test('toggles to yearly billing and carries the interval into checkout', async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole('button', { name: /Yearly/ }));

    expect(screen.getByRole('button', { name: /Yearly/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('$6.66')).toBeInTheDocument();
    expect(screen.getByText('$12.49')).toBeInTheDocument();
    expect(screen.getByText(/you save \$15\.98/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start with Starter/ })).toHaveAttribute(
      'href',
      '/checkout?plan=starter&interval=annual&tier=3',
    );
  });

  test('traffic slider updates both prices and the checkout tier', () => {
    render(<PricingPage />);

    const slider = screen.getByRole('slider', { name: 'Monthly traffic' });
    fireEvent.change(slider, { target: { value: '0' } });

    expect(screen.getByText('$5.99')).toBeInTheDocument();
    expect(screen.getByText('$10.99')).toBeInTheDocument();
    expect(screen.getByText('10,000 events / month')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start with Pro/ })).toHaveAttribute(
      'href',
      '/checkout?plan=pro&interval=monthly&tier=0',
    );
  });

  test('decorative curves stay out of the accessibility tree', () => {
    const { container } = render(<PricingPage />);
    const decor = container.querySelector('[aria-hidden="true"]');

    expect(decor).not.toBeNull();
    expect(decor?.querySelector('svg')).not.toBeNull();
    expect(decor?.querySelector('path')).not.toBeNull();
  });
});
