import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/render';
import { WebsiteTrackingCode } from './WebsiteTrackingCode';

const websiteId = '50f07dc0-ea8f-4d75-9ddd-b074922b3681';
const apiGet = vi.hoisted(() => vi.fn());
const { attributionSettings } = vi.hoisted(() => ({
  attributionSettings: {
    enableCrossDomainTracking: true,
    domains: [{ hostname: 'app.example.com' }, { hostname: 'checkout.example.net' }],
  },
}));

vi.mock('@/components/hooks', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/hooks')>();

  return {
    ...actual,
    useApi: () => ({ get: apiGet }),
  };
});

vi.mock('@/features/websites/hooks/useWebsiteQuery', () => ({
  useWebsiteQuery: () => ({ data: { id: websiteId, domain: 'example.com' } }),
}));

vi.mock('@/features/websites/hooks/useWebsiteAttributionSettingsQuery', () => ({
  useWebsiteAttributionSettingsQuery: () => ({
    data: attributionSettings,
  }),
}));

function standardPreflight(overrides: Record<string, any> = {}) {
  return {
    reachable: true,
    checkedUrl: 'https://example.com/',
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
      scriptUrl: 'https://example.com/_tartly/script.js',
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

async function renderSettings() {
  apiGet.mockImplementation((url: string) => {
    if (url.endsWith('/onboarding/preflight')) {
      return Promise.resolve(firstPartyPreflight);
    }

    return Promise.resolve({ installed: false });
  });

  return render(<WebsiteTrackingCode websiteId={websiteId} hostUrl="https://talivia.test" />);
}

test('generates a tracker snippet with shared and cross-domain identity settings', async () => {
  apiGet.mockResolvedValue(standardPreflight());

  render(<WebsiteTrackingCode websiteId={websiteId} hostUrl="https://talivia.test" />);

  expect(screen.getByRole('textbox')).toHaveValue(
    `<script defer src="https://talivia.test/script.js" data-website-id="${websiteId}" data-domain="example.com" data-cross-domain-domains="example.com,app.example.com,checkout.example.net"></script>`,
  );

  await waitFor(() =>
    expect(apiGet).toHaveBeenCalledWith(`/websites/${websiteId}/onboarding/preflight`),
  );
});

test('shows the first-party install and reuses the guide text in settings', async () => {
  await renderSettings();

  expect(
    await screen.findByRole('heading', { name: 'Your site blocks third-party scripts.' }),
  ).toBeInTheDocument();
  expect(screen.getByText('No security-policy changes.')).toBeInTheDocument();
  expect(
    screen.getByText(
      'No security-policy change is needed: the script and its events stay on your own domain.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'The proxy does not forward cookies or authorization headers to the analytics service.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('app/%5Ftartly/[...path]/route.ts')).toBeInTheDocument();

  const snippet = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(snippet.value).toContain('src="/_tartly/script.js"');
  expect(snippet.value).toContain('data-host-url="/_tartly"');
});

test('re-checks the install and copies a diagnostic', async () => {
  await renderSettings();

  await screen.findByRole('heading', { name: 'Your site blocks third-party scripts.' });
  const before = apiGet.mock.calls.filter(call => String(call[0]).endsWith('/preflight')).length;
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText');

  await user.click(screen.getByRole('button', { name: 'Re-check install' }));

  await waitFor(() => {
    const after = apiGet.mock.calls.filter(call => String(call[0]).endsWith('/preflight')).length;
    expect(after).toBeGreaterThan(before);
  });

  await user.click(screen.getByRole('button', { name: 'Copy diagnostic' }));

  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Website: https://example.com'));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Detected host: Next.js'));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Security policy headers:'));
});

test('keeps the standard install when no policy blocks third-party scripts', async () => {
  apiGet.mockResolvedValue(standardPreflight());

  render(<WebsiteTrackingCode websiteId={websiteId} hostUrl="https://talivia.test" />);

  await screen.findByText('No security-policy changes needed.');
  expect(screen.queryByText(/CSP|Content-Security-Policy/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/data-host-url/)).not.toBeInTheDocument();
});
