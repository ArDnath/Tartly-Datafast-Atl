import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { WebsiteHeader } from './WebsiteHeader';

const websiteState = vi.hoisted(() => ({
  canUpdate: true,
}));

vi.mock('@/components/hooks', async () => {
  const actual = await vi.importActual<any>('@/components/hooks');

  return {
    ...actual,
    useNavigation: () => ({
      pathname: '/app/website-id',
      renderUrl: (path: string) => path,
      router: { push: vi.fn() },
    }),
  };
});

vi.mock('@/features/websites/hooks/useWebsite', () => ({
  useWebsite: () => ({
    id: 'website-id',
    name: 'Example',
    domain: 'example.com',
    access: { canUpdate: websiteState.canUpdate },
  }),
}));

vi.mock('@/features/websites/components/WebsiteSelect', () => ({
  WebsiteSelect: () => <div data-test="website-select" />,
}));

vi.mock('@/features/analytics/components/input/FilterBar', () => ({ FilterBar: () => null }));
vi.mock('@/features/analytics/components/input/UnitFilter', () => ({ UnitFilter: () => null }));
vi.mock('@/features/analytics/components/input/WebsiteDateFilter', () => ({
  WebsiteDateFilter: () => null,
}));
vi.mock('@/features/analytics/components/input/WebsiteFilterButton', () => ({
  WebsiteFilterButton: () => null,
}));
vi.mock('@/features/analytics/components/metrics/ActiveUsers', () => ({ ActiveUsers: () => null }));

beforeEach(() => {
  websiteState.canUpdate = true;
});

test('website header exposes the settings shortcut as a quiet control', () => {
  render(<WebsiteHeader showActions />, { route: '/app/website-id' });

  const settingsLink = screen.getByRole('link', { name: 'Settings' });

  expect(settingsLink).toHaveAttribute('href', '/app/website-id/settings');
  expect(settingsLink).toHaveClass('site-settings-button');
  expect(screen.queryByText('Edit')).not.toBeInTheDocument();
});

test('website header hides Settings when the user cannot update the website', () => {
  websiteState.canUpdate = false;

  render(<WebsiteHeader showActions />, { route: '/app/website-id' });

  expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
});
