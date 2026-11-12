import { expect, test } from 'vitest';
import { detectInstallHost } from './install-host';

function headers(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, [value]]));
}

test('detects Vercel from x-vercel-id', () => {
  expect(detectInstallHost(headers({ 'x-vercel-id': 'iad1::abc' })).id).toBe('vercel');
});

test('detects Netlify from x-nf-request-id', () => {
  expect(detectInstallHost(headers({ 'x-nf-request-id': 'abc' })).id).toBe('netlify');
});

test('detects Cloudflare from cf-ray', () => {
  expect(detectInstallHost(headers({ 'cf-ray': 'abc' })).id).toBe('cloudflare');
});

test('detects Next.js from x-powered-by', () => {
  expect(detectInstallHost(headers({ 'x-powered-by': 'Next.js' })).id).toBe('nextjs');
});

test('detects Next.js from __NEXT_DATA__ and /_next/', () => {
  expect(detectInstallHost({}, '<script id="__NEXT_DATA__"></script>').id).toBe('nextjs');
  expect(detectInstallHost({}, '<link href="/_next/static/app.css">').id).toBe('nextjs');
});

test('prefers Next.js over Vercel when both markers are present', () => {
  const host = detectInstallHost(
    headers({ 'x-vercel-id': 'iad1::abc', 'x-powered-by': 'Next.js' }),
  );

  expect(host.id).toBe('nextjs');
  expect(host.confidence).toBe('high');
});

test('detects Shopify and WordPress', () => {
  expect(detectInstallHost(headers({ 'x-shopid': '123' })).id).toBe('shopify');
  expect(detectInstallHost(headers({ 'x-shopify-stage': 'production' })).id).toBe('shopify');
  expect(detectInstallHost({}, '<link href="/wp-content/themes/site/style.css">').id).toBe(
    'wordpress',
  );
  expect(detectInstallHost({}, 'window.wpJson = "/wp-json/";').id).toBe('wordpress');
});

test('returns unknown with low confidence rather than guessing', () => {
  const host = detectInstallHost(headers({ server: 'nginx' }));

  expect(host.id).toBe('unknown');
  expect(host.confidence).toBe('low');
});
