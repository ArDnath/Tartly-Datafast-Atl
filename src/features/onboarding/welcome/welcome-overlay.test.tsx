import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { WelcomeOverlay } from './welcome-overlay';

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

afterEach(() => {
  vi.useRealTimers();
});

test('renders the ported welcome title and signed-in person chip', () => {
  render(
    <WelcomeOverlay
      isVisible
      isLeaving={false}
      userName="Ari"
      userImage={null}
      onAutoLeave={() => {}}
      onTeardown={() => {}}
    />,
  );

  expect(screen.getByRole('status', { name: 'Welcome to Tartly' })).toBeInTheDocument();
  expect(screen.getByText('Welcome')).toBeInTheDocument();
  expect(screen.getByText('Tartly')).toBeInTheDocument();
  expect(screen.getByText('Ari')).toBeInTheDocument();
});

test('holds for the reference duration and then leaves', () => {
  vi.useFakeTimers();
  const onAutoLeave = vi.fn();

  render(
    <WelcomeOverlay
      isVisible
      isLeaving={false}
      userName="Ari"
      userImage={null}
      onAutoLeave={onAutoLeave}
      onTeardown={() => {}}
    />,
  );

  act(() => {
    vi.advanceTimersByTime(2899);
  });
  expect(onAutoLeave).not.toHaveBeenCalled();

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(onAutoLeave).toHaveBeenCalledTimes(1);
});

test('tears down after the leaving animation', () => {
  vi.useFakeTimers();
  const onTeardown = vi.fn();

  render(
    <WelcomeOverlay
      isVisible
      isLeaving
      userName="Ari"
      userImage={null}
      onAutoLeave={() => {}}
      onTeardown={onTeardown}
    />,
  );

  act(() => {
    vi.advanceTimersByTime(1100);
  });

  expect(onTeardown).toHaveBeenCalledTimes(1);
});
