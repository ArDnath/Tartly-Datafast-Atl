import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import StarBorder from './StarBorder';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

describe('StarBorder', () => {
  test('renders the requested element with a decorative light canvas', () => {
    const { container } = render(
      <StarBorder as="div" radius={9999} theme="light">
        First + last touch
      </StarBorder>,
    );

    expect(screen.getByText('First + last touch')).toBeInTheDocument();
    expect(container.firstElementChild?.tagName).toBe('DIV');

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });
});
