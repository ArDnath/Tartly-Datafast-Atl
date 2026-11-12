import { expect, test } from 'vitest';
import {
  analyzeCsp,
  extractMetaCsp,
  parseCspPolicy,
  sourceListDecision,
  sourceMatches,
  suggestCspHeader,
} from './csp';

const TARTLY_SCRIPT = new URL('https://tartly.in/script.js');
const TARTLY_CONNECT = new URL('https://tartly.in/api/send');

function analyze(value: string | string[], html?: string) {
  return analyzeCsp(
    {
      'content-security-policy': Array.isArray(value) ? value : [value],
    },
    html,
  );
}

test('no CSP does not block and suggests no change', () => {
  const analysis = analyzeCsp({});

  expect(analysis.present).toBe(false);
  expect(analysis.reportOnly).toBe(false);
  expect(analysis.scriptBlocked).toBe(false);
  expect(analysis.connectBlocked).toBe(false);
  expect(analysis.suggestedHeaders).toEqual([]);
});

test('report-only CSP is not treated as a blocker', () => {
  const analysis = analyzeCsp({
    'content-security-policy-report-only': ["default-src 'self'"],
  });

  expect(analysis.present).toBe(true);
  expect(analysis.reportOnly).toBe(true);
  expect(analysis.scriptBlocked).toBe(false);
  expect(analysis.connectBlocked).toBe(false);
  expect(analysis.suggestedHeaders).toEqual([]);
});

test("default-src 'self' blocks script and connect through the fallback", () => {
  const analysis = analyze("default-src 'self'");

  expect(analysis.scriptBlocked).toBe(true);
  expect(analysis.connectBlocked).toBe(true);
  expect(analysis.suggestedHeaders).toEqual(["default-src 'self' https://tartly.in"]);
});

test("script-src and connect-src 'self' block both targets independently", () => {
  const analysis = analyze("script-src 'self'; connect-src 'self'");

  expect(analysis.scriptBlocked).toBe(true);
  expect(analysis.connectBlocked).toBe(true);
  expect(analysis.suggestedHeaders).toEqual([
    "script-src 'self' https://tartly.in; connect-src 'self' https://tartly.in",
  ]);
});

test('an exact host source allows the tracker', () => {
  const analysis = analyze('script-src https://tartly.in; connect-src https://tartly.in');

  expect(analysis.scriptBlocked).toBe(false);
  expect(analysis.connectBlocked).toBe(false);
  expect(analysis.suggestedHeaders).toEqual([]);
});

test('a wildcard host source allows subdomains', () => {
  const analysis = analyzeCsp(
    { 'content-security-policy': ['script-src https://*.tartly.in'] },
    null,
    {
      scriptUrl: 'https://app.tartly.in/script.js',
      connectUrl: 'https://app.tartly.in/api/send',
    },
  );

  expect(analysis.scriptBlocked).toBe(false);
  expect(analysis.connectBlocked).toBe(false);
});

test('a scheme source allows every https host', () => {
  const analysis = analyze('script-src https:; connect-src https:');

  expect(analysis.scriptBlocked).toBe(false);
  expect(analysis.connectBlocked).toBe(false);
});

test('a bare wildcard allows the https tracker', () => {
  const analysis = analyze('default-src *');

  expect(analysis.scriptBlocked).toBe(false);
  expect(analysis.connectBlocked).toBe(false);
});

test("'none' blocks and is preserved in the suggested header", () => {
  const analysis = analyze("script-src 'none'; connect-src 'none'");

  expect(analysis.scriptBlocked).toBe(true);
  expect(analysis.connectBlocked).toBe(true);
  expect(analysis.suggestedHeaders).toEqual([
    "script-src 'none' https://tartly.in; connect-src 'none' https://tartly.in",
  ]);
});

test('multiple enforced headers intersect and a single block wins', () => {
  const analysis = analyze([
    'script-src https://tartly.in; connect-src https://tartly.in',
    "script-src 'self'; connect-src https://tartly.in",
  ]);

  expect(analysis.scriptBlocked).toBe(true);
  expect(analysis.connectBlocked).toBe(false);
  expect(analysis.suggestedHeaders).toEqual([
    "script-src 'self' https://tartly.in; connect-src https://tartly.in",
  ]);
});

