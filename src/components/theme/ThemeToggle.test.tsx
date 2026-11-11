import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { render, screen } from '@/test/render';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.style.colorScheme = 'dark';
});

test('renders one toggle with identical markup regardless of the active theme', () => {
  const { container } = render(<ThemeToggle />);

  expect(screen.getByRole('button', { name: 'Toggle color theme' })).toBeInTheDocument();
  // Both glyphs are always in the DOM; CSS decides which one is visible so the
  // server and client trees never differ during hydration.
  expect(container.querySelectorAll('svg')).toHaveLength(2);
});

test('switches from dark to light and persists the choice', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);

  await user.click(screen.getByRole('button', { name: 'Toggle color theme' }));

  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
});

test('switches back to dark', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);

  await user.click(screen.getByRole('button', { name: 'Toggle color theme' }));
  await user.click(screen.getByRole('button', { name: 'Toggle color theme' }));

  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
});
