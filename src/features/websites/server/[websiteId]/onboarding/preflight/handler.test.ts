import { beforeEach, expect, test, vi } from 'vitest';
import { consumeRateLimit } from '@/lib/rate-limit';
import { parseRequest } from '@/lib/request';
import { unauthorized } from '@/lib/response';
import { safeFetch } from '@/lib/safe-fetch';
import { requireWebsiteAccess } from '@/lib/workspace-auth';
import { GET } from './handler';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/workspace-auth', () => ({
  requireWebsiteAccess: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: vi.fn(),
  rateLimitKey: (...parts: string[]) => parts.join(':'),
}));

const websiteFindFirst = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      website: {
        findFirst: websiteFindFirst,
      },
    },
  },
}));

vi.mock('@/lib/safe-fetch', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/safe-fetch')>();

  return {
    ...actual,
    safeFetch: vi.fn(),
  };
});

const websiteId = '50f07dc0-ea8f-4d75-9ddd-b074922b3681';
const workspaceId = 'a4b9f5e0-1d13-4f42-9f06-2ecd6f53d8df';

const siteResponse = (options: {
  status?: number;
  headers?: Record<string, string[]>;
  body?: string;
}) => ({
  ok: true,
  status: options.status ?? 200,
  headers: options.headers ?? {},
  body: options.body ?? '<html><head></head><body>ok</body></html>',
  finalUrl: 'https://example.com/',
});

function mockFetch({
  site = siteResponse({}),
  firstParty = { ok: true, status: 404, headers: {}, body: '' },
}: {
  site?: any;
  firstParty?: any;
} = {}) {
  vi.mocked(safeFetch).mockImplementation(async (url: string) => {
    if (url.includes('/_tartly/script.js')) {
      return firstParty;
    }

    return site;
  });
}

async function callHandler() {
  return GET(new Request(`https://tartly.in/api/websites/${websiteId}/onboarding/preflight`), {
    params: Promise.resolve({ websiteId }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    error: null,
  } as any);
  vi.mocked(requireWebsiteAccess).mockResolvedValue({
    workspaceId,
    websiteId,
    role: 'ADMIN',
    workspace: { id: workspaceId },
  } as any);
  vi.mocked(consumeRateLimit).mockResolvedValue({
    allowed: true,
    limit: 10,
    remaining: 9,
    retryAfterSeconds: 0,
  });
  websiteFindFirst.mockResolvedValue({
    id: websiteId,
    domain: 'example.com',
  } as any);
  mockFetch();
});

test('rejects an unauthenticated request', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: null,
    error: () => unauthorized(),
  } as any);

  const response = await callHandler();

  expect(response.status).toBe(401);
  expect(safeFetch).not.toHaveBeenCalled();
});

test('rejects a cross-tenant website ID', async () => {
  vi.mocked(requireWebsiteAccess).mockResolvedValue(null);

  const response = await callHandler();

  expect(response.status).toBe(401);
  expect(safeFetch).not.toHaveBeenCalled();
});

test('returns no-domain without fetching', async () => {
  websiteFindFirst.mockResolvedValue({
    id: websiteId,
    domain: null,
  } as any);

  const response = await callHandler();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.reason).toBe('no-domain');
  expect(body.recommendedMode).toBe('standard');
  expect(safeFetch).not.toHaveBeenCalled();
});

test('does not fetch localhost or a private address', async () => {
  websiteFindFirst.mockResolvedValue({
    id: websiteId,
    domain: 'http://127.0.0.1:3000',
  } as any);

  const response = await callHandler();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.reason).toBe('local');
  expect(safeFetch).not.toHaveBeenCalled();
});

test('returns unreachable for a network failure and a timeout', async () => {
  mockFetch({ site: { ok: false, reason: 'dns-failure' } });
  let response = await callHandler();
  let body = await response.json();

  expect(response.status).toBe(200);
  expect(body.reason).toBe('unreachable');
  expect(body.recommendedMode).toBe('standard');

  mockFetch({ site: { ok: false, reason: 'timeout' } });
  response = await callHandler();
  body = await response.json();

  expect(response.status).toBe(200);
  expect(body.reason).toBe('unreachable');
});

test('returns blocked-by-waf for a Cloudflare challenge', async () => {
  mockFetch({
    site: siteResponse({
      status: 403,
      headers: { 'cf-ray': ['abc123'] },
      body: '<html>challenge</html>',
    }),
  });

  const response = await callHandler();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.reason).toBe('blocked-by-waf');
  expect(body.reachable).toBe(true);
  expect(body.host.id).toBe('cloudflare');
  expect(body.recommendedMode).toBe('standard');
});