test('meta CSP is enforced alongside headers', () => {
  const html = `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'"></head><body></body></html>`;
  const analysis = analyzeCsp({}, html);

  expect(analysis.present).toBe(true);
  expect(analysis.scriptBlocked).toBe(true);
  expect(analysis.connectBlocked).toBe(true);
});

test('meta CSP accepts single quotes and attribute reordering', () => {
  const html = `<meta content="script-src 'self'" http-equiv='content-security-policy'>`;
  expect(extractMetaCsp(html)).toEqual(["script-src 'self'"]);
});

test('meta CSP entity decoding is single-pass and does not double-unescape', () => {
  const html = `<meta http-equiv="Content-Security-Policy" content="script-src &amp;quot;self&amp;quot;">`;

  expect(extractMetaCsp(html)).toEqual(['script-src &quot;self&quot;']);
});

test('script-src-elem overrides script-src for script elements', () => {
  const analysis = analyze(
    "script-src https://tartly.in; script-src-elem 'self'; connect-src https://tartly.in",
  );

  expect(analysis.scriptBlocked).toBe(true);
  expect(analysis.suggestedHeaders).toEqual([
    "script-src https://tartly.in; script-src-elem 'self' https://tartly.in; connect-src https://tartly.in",
  ]);
});

test('strict-dynamic is reported and still counts as a script block', () => {
  const analysis = analyze(
    "script-src 'self' 'strict-dynamic' 'nonce-abc'; connect-src https://tartly.in",
  );

  expect(analysis.strictDynamic).toBe(true);
  expect(analysis.scriptBlocked).toBe(true);
  expect(analysis.connectBlocked).toBe(false);
});

test('malformed headers return unknown instead of a false block', () => {
  const analysis = analyze("script-src 'self; connect-src 'self'");

  expect(analysis.unknown).toBe(true);
  expect(analysis.scriptBlocked).toBe(false);
  expect(analysis.connectBlocked).toBe(false);
  expect(analysis.suggestedHeaders).toEqual([]);
});

test('suggested header preserves every directive and source', () => {
  const analysis = analyze(
    "default-src 'self' https://cdn.example.com; img-src data: blob:; upgrade-insecure-requests",
  );

  expect(analysis.suggestedHeaders).toEqual([
    "default-src 'self' https://cdn.example.com https://tartly.in; img-src data: blob:; upgrade-insecure-requests",
  ]);
});

test('a source with a path must match the tracker path', () => {
  expect(
    sourceMatches('https://tartly.in/assets/', new URL('https://tartly.in/assets/app.js')),
  ).toBe(true);
  expect(sourceMatches('https://tartly.in/assets/', TARTLY_SCRIPT)).toBe(false);
  expect(sourceMatches('https://tartly.in/script.js', TARTLY_SCRIPT)).toBe(true);
  expect(sourceMatches('https://tartly.in/script.js', TARTLY_CONNECT)).toBe(false);
});

test('a source port must match the default port unless wildcarded', () => {
  expect(sourceMatches('https://tartly.in:443', TARTLY_SCRIPT)).toBe(true);
  expect(sourceMatches('https://tartly.in:8443', TARTLY_SCRIPT)).toBe(false);
  expect(sourceMatches('https://tartly.in:*', TARTLY_SCRIPT)).toBe(true);
});

test("'self' never allows the cross-origin Tartly host", () => {
  expect(sourceListDecision(["'self'"], TARTLY_SCRIPT)).toBe('blocked');
});

test('parser keeps the first duplicate directive like a browser', () => {
  const policy = parseCspPolicy("script-src 'self'; script-src https://tartly.in");

  expect(policy.directives['script-src']).toEqual(["'self'"]);
});

test('suggestCspHeader returns null when the policy already allows both targets', () => {
  const policy = parseCspPolicy('script-src https://tartly.in; connect-src https://tartly.in');

  expect(suggestCspHeader(policy)).toBeNull();
});
