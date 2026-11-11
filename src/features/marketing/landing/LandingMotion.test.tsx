import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { LandingMotion } from './LandingMotion';
import { Reveal } from './motion/Reveal';
import { WordReveal } from './motion/WordReveal';
import { TaglineReveal } from './sections/TaglineReveal';

function withReducedMotion(run: () => void) {
  const original = window.matchMedia;

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  try {
    run();
  } finally {
    window.matchMedia = original;
  }
}

describe('landing motion', () => {
  test('renders the tagline as one word per span for the scroll reveal', () => {
    render(<TaglineReveal />);

    expect(
      screen.getByRole('heading', {
        name: /Traffic is a vanity metric\. Revenue is the signal that tells you where to spend next\./i,
      }),
    ).toBeInTheDocument();

    // 16 words in the statement, each with its own reveal span.
    expect(document.querySelectorAll('.lp-word')).toHaveLength(16);
  });

  test('marks the root motion-ready and keeps reveal targets in the document', () => {
    render(
      <div className="landing-root">
        <LandingMotion />
        <Reveal>Reveal me</Reveal>
      </div>,
    );

    expect(document.querySelector('.landing-root')).toHaveAttribute('data-motion', 'on');
    expect(screen.getByText('Reveal me').closest('[data-reveal]')).toBeInTheDocument();
  });

  test('shows the final tagline and skips motion when the visitor asks for reduced motion', () => {
    withReducedMotion(() => {
      render(
        <div className="landing-root">
          <LandingMotion />
          <WordReveal text="One two three" />
        </div>,
      );

      expect(document.querySelector('.landing-root')).toHaveAttribute('data-motion', 'off');
      expect(document.querySelectorAll('.lp-word[data-active="true"]')).toHaveLength(3);
    });
  });
});
