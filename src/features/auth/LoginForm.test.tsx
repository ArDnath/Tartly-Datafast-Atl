import { expect, test } from 'vitest';
import { render, screen } from '@/test/render';
import { LoginForm } from './LoginForm';

test('shows the larger Tartly lockup above a single Google sign-in action', () => {
  render(<LoginForm returnUrl="/app/revenue" />);

  const logo = screen.getByRole('img', { name: 'Tartly' });
  expect(logo).toHaveAttribute('width', '48');
  expect(logo).toHaveAttribute('height', '48');
  expect(screen.getByText('Tartly')).toBeInTheDocument();

  const button = screen.getByRole('link', { name: 'Continue with Google' });
  expect(button).toHaveAttribute('href', '/api/auth/google?returnUrl=%2Fapp%2Frevenue');
  expect(
    screen.getByText(
      'Use your Google account to sign in or create your Tartly workspace. No password needed.',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
});

test('sanitizes a return URL that points away from the app', () => {
  render(<LoginForm returnUrl="https://evil.example/phish" />);

  expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
    'href',
    '/api/auth/google?returnUrl=%2Fapp',
  );
});

test('shows a readable message when Google sign-in is cancelled', () => {
  render(<LoginForm errorCode="access-denied" />);

  expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in was cancelled.');
});

test('shows the APP_SECRET setup instruction returned by the API', () => {
  const error = Object.assign(new Error('Server error'), {
    message:
      'Tartly setup is incomplete: set APP_SECRET in .env to a random value of at least 32 bytes, then restart Tartly.',
  });

  render(<LoginForm initialError={error} />);

  expect(
    screen.getByText(
      'Tartly setup is incomplete: set APP_SECRET in .env to a random value of at least 32 bytes, then restart Tartly.',
    ),
  ).toBeInTheDocument();
});
