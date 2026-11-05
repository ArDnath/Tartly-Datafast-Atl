import { expect, test } from 'vitest';
import { isSameOriginRequest } from './csrf';

function request(headers: Record<string, string>, method = 'POST') {
  return new Request('https://app.example.com/api/websites', {
    method,
    headers,
  });
}

test('accepts a matching Origin header', () => {
  expect(isSameOriginRequest(request({ origin: 'https://app.example.com' }))).toBe(true);
});

test('accepts a matching Referer when Origin is absent', () => {
  expect(isSameOriginRequest(request({ referer: 'https://app.example.com/app/website/1' }))).toBe(
    true,
  );
});

test('rejects a cross-site Origin', () => {
  expect(isSameOriginRequest(request({ origin: 'https://evil.example' }))).toBe(false);
});

test('rejects an unparseable Origin', () => {
  expect(isSameOriginRequest(request({ origin: 'not a url' }))).toBe(false);
});

test('allows non-browser callers with no Origin or Referer', () => {
  expect(isSameOriginRequest(request({}))).toBe(true);
});
