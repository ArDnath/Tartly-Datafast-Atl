import { expect, test } from 'vitest';
import {
  getInstallGuide,
  getInstallSnippet,
  INSTALL_GUIDES,
  INSTALL_TROUBLESHOOTING,
} from './install-guides';

const context = {
  websiteId: '50f07dc0-ea8f-4d75-9ddd-b074922b3681',
  domain: 'example.com',
  hostUrl: 'https://analytics.example.com',
};

test('install guides cover the documented frameworks with unique slugs', () => {
  const slugs = INSTALL_GUIDES.map(guide => guide.slug).sort();

  expect(slugs).toEqual(['astro', 'html', 'nextjs', 'other', 'react', 'remix', 'vite']);

  for (const guide of INSTALL_GUIDES) {
    expect(guide.slug).toMatch(/^[a-z0-9-]+$/);
    expect(guide.title.length).toBeGreaterThan(0);
    expect(guide.summary.length).toBeGreaterThan(0);
    expect(guide.steps.length).toBeGreaterThan(0);
    expect(['tested', 'untested']).toContain(guide.status);

    if (guide.status === 'untested') {
      expect(guide.statusNote).toMatch(/not been run/i);
    }
  }
});

test('keeps the no-code guide as the last install option', () => {
  expect(INSTALL_GUIDES[INSTALL_GUIDES.length - 1]?.slug).toBe('other');
});

test('every generated snippet contains the real tracker contract', () => {
  for (const guide of INSTALL_GUIDES) {
    const code = getInstallSnippet(guide, context);

    expect(code).toContain('https://analytics.example.com/script.js');
    expect(code).toContain(`data-website-id="${context.websiteId}"`);
    expect(code).toContain('data-domain="example.com"');
    expect(code).not.toContain('{{');
  }
});

test('the snippet omits the domain attribute when no domain is supplied', () => {
  const code = getInstallSnippet('html', { websiteId: context.websiteId });

  expect(code).toContain('<script defer');
  expect(code).not.toContain('data-domain');
});

test('unknown guide slugs fail loudly instead of rendering an empty snippet', () => {
  expect(getInstallGuide('unknown')).toBeUndefined();
  expect(() => getInstallSnippet('unknown', context)).toThrow(/Unknown install guide/);
});

test('troubleshooting covers the documented failure modes', () => {
  const titles = INSTALL_TROUBLESHOOTING.map(item => item.title).join(' ');

  expect(titles).toMatch(/No events/);
  expect(titles).toMatch(/CSP/);
  expect(titles).toMatch(/Domain mismatch/);
  expect(titles).toMatch(/Single-page/);
});
