import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { TrackerStep } from './TrackerStep';

const apiGet = vi.hoisted(() => vi.fn());

vi.mock('@/components/hooks', () => ({
  useApi: () => ({ get: apiGet }),
}));

const verifyState = { installed: false, eventCount: 0, lastEventAt: null };

function standardPreflight(overrides: Record<string, any> = {}) {
  return {
    reachable: true,
    checkedUrl: 'https://acme.com/',
    reason: 'ok',
    csp: {
      present: false,
      reportOnly: false,
      scriptBlocked: false,
      connectBlocked: false,
      strictDynamic: false,
      currentHeaders: [],
      suggestedHeaders: [],
    },
    host: { id: 'nextjs', label: 'Next.js', confidence: 'high' },
    firstParty: {
      basePath: '/_tartly',
      scriptUrl: 'https://acme.com/_tartly/script.js',
      installed: null,
    },
    recommendedMode: 'standard',
    ...overrides,
  };
}

const firstPartyPreflight = standardPreflight({
  csp: {
    present: true,
    reportOnly: false,
    scriptBlocked: true,
    connectBlocked: true,
    strictDynamic: false,
    currentHeaders: ["script-src 'self'; connect-src 'self'"],
    suggestedHeaders: ["script-src 'self' https://tartly.in; connect-src 'self' https://tartly.in"],
  },
  recommendedMode: 'first-party',
});

let preflight = standardPreflight();

beforeEach(() => {
  preflight = standardPreflight();
  apiGet.mockReset();
  apiGet.mockImplementation((url: string) => {
    if (url.endsWith('/onboarding/preflight')) {
      return Promise.resolve(preflight);
    }

    return Promise.resolve(verifyState);
  });
});

function renderStep() {
  return render(
    <TrackerStep
      website={{ id: 'website-1', domain: 'acme.com' }}
      onContinue={() => {}}
      onBack={() => {}}
    />,
  );
}

test('renders the tracker snippet and live verification state', async () => {
  renderStep();

  expect(screen.getByRole('heading', { name: 'Install the tracker' })).toBeInTheDocument();
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();
  expect(screen.getByText('Waiting for the first event')).toBeInTheDocument();

  await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/websites/website-1/onboarding/verify'));
});

test('auto-selects the detected framework guide', async () => {
  renderStep();

  expect(await screen.findByText(/import Script from 'next\/script'/)).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Next.js', selected: true })).toBeInTheDocument();
  expect(screen.getByText(/Detected Next\.js/)).toBeInTheDocument();
});

test('offers an AI agent prompt next to the manual snippet', async () => {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText');

  renderStep();

  await screen.findByText(/import Script from 'next\/script'/);
  await user.click(screen.getByRole('button', { name: 'Use an AI agent' }));

  expect(screen.getByText('AI agent prompt')).toBeInTheDocument();
  expect(
    screen.getByText(/Do not remove, weaken, or disable any Content-Security-Policy/),
  ).toBeInTheDocument();
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Copy agent prompt' }));

  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# Install Tartly analytics'));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('app/layout.tsx'));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('data-website-id="website-1"'));
});

test('switches framework guides and continues without a verified event', async () => {
  const user = userEvent.setup();
  const onContinue = vi.fn();

  render(
    <TrackerStep
      website={{ id: 'website-1', domain: 'acme.com' }}
      onContinue={onContinue}
      onBack={() => {}}
    />,
  );

  await user.click(screen.getByRole('tab', { name: 'Next.js' }));
  expect(screen.getByText(/import Script from 'next\/script'/)).toBeInTheDocument();

  await user.click(screen.getByRole('tab', { name: 'Other / No-code' }));
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();
  expect(screen.queryByText(/import Script from 'next\/script'/)).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(onContinue).toHaveBeenCalled();
});

