import { expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { WebsiteSettingsHeader } from './WebsiteSettingsHeader';

const websiteId = '50f07dc0-ea8f-4d75-9ddd-b074922b3681';

vi.mock('@/features/websites/hooks/useWebsite', () => ({
  useWebsite: () => ({
    id: websiteId,
    name: 'Taisly',
    domain: 'taisly.com',
  }),
}));

test('website settings back link returns to the website dashboard', () => {
  render(<WebsiteSettingsHeader />, {
    route: `/app/${websiteId}/settings`,
  });

  expect(screen.getByRole('link', { name: /website/i })).toHaveAttribute(
    'href',
    `/app/${websiteId}`,
  );
});