test('recommends standard when no CSP is present', async () => {
  const response = await callHandler();
  const body = await response.json();

  expect(body.reason).toBe('ok');
  expect(body.csp.present).toBe(false);
  expect(body.csp.scriptBlocked).toBe(false);
  expect(body.recommendedMode).toBe('standard');
});

test('does not warn for a report-only CSP', async () => {
  mockFetch({
    site: siteResponse({
      headers: { 'content-security-policy-report-only': ["default-src 'self'"] },
    }),
  });

  const body = await (await callHandler()).json();

  expect(body.csp.present).toBe(true);
  expect(body.csp.reportOnly).toBe(true);
  expect(body.csp.scriptBlocked).toBe(false);
  expect(body.recommendedMode).toBe('standard');
  expect(body.csp.suggestedHeaders).toEqual([]);
});

test.each([
  ["script-src 'self'; connect-src https://tartly.in", 'script'],
  ["script-src https://tartly.in; connect-src 'self'", 'connect'],
  ["default-src 'self'", 'both'],
])('recommends first-party when %s blocks %s', async (header, expected) => {
  mockFetch({ site: siteResponse({ headers: { 'content-security-policy': [header] } }) });

  const body = await (await callHandler()).json();

  expect(body.recommendedMode).toBe('first-party');

  if (expected === 'script') {
    expect(body.csp.scriptBlocked).toBe(true);
    expect(body.csp.connectBlocked).toBe(false);
  } else if (expected === 'connect') {
    expect(body.csp.scriptBlocked).toBe(false);
    expect(body.csp.connectBlocked).toBe(true);
  } else {
    expect(body.csp.scriptBlocked).toBe(true);
    expect(body.csp.connectBlocked).toBe(true);
  }
});

test('intersects multiple CSP headers', async () => {
  mockFetch({
    site: siteResponse({
      headers: {
        'content-security-policy': [
          'script-src https://tartly.in; connect-src https://tartly.in',
          "script-src 'self'; connect-src https://tartly.in",
        ],
      },
    }),
  });

  const body = await (await callHandler()).json();

  expect(body.csp.scriptBlocked).toBe(true);
  expect(body.recommendedMode).toBe('first-party');
});

test('reads a meta CSP from the HTML head', async () => {
  mockFetch({
    site: siteResponse({
      body: `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'"></head><body></body></html>`,
    }),
  });

  const body = await (await callHandler()).json();

  expect(body.csp.scriptBlocked).toBe(true);
  expect(body.recommendedMode).toBe('first-party');
});

test('keeps standard mode when the host is already allowed', async () => {
  mockFetch({
    site: siteResponse({
      headers: {
        'content-security-policy': [
          'script-src https://tartly.in; connect-src https://*.tartly.in',
        ],
      },
    }),
  });

  const body = await (await callHandler()).json();

  expect(body.csp.scriptBlocked).toBe(false);
  expect(body.csp.connectBlocked).toBe(false);
  expect(body.recommendedMode).toBe('standard');
});

test('reports strict-dynamic without silently recommending first-party', async () => {
  mockFetch({
    site: siteResponse({
      headers: {
        'content-security-policy': [
          "script-src 'self' 'strict-dynamic' 'nonce-abc'; connect-src https://tartly.in",
        ],
      },
    }),
  });

  const body = await (await callHandler()).json();

  expect(body.csp.strictDynamic).toBe(true);
  expect(body.recommendedMode).toBe('standard');
});

test('detects an installed first-party script from its content type', async () => {
  mockFetch({
    firstParty: {
      ok: true,
      status: 200,
      headers: { 'content-type': ['application/javascript; charset=utf-8'] },
      body: '',
    },
  });

  const body = await (await callHandler()).json();

  expect(body.firstParty.installed).toBe(true);
  expect(body.firstParty.scriptUrl).toBe('https://example.com/_tartly/script.js');
});

test('reports an absent first-party script as false', async () => {
  const body = await (await callHandler()).json();

  expect(body.firstParty.installed).toBe(false);
});

test('rate limits per workspace and returns Retry-After', async () => {
  vi.mocked(consumeRateLimit).mockResolvedValue({
    allowed: false,
    limit: 10,
    remaining: 0,
    retryAfterSeconds: 30,
  });

  const response = await callHandler();

  expect(response.status).toBe(429);
  expect(response.headers.get('retry-after')).toBe('30');
  expect(safeFetch).not.toHaveBeenCalled();
  expect(vi.mocked(consumeRateLimit)).toHaveBeenCalledWith(
    expect.objectContaining({
      key: `install-preflight:workspace:${workspaceId}`,
      limit: 10,
      windowSeconds: 60,
    }),
  );
});
