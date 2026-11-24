import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useCountUp } from '../process/useCountUp';
import { render, screen, within } from '@/test/render';
import { BuildProcess } from './BuildProcess';

function processRegion() {
  return screen.getByRole('region', { name: /from one script tag to revenue in 3 steps/i });
}

describe('build process section', () => {
  test('renders three cards, detail buttons, providers, revenue labels, and code', () => {
    const { container } = render(<BuildProcess />);
    const process = processRegion();

    expect(within(process).getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(container.querySelectorAll('.lp-process-card')).toHaveLength(3);

    const buttons = within(process).getAllByRole('button', { name: /show details for/i });
    expect(buttons).toHaveLength(3);

    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    }

    expect(buttons[0]).toHaveAccessibleName('Show details for Install Tartly');

    // Provider step.
    expect(within(process).getByLabelText('Works with')).toBeInTheDocument();
    expect(within(process).getByText('Stripe')).toBeInTheDocument();
    expect(within(process).getByText('Lemon Squeezy')).toBeInTheDocument();
    expect(within(process).getByText('Manual API')).toBeInTheDocument();

    // Revenue step.
    expect(within(process).getByText('Organic / Google')).toBeInTheDocument();
    expect(within(process).getByText('$4,280')).toBeInTheDocument();
    expect(within(process).getByText('$2,140')).toBeInTheDocument();
    expect(within(process).getByText('$1,120')).toBeInTheDocument();

    // Install step.
    expect(within(process).getByText('https://tartly.in/t.js')).toBeInTheDocument();
    expect(within(process).getByText('data-site')).toBeInTheDocument();
    expect(within(process).getByText('Installed successfully')).toBeInTheDocument();

    const code = container.querySelector('.lp-process-code');
    expect(code?.textContent).toContain('<script');
    expect(code?.textContent).toContain('</script>');
  });

  test('uses the supplied images as the three card backgrounds', () => {
    const { container } = render(<BuildProcess />);
    const photos = Array.from(container.querySelectorAll<HTMLImageElement>('.lp-step-photo'));

    expect(photos).toHaveLength(3);
    expect(photos.map(photo => photo.getAttribute('alt'))).toEqual(['', '', '']);
    expect(photos.map(photo => decodeURIComponent(photo.getAttribute('src') ?? ''))).toEqual([
      expect.stringContaining('/images/landing/process-install-bg.webp'),
      expect.stringContaining('/images/landing/process-connect-bg-v2.webp'),
      expect.stringContaining('/images/landing/process-revenue-bg-v2.webp'),
    ]);
  });

  test('toggles the detail drawer from its own button', async () => {
    const { user } = render(<BuildProcess />);
    const process = processRegion();
    const button = within(process).getByRole('button', {
      name: 'Show details for Install Tartly',
    });
    const detail = process.querySelector('#lp-process-detail-install') as HTMLElement;

    expect(detail).toHaveAttribute('data-expanded', 'false');
    expect(detail.querySelector('[inert]')).not.toBeNull();

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAccessibleName('Hide details for Install Tartly');
    expect(detail).toHaveAttribute('data-expanded', 'true');
    expect(detail.querySelector('[inert]')).toBeNull();
    expect(
      within(detail).getByText("One lightweight script. That's all it takes."),
    ).toBeInTheDocument();
  });

  test('clicking the card outside the button toggles it exactly once', async () => {
    const { user } = render(<BuildProcess />);
    const card = document.querySelector('.lp-process-card') as HTMLElement;
    const button = within(card).getByRole('button');

    await user.click(within(card).getByRole('heading', { level: 3 }));
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.click(within(card).getByText('index.html'));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('validates the website and keeps focus before leaving for signup', async () => {
    const { user } = render(<BuildProcess />);
    const process = processRegion();
    const input = within(process).getByRole('textbox', { name: /Website to add/i });
    const form = input.closest('form') as HTMLFormElement;

    await user.type(input, 'not a site');
    fireEvent.submit(form);

    expect(within(form).getByRole('alert')).toHaveTextContent('Enter a website like yoursite.com.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    // The invalid value is kept so the visitor can correct it.
    expect(input).toHaveValue('not a site');

    await user.clear(input);
    await user.type(input, 'https://yoursite.com/');

    expect(within(form).queryByRole('alert')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  test('keeps the signup form contract', () => {
    render(<BuildProcess />);
    const process = processRegion();
    const input = within(process).getByRole('textbox', { name: /Website to add/i });
    const form = input.closest('form') as HTMLFormElement;

    expect(form).toHaveAttribute('action', '/signup');
    expect(form).toHaveAttribute('method', 'get');
    expect(form.querySelector('input[name="returnUrl"]')).toHaveValue('/onboarding');
    expect(form.querySelector('input[name="website"]')).toBe(input);
    expect(within(form).getByRole('button', { name: /Add your site/i })).toBeInTheDocument();
  });

  test('renders the interactive provider web with every source and its status', () => {
    const { container } = render(<BuildProcess />);
    const process = processRegion();

    for (const name of ['Stripe', 'Dodo', 'Lemon Squeezy', 'Polar', 'Yolfi', 'Manual API']) {
      expect(within(process).getByText(name)).toBeInTheDocument();
    }
    expect(within(process).getByText('All sources connected')).toBeInTheDocument();

    const provider = container.querySelector('.lp-process-provider') as HTMLElement;
    expect(provider.querySelectorAll('.lp-step-provider')).toHaveLength(6);
    expect(provider.querySelectorAll('.lp-process-web path')).toHaveLength(5);
    expect(provider.querySelector('.lp-process-web')).toHaveAttribute('aria-hidden', 'true');
  });

  test('renders the revenue header, rows, and accessible final figures', () => {
    const { container } = render(<BuildProcess />);
    const process = processRegion();

    expect(within(process).getByText('Revenue by source')).toBeInTheDocument();
    expect(within(process).getByText('Sample')).toBeInTheDocument();
    expect(within(process).getByText('This month')).toBeInTheDocument();
    for (const label of ['Organic / Google', 'Direct', 'Product Hunt']) {
      expect(within(process).getByText(label)).toBeInTheDocument();
    }

    const revenue = container.querySelector('.lp-process-revenue') as HTMLElement;
    for (const value of ['$7,540', '$4,280', '$2,140', '$1,120']) {
      expect(within(revenue).getByText(value, { selector: '.sr-only' })).toBeInTheDocument();
    }
    expect(revenue.querySelectorAll('.lp-process-bar-fill')).toHaveLength(3);
  });

  test('extraction keeps all three card shells and their detail copy', () => {
    const { container } = render(<BuildProcess />);
    const process = processRegion();

    expect(container.querySelectorAll('.lp-process-card')).toHaveLength(3);
    expect(container.querySelectorAll('.lp-step-figure')).toHaveLength(3);
    for (const copy of [
      "One lightweight script. That's all it takes.",
      'Connect Stripe, Dodo, Lemon Squeezy, Polar, or your own payment API.',
      'Discover which channels and landing pages actually generate revenue.',
    ]) {
      expect(within(process).getByText(copy)).toBeInTheDocument();
    }
  });

  test('count-up waits for the plate beat, then finishes in one finite rAF chain', () => {
    const frames: FrameRequestCallback[] = [];
    const cancelled: number[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      cancelled.push(id);
    });

    try {
      const { result, unmount } = renderHook(() => useCountUp(1000, true, false, 400));

      expect(result.current).toBe(0);
      act(() => {
        frames[0]?.(1000);
      });
      expect(result.current).toBe(0);
      act(() => {
        frames[1]?.(1300);
      });
      expect(result.current).toBe(0);
      act(() => {
        frames[2]?.(1750);
      });
      expect(result.current).toBe(772);
      act(() => {
        frames[3]?.(2300);
      });
      expect(result.current).toBe(1000);
      expect(frames).toHaveLength(4);

      unmount();
      expect(cancelled).toContain(4);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('count-up returns the target immediately under reduced motion', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    try {
      const { result } = renderHook(() => useCountUp(7540, true, true, 440));
      expect(result.current).toBe(7540);
      expect(frames).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
