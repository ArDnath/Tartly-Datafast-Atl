import { expect, test } from 'vitest';
import { render, screen } from '@/test/render';
import { AppLogoutButton } from './AppLogoutButton';

test('the app shell has one fixed logout control in the bottom-left', () => {
  render(<AppLogoutButton />, { route: '/app' });

  const logout = screen.getByRole('link', { name: 'Logout' });

  expect(logout).toHaveAttribute('href', '/logout');
  expect(logout).toHaveClass('app-logout');
  expect(logout).toHaveTextContent('Logout');
});
