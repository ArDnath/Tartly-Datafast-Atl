import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { BRAND } from '@/lib/brand';
import { PLANS } from '@/lib/plans';
import { render, screen, within } from '@/test/render';
import { LandingPage } from './LandingPage';

const { scrollTo } = vi.hoisted(() => ({ scrollTo: vi.fn() }));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

vi.mock('react-fast-marquee', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lenis', () => ({
  default: class {
    scrollTo = scrollTo;
    raf() {}
    destroy() {}
  },
}));

describe('marketing landing page', () => {
  test('renders the hero, features, and every configured plan', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /See which channels actually make money/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Traffic and revenue together/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /OUR PRICING/i })).toBeInTheDocument();
    expect(screen.getAllByText(/No free tier/i).length).toBeGreaterThan(0);

    for (const plan of PLANS) {
      expect(screen.getByRole('heading', { name: plan.name })).toBeInTheDocument();
    }
  });

  test('squares out the supported no-code and framework stacks', () => {
    render(<LandingPage />);

    const stacks = screen.getByRole('region', { name: /works with your stack/i });

    expect(
      within(stacks).getByRole('heading', { name: /no code — site builders and cms/i }),
    ).toBeInTheDocument();
    expect(within(stacks).getByRole('heading', { name: /code — frameworks/i })).toBeInTheDocument();
    expect(within(stacks).getByRole('link', { name: /WordPress/i })).toHaveAttribute(
      'href',
      '/docs/install',
    );
    expect(within(stacks).getByRole('link', { name: /Shopify/i })).toHaveAttribute(
      'href',
      '/docs/install',
    );
    expect(within(stacks).getByRole('link', { name: /Next\.js/i })).toHaveAttribute(
      'href',
      '/docs/install',
    );
    expect(within(stacks).getByRole('link', { name: /Plain HTML/i })).toHaveAttribute(
      'href',
      '/docs/install',
    );
    // Payment providers are not listed in this section; they connect in settings.
    expect(within(stacks).queryByRole('link', { name: /Stripe/i })).not.toBeInTheDocument();
    // 8 no-code site platforms + 6 frameworks + 1 footer guide link.
    expect(within(stacks).getAllByRole('link')).toHaveLength(15);
  });

  test('starts Google sign-in with the entered website', () => {
    render(<LandingPage />);

    const form = screen.getByRole('textbox', { name: /your website/i }).closest('form');

    expect(form).toHaveAttribute('action', '/api/auth/google');
    expect(form).toHaveAttribute('method', 'get');
    expect(form?.querySelector('input[name="returnUrl"]')).toHaveValue('/onboarding');
  });

  test('links the navbar brand back to the top of the page', () => {
    render(<LandingPage />);

    const nav = screen.getByRole('navigation', { name: /Main/i });

    expect(within(nav).getByRole('link', { name: BRAND.name })).toHaveAttribute('href', '/#top');
    expect(document.getElementById('top')).toBeInTheDocument();
  });

  test('smooth scrolls to the top when the navbar brand is clicked', async () => {
    const { user } = render(<LandingPage />);
    const nav = screen.getByRole('navigation', { name: /Main/i });

    scrollTo.mockClear();
    await user.click(within(nav).getByRole('link', { name: BRAND.name }));

    expect(scrollTo).toHaveBeenCalledWith(0, { duration: 1.1 });
  });

  test('switches the pricing table to annual billing', async () => {
    const { user } = render(<LandingPage />);

    await user.click(screen.getByRole('button', { name: /Yearly/i }));

    expect(screen.getByText('$6.66')).toBeInTheDocument();
    expect(screen.getByText('$12.49')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yearly/i })).toHaveAttribute('aria-pressed', 'true');
  });

  test('changes the included traffic when the pricing slider moves', async () => {
    const { user } = render(<LandingPage />);
    const slider = screen.getByRole('slider', { name: /Monthly traffic/i });

    fireEvent.change(slider, { target: { value: '0' } });

    expect(screen.getByText('10,000 events / month')).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('10,000'));

    await user.click(screen.getByRole('button', { name: /Yearly/i }));

    expect(screen.getByText('$4.99')).toBeInTheDocument();
    expect(screen.getByText('$9.16')).toBeInTheDocument();
  });

  test('checkout links carry the selected plan, billing period, and traffic tier', async () => {
    const { user } = render(<LandingPage />);
    const starter = document.querySelector('[data-plan="starter"]') as HTMLElement;

    expect(within(starter).getByRole('link')).toHaveAttribute(
      'href',
      '/checkout?plan=starter&interval=monthly&tier=3',
    );

    fireEvent.change(screen.getByRole('slider', { name: /Monthly traffic/i }), {
      target: { value: '0' },
    });
    await user.click(screen.getByRole('button', { name: /Yearly/i }));

    expect(within(starter).getByRole('link')).toHaveAttribute(
      'href',
      '/checkout?plan=starter&interval=annual&tier=0',
    );
  });

  test('shows the factual capability answers instead of invented testimonials', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: /WHAT YOU CAN ANSWER/i })).toBeInTheDocument();
    expect(screen.getByText('Which channel pays?')).toBeInTheDocument();
    expect(screen.getByText(/Eight questions between the first click/i)).toBeInTheDocument();
    expect(screen.queryByText(/testimonial/i)).not.toBeInTheDocument();
  });

  test('labels the hero workspace as an illustrative preview and switches views', async () => {
    const { user } = render(<LandingPage />);
    const nav = screen.getByRole('navigation', { name: /Dashboard sections/i });

    expect(screen.getByText(/Illustrative preview · Tartly/i)).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Overview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(nav).getByRole('button', { name: 'Revenue' }));

    expect(within(nav).getByRole('button', { name: 'Revenue' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('region', { name: 'Channel breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Pro · annual')).toBeInTheDocument();
  });

  test('toggles the hero workspace theme without touching the landing page', async () => {
    const { user } = render(<LandingPage />);

    await user.click(screen.getByRole('button', { name: /Switch to dark theme/i }));

    expect(screen.getByRole('button', { name: /Switch to light theme/i })).toBeInTheDocument();
  });

  test('changes the hero workspace table tab', async () => {
    const { user } = render(<LandingPage />);
    const details = screen.getByRole('region', { name: 'Visitor details' });

    await user.click(within(details).getByRole('button', { name: 'Payments' }));

    expect(within(details).getByText('Ankita Shil')).toBeInTheDocument();
  });

  test('points the closing hand asset at the primary call to action', () => {
    const { container } = render(<LandingPage />);
    const hand = container.querySelector('img[src*="hand.png"]');

    expect(hand).toBeInTheDocument();
    expect(hand?.getAttribute('src')).toContain('images%2Flanding%2Fhand.png');
    expect(hand).toHaveAttribute('alt', '');
    expect(hand).toHaveAttribute('aria-hidden', 'true');
  });

  test('answers the free-plan, provider, and cancellation objections', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { name: /Questions before you start/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/How does Tartly match revenue to traffic\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Which payment providers can I connect\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Is there a free plan\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Can I cancel anytime\?/i)).toBeInTheDocument();
  });

  test('renders the payment providers that connect in settings', () => {
    render(<LandingPage />);

    expect(
      screen.getByText(/Connects to the payment providers you already use/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Dodo Payments')).toBeInTheDocument();
    expect(screen.getByText('Lemon Squeezy')).toBeInTheDocument();
  });
});