test('shows the standard install and no policy jargon when no CSP blocks it', async () => {
  renderStep();

  await screen.findByText('No security-policy changes needed.');
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();
  expect(screen.queryByText(/data-host-url/)).not.toBeInTheDocument();
  expect(screen.queryByText(/CSP|Content-Security-Policy/i)).not.toBeInTheDocument();
});

test('recommends the first-party install when the site blocks third-party scripts', async () => {
  preflight = firstPartyPreflight;
  renderStep();

  expect(
    await screen.findByRole('heading', { name: 'Your site blocks third-party scripts.' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Tartly runs from your own domain/)).toBeInTheDocument();
  expect(screen.getByText('No security-policy changes.')).toBeInTheDocument();
  expect(screen.getByText(/data-host-url="\/_tartly"/)).toBeInTheDocument();
  expect(screen.getByText(/TARTLY_ORIGIN = 'https:\/\/tartly.in'/)).toBeInTheDocument();

  // The detected host auto-selects the Next.js route handler.
  expect(screen.getByText('app/%5Ftartly/[...path]/route.ts')).toBeInTheDocument();
});

test('falls back to the standard install when the site cannot be inspected', async () => {
  preflight = standardPreflight({
    reachable: false,
    reason: 'unreachable',
    host: { id: 'unknown', label: 'Unknown host', confidence: 'low' },
  });
  renderStep();

  expect(
    await screen.findByText(/couldn’t inspect your site\. Install normally/),
  ).toBeInTheDocument();
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();
  expect(screen.queryByText(/data-host-url/)).not.toBeInTheDocument();
});

test('shows a subtle checking state while keeping the snippet usable', async () => {
  let resolvePreflight: (value: unknown) => void = () => {};
  const pending = new Promise(resolve => {
    resolvePreflight = resolve;
  });

  apiGet.mockImplementation((url: string) => {
    if (url.endsWith('/onboarding/preflight')) {
      return pending;
    }

    return Promise.resolve(verifyState);
  });

  renderStep();

  expect(screen.getByText('Checking your site…')).toBeInTheDocument();
  expect(screen.getByText(/data-website-id="website-1"/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy snippet' })).toBeEnabled();

  resolvePreflight(standardPreflight());
  await screen.findByText('No security-policy changes needed.');
});

test('respects a manual switch to standard across a re-check', async () => {
  preflight = firstPartyPreflight;
  const user = userEvent.setup();
  renderStep();

  await screen.findByRole('heading', { name: 'Your site blocks third-party scripts.' });
  expect(screen.getByText(/data-host-url="\/_tartly"/)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Use the standard install instead' }));
  expect(screen.queryByText(/data-host-url/)).not.toBeInTheDocument();
  expect(screen.getByText(/The standard install may not send events/)).toBeInTheDocument();

  const preflightCalls = apiGet.mock.calls.filter(call => String(call[0]).endsWith('/preflight'));
  await user.click(screen.getByRole('button', { name: 'Re-check' }));

  await waitFor(() => {
    const currentCalls = apiGet.mock.calls.filter(call => String(call[0]).endsWith('/preflight'));
    expect(currentCalls.length).toBeGreaterThan(preflightCalls.length);
  });

  expect(screen.queryByText(/data-host-url/)).not.toBeInTheDocument();
});

test('copies the proxy file, snippet, and diagnostic', async () => {
  preflight = firstPartyPreflight;
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText');
  renderStep();

  await screen.findByRole('heading', { name: 'Your site blocks third-party scripts.' });

  await user.click(screen.getByRole('button', { name: 'Copy proxy route' }));
  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining("TARTLY_ORIGIN = 'https://tartly.in'"),
  );

  await user.click(screen.getByRole('button', { name: 'Copy snippet' }));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('src="/_tartly/script.js"'));

  await user.click(screen.getByRole('button', { name: 'Copy diagnostic' }));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Website: https://acme.com'));
  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining('Current install mode: first-party'),
  );
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Detected host: Next.js'));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Security policy headers:'));
  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining("script-src 'self' https://tartly.in"),
  );
});
