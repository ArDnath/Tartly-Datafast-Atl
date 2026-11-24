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
    targetScroll = 0;
    scrollTo = scrollTo;
    raf() {}
    destroy() {}
  },
}));

describe('marketing landing page', () => {
  test('renders the hero, features, and every configured plan', () => {
    const { container } = render(<LandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /See which channels actually make money/i }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('#home .lp-hero-line')).toHaveLength(2);
    expect(container.querySelectorAll('#home h1 .fold-text')).toHaveLength(3);
    const channelWord = screen.getByRole('button', {
      name: 'Change the channel word (currently channels)',
    });
    const revenueWord = screen.getByRole('button', {
      name: 'Change the revenue word (currently money)',
    });
    fireEvent.click(channelWord);
    expect(
      screen.getByRole('button', { name: 'Change the channel word (currently campaigns)' }),
    ).toBeInTheDocument();
    fireEvent.click(revenueWord);
    expect(
      screen.getByRole('button', { name: 'Change the revenue word (currently revenue)' }),
    ).toBeInTheDocument();
    expect(container.querySelector('#home .lp-mark-swirl-line path')).toHaveAttribute(
      'd',
      'M6 17C50 17 80 5 130 8c25 1.5 38 4 30 9-8 5-28 0-20-8 10-10 40-6 70-2 30 4 60 8 84 2',
    );
    expect(screen.getByRole('heading', { name: /Traffic, meet revenue/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Simple pricing/i })).toBeInTheDocument();
    expect(screen.getAllByText(/No free tier/i).length).toBeGreaterThan(0);
    const heroForm = screen
      .getByRole('textbox', { name: /Your website/i })
      .closest('form') as HTMLFormElement;
    const heroSubmit = within(heroForm).getByRole('button', { name: /^Start tracking$/ });
    expect(heroSubmit).toHaveClass('lp-hero-3d');
    expect(heroSubmit).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('textbox', { name: /Your website/i }).parentElement).toHaveClass(
      'lp-hero-input-wrap',
    );
    const heroPrice = container.querySelector('#home .lp-hero-price');
    expect(heroPrice).not.toBeNull();
    expect(heroPrice).toHaveTextContent('$7.99/mo');
    expect(container.querySelectorAll('#features .rj-step')).toHaveLength(3);
    expect(container.querySelectorAll('#features .rj-step-number')).toHaveLength(3);
    expect(container.querySelectorAll('#features .rj-step[data-active="true"]')).toHaveLength(1);
    expect(container.querySelector('#features .rj-step[aria-current="step"]')).not.toBeNull();
    expect(container.querySelectorAll('#features .rj-inline .rj-scene')).toHaveLength(3);
    expect(container.querySelectorAll('#features .rj-stage-panel')).toHaveLength(3);
    // Three inline drawings for small screens plus three in the sticky stage.
    expect(container.querySelectorAll('#features .rj-svg')).toHaveLength(6);
    expect(container.querySelectorAll('#features .rj-wire').length).toBeGreaterThan(0);
    // Every stage ships a complete, server-rendered still with its callouts.
    expect(container.querySelectorAll('#features .rj-tip')).toHaveLength(6);
    expect(screen.getByText('TRAFFIC, MEET REVENUE')).toBeInTheDocument();

    for (const plan of PLANS) {
      expect(screen.getByRole('heading', { name: plan.name })).toBeInTheDocument();
    }
  });

  test('lays the three interactive build steps out in the process section', () => {
    const { container } = render(<LandingPage />);

    expect(
      screen.getByRole('heading', {
        name: /FROM ONE SCRIPT TAG TO REVENUE IN 3 STEPS/i,
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('#process .lp-process-item')).toHaveLength(3);
    expect(container.querySelectorAll('#process .lp-process-card')).toHaveLength(3);
  });

  test('places the integrations manifest after the FAQ, in the closing stretch', () => {
    render(<LandingPage />);

    const faq = screen.getByRole('region', { name: /questions before you start/i });
    const integrations = screen.getByRole('region', { name: /works with your stack/i });

    expect(
      faq.compareDocumentPosition(integrations) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('walks through the three-step process with drawn product stills', () => {
    const { container } = render(<LandingPage />);

    expect(screen.getByRole('region', { name: /FROM ONE SCRIPT TAG/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /1\. Install Tartly/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /2\. Connect revenue data/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /3\. See what converts/i }),
    ).toBeInTheDocument();
    // The provider step names the integrations it supports. Scope to the process
    // card so this doesn't collide with the providers strip lower on the page.
    const process = screen.getByRole('region', { name: /FROM ONE SCRIPT TAG/i });
    expect(within(process).getByLabelText('Works with')).toBeInTheDocument();
    expect(within(process).getByText('Lemon Squeezy')).toBeInTheDocument();
    expect(screen.getByText('Manual API')).toBeInTheDocument();
    // Each of the three cards carries one product still and one photograph.
    expect(container.querySelectorAll('#process .lp-step-band')).toHaveLength(3);
    expect(container.querySelectorAll('#process .lp-step-figure')).toHaveLength(3);
    expect(container.querySelectorAll('#process .lp-step-photo')).toHaveLength(3);
    expect(
      within(screen.getByRole('region', { name: /FROM ONE SCRIPT TAG/i })).getAllByRole('heading', {
        level: 3,
      }),
    ).toHaveLength(3);
  });

  test('closes the process section with an add-your-site handoff', () => {
    render(<LandingPage />);

    const process = screen.getByRole('region', { name: /FROM ONE SCRIPT TAG/i });
    const form = within(process)
      .getByRole('textbox', { name: /Website to add/i })
      .closest('form') as HTMLFormElement;

    expect(form).toHaveAttribute('action', '/signup');
    expect(form).toHaveAttribute('method', 'get');
    expect(form.querySelector('input[name="returnUrl"]')).toHaveValue('/onboarding');
    expect(within(form).getByRole('button', { name: /Add your site/i })).toBeInTheDocument();
  });

  test('squares out the supported no-code and framework stacks', () => {
    render(<LandingPage />);

    const stacks = screen.getByRole('region', { name: /works with your stack/i });

    expect(
      within(stacks).getByRole('heading', { name: /Site builders and CMS/i }),
    ).toBeInTheDocument();
    expect(within(stacks).getByRole('heading', { name: /^Frameworks$/i })).toBeInTheDocument();
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

  test('starts the sign-in handoff with the entered website', () => {
    render(<LandingPage />);

    const form = screen.getByRole('textbox', { name: /your website/i }).closest('form');

    expect(form).toHaveAttribute('action', '/signup');
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

  test('checkout links carry the selected plan and billing period', async () => {
    const { user } = render(<LandingPage />);
    const starter = document.querySelector('[data-plan="starter"]') as HTMLElement;

    expect(within(starter).getByRole('link')).toHaveAttribute(
      'href',
      '/checkout?plan=starter&interval=monthly&tier=3',
    );

    await user.click(screen.getByRole('button', { name: /Yearly/i }));

    expect(within(starter).getByRole('link')).toHaveAttribute(
      'href',
      '/checkout?plan=starter&interval=annual&tier=3',
    );
  });

  test('shows the factual capability answers instead of invented testimonials', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: /WHAT YOU CAN ANSWER/i })).toBeInTheDocument();
    expect(screen.getByText('Which channel pays?')).toBeInTheDocument();
    expect(screen.getByText(/Eight questions between the first click/i)).toBeInTheDocument();
    expect(screen.queryByText(/testimonial/i)).not.toBeInTheDocument();
  });

  test('switches hero workspace views', async () => {
    const { user } = render(<LandingPage />);
    const nav = screen.getByRole('navigation', { name: /Dashboard sections/i });

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

  test('hands the wheel back to the page when the demo preview reaches an edge', () => {
    render(<LandingPage />);
    const preview = screen.getByLabelText('Scrollable dashboard preview');

    scrollTo.mockClear();
    fireEvent.wheel(preview, { deltaY: 120 });

    expect(scrollTo).toHaveBeenCalledWith(120, { programmatic: false });
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

  test('shows the illustrative photography band with descriptive alt text', () => {
    const { container } = render(<LandingPage />);
    const band = screen.getByRole('region', { name: /built for the solo founder/i });

    expect(within(band).getAllByRole('img')).toHaveLength(3);
    expect(container.querySelectorAll('.lp-who-card')).toHaveLength(3);
    // The index numerals were removed; the captions are title plus one line.
    expect(container.querySelectorAll('.lp-who-index')).toHaveLength(0);

    for (const image of within(band).getAllByRole('img')) {
      expect(image.getAttribute('alt')).toBeTruthy();
    }
  });

  test('closes the audience band with a start-now call to action', () => {
    render(<LandingPage />);

    const band = screen.getByRole('region', { name: /built for the solo founder/i });

    expect(within(band).getByRole('link', { name: /Start now/i })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  test('renders the payment providers that connect in settings', () => {
    render(<LandingPage />);

    // The process cards now name Lemon Squeezy too, so scope this to the
    // providers strip rather than querying the whole page.
    const providers = screen.getByRole('region', {
      name: /Connects to the payment providers you already use/i,
    });

    expect(within(providers).getByText('Dodo Payments')).toBeInTheDocument();
    expect(within(providers).getByText('Lemon Squeezy')).toBeInTheDocument();
  });
});
