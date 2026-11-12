import { expect, test } from 'vitest';
import {
  FIRST_PARTY_BASE_PATH,
  FIRST_PARTY_GUIDES,
  getFirstPartyGuideForHost,
  getInstallGuide,
  getInstallSnippet,
  INSTALL_GUIDES,
  INSTALL_TROUBLESHOOTING,
  STANDARD_GUIDES,
} from './install-guides';

const context = {
  websiteId: '50f07dc0-ea8f-4d75-9ddd-b074922b3681',
  domain: 'example.com',
  hostUrl: 'https://analytics.example.com',
};

test('install guides cover the documented frameworks with unique slugs', () => {
  expect(STANDARD_GUIDES.map(guide => guide.slug).sort()).toEqual([
    'astro',
    'html',
    'nextjs',
    'other',
    'react',
    'remix',
    'vite',
  ]);
  expect(FIRST_PARTY_GUIDES.map(guide => guide.slug).sort()).toEqual([
    'cloudflare-first-party',
    'netlify-first-party',
    'nextjs-first-party',
    'vercel-first-party',
  ]);

  const slugs = INSTALL_GUIDES.map(guide => guide.slug);
  expect(new Set(slugs).size).toBe(slugs.length);

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

test('keeps the no-code guide as the last standard option', () => {
  expect(STANDARD_GUIDES[STANDARD_GUIDES.length - 1]?.slug).toBe('other');
});

test('every standard snippet contains the real tracker contract', () => {
  for (const guide of STANDARD_GUIDES) {
    const code = getInstallSnippet(guide, context);

    expect(code).toContain('https://analytics.example.com/script.js');
    expect(code).toContain(`data-website-id="${context.websiteId}"`);
    expect(code).toContain('data-domain="example.com"');
    expect(code).not.toContain('data-host-url');
    expect(code).not.toContain('{{');
  }
});

test('the snippet omits the domain attribute when no domain is supplied', () => {
  const code = getInstallSnippet('html', { websiteId: context.websiteId });

  expect(code).toContain('<script defer');
  expect(code).not.toContain('data-domain');
});

test('first-party snippets use the same-origin base path and no Tartly origin', () => {
  for (const guide of FIRST_PARTY_GUIDES) {
    const code = getInstallSnippet(guide, context);

    expect(code).toContain(`src="${FIRST_PARTY_BASE_PATH}/script.js"`);
    expect(code).toContain(`data-host-url="${FIRST_PARTY_BASE_PATH}"`);
    expect(code).toContain(`data-website-id="${context.websiteId}"`);
    expect(code).toContain('data-domain="example.com"');
    expect(code).not.toContain('tartly.in');
    expect(code).not.toContain('https://analytics.example.com');
  }
});

test('a standard guide can generate first-party output on request', () => {
  const code = getInstallSnippet('html', { ...context, mode: 'first-party' });

  expect(code).toContain('src="/_tartly/script.js"');
  expect(code).toContain('data-host-url="/_tartly"');
  expect(code).not.toContain('tartly.in');
});

test('a custom base path is normalized', () => {
  const code = getInstallSnippet('html', {
    ...context,
    mode: 'first-party',
    basePath: '/_analytics/',
  });

  expect(code).toContain('src="/_analytics/script.js"');
  expect(code).toContain('data-host-url="/_analytics"');
});

test('unknown guide slugs fail loudly instead of rendering an empty snippet', () => {
  expect(getInstallGuide('unknown')).toBeUndefined();
  expect(() => getInstallSnippet('unknown', context)).toThrow(/Unknown install guide/);
});

test('troubleshooting covers the documented failure modes and links the first-party guide', () => {
  const titles = INSTALL_TROUBLESHOOTING.map(item => item.title).join(' ');

  expect(titles).toMatch(/No events/);
  expect(titles).toMatch(/security policy/);
  expect(titles).toMatch(/Domain mismatch/);
  expect(titles).toMatch(/Single-page/);

  const securityPolicy = INSTALL_TROUBLESHOOTING.find(item =>
    item.title.includes('security policy'),
  );

  expect(securityPolicy?.detail).toMatch(/first-party/i);
  expect(securityPolicy?.href).toBe('/docs/install#strict-security-policy');
});

test('each first-party guide includes proxy files, exact paths, and both notes', () => {
  for (const guide of FIRST_PARTY_GUIDES) {
    expect(guide.mode).toBe('first-party');
    expect(guide.firstParty).toBeDefined();
    expect(guide.firstParty?.files.length).toBeGreaterThan(0);
    expect(guide.firstParty?.snippetPath.length).toBeGreaterThan(0);
    expect(guide.firstParty?.policyNote).toMatch(/no security-policy change/i);
    expect(guide.firstParty?.cookiesNote).toMatch(/cookies/i);
    expect(guide.firstParty?.cookiesNote).toMatch(/not forwarded|does not forward/i);

    for (const file of guide.firstParty?.files || []) {
      expect(file.path.length).toBeGreaterThan(0);
      expect(file.code.length).toBeGreaterThan(0);
      expect(file.code).not.toContain(context.websiteId);
    }
  }
});

test('proxy templates enforce the path and method allowlists', () => {
  for (const guide of FIRST_PARTY_GUIDES) {
    for (const file of guide.firstParty?.files || []) {
      if (!file.path.endsWith('.ts')) {
        continue;
      }

      expect(file.code).toContain('script.js');
      expect(file.code).toContain('recorder.js');
      expect(file.code).toContain('api/send');
      expect(file.code).toContain('api/batch');
      expect(file.code).toContain('api/record');
      expect(file.code).toContain('api/heartbeat');
      expect(file.code).toContain('404');
      expect(file.code).toContain('405');
      expect(file.code).toContain('413');
      expect(file.code).toContain('502');
      expect(file.code).toContain('10_000');
      expect(file.code).toContain('1_000_000');
      expect(file.code).toContain('10_000_000');
    }
  }
});

test('proxy templates strip cookies and authorization but forward operational headers', () => {
  for (const guide of FIRST_PARTY_GUIDES) {
    for (const file of guide.firstParty?.files || []) {
      if (!file.path.endsWith('.ts')) {
        continue;
      }

      expect(file.code).not.toMatch(/headers\.get\(['"]cookie['"]\)/i);
      expect(file.code).not.toMatch(/headers\.set\(['"]cookie['"]/i);
      expect(file.code).not.toMatch(/headers\.get\(['"]authorization['"]\)/i);
      expect(file.code).not.toMatch(/headers\.set\(['"]authorization['"]/i);
      expect(file.code).not.toMatch(/request\.headers\[['"]cookie['"]\]/i);
      expect(file.code).not.toMatch(/request\.headers\[['"]authorization['"]\]/i);
      expect(file.code).not.toMatch(/headers\[['"]cookie['"]\]/i);
      expect(file.code).not.toMatch(/headers\[['"]authorization['"]\]/i);
      expect(file.code).not.toMatch(/set-cookie['"]?\s*,/i);

      expect(file.code).toContain('x-forwarded-for');
      expect(file.code).toContain('user-agent');
      expect(file.code).toContain('x-talivia-cache');
    }
  }
});

test('the host map selects the matching first-party guide', () => {
  expect(getFirstPartyGuideForHost('nextjs').slug).toBe('nextjs-first-party');
  expect(getFirstPartyGuideForHost('vercel').slug).toBe('vercel-first-party');
  expect(getFirstPartyGuideForHost('netlify').slug).toBe('netlify-first-party');
  expect(getFirstPartyGuideForHost('cloudflare').slug).toBe('cloudflare-first-party');
  expect(getFirstPartyGuideForHost('unknown').slug).toBe('nextjs-first-party');
});
