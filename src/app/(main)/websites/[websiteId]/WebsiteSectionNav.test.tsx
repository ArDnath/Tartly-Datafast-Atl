import { expect, test } from 'vitest';
import { render, screen } from '@/test/render';
import { isSupportedAppPath } from '@/lib/app-route';
import { getWebsiteNavSections, WebsiteSectionNav } from './WebsiteSectionNav';

const WEBSITE_ID = '68c54a74-2d16-4e8b-b4a0-6d40c9f7eaa1';

test('every website navigation destination is an allowed app route', () => {
  const sections = getWebsiteNavSections(WEBSITE_ID);

  expect(sections.length).toBeGreaterThan(0);

  for (const item of sections.flatMap(section => section.items)) {
    expect(isSupportedAppPath(item.path), item.path).toBe(true);
  }
});

test('website navigation ids and paths are unique', () => {
  const items = getWebsiteNavSections(WEBSITE_ID).flatMap(section => section.items);

  expect(new Set(items.map(item => item.id)).size).toBe(items.length);
  expect(new Set(items.map(item => item.path)).size).toBe(items.length);
});

test('revenue surfaces are grouped before traffic surfaces', () => {
  const sections = getWebsiteNavSections(WEBSITE_ID);

  expect(sections[0].label).toBe('Revenue');
  expect(sections[1].label).toBe('Audience');
  expect(sections[0].items.map(item => item.id)).toEqual([
    'overview',
    'revenue',
    'attribution',
    'journeys',
    'diagnostics',
  ]);
});

test('the active section is exposed to assistive technology', () => {
  render(<WebsiteSectionNav websiteId={WEBSITE_ID} />, {
    route: `/app/${WEBSITE_ID}/revenue`,
  });

  expect(screen.getByRole('link', { name: 'Revenue' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
});
