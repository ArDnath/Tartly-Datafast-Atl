import type { RequestListener } from 'node:http';
import { createServer } from 'node:http';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const lookup = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({
  lookup,
  default: { lookup },
}));

import { INSTALL_CHECK_USER_AGENT, safeFetch } from './safe-fetch';

beforeEach(() => {
  lookup.mockReset();
  lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
});

async function withServer(
  handler: RequestListener,
  run: (
    baseUrl: string,
    requests: Array<Record<string, string | string[] | undefined>>,
  ) => Promise<void>,
) {
  const requests: Array<Record<string, string | string[] | undefined>> = [];
  const server = createServer((request, response) => {
    requests.push(request.headers);
    handler(request, response);
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Test server did not expose a port');
  }

  try {
    await run(`http://127.0.0.1:${address.port}`, requests);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

async function expectBlocked(url: string, reason: string) {
  const result = await safeFetch(url);

  expect(result.ok).toBe(false);
  expect(result.reason).toBe(reason);
}

test('rejects localhost, private IPs, and the metadata endpoint', async () => {
  await expectBlocked('http://localhost/', 'blocked-host');
  await expectBlocked('https://127.0.0.1/', 'blocked-ip');
  await expectBlocked('https://10.0.0.1/', 'blocked-ip');
  await expectBlocked('https://192.168.1.1/', 'blocked-ip');
  await expectBlocked('https://169.254.169.254/', 'blocked-ip');
  await expectBlocked('https://[::1]/', 'blocked-ip');
  await expectBlocked('https://foo.local/', 'blocked-host');
});

test('rejects non-HTTP protocols, credentials, and non-standard ports', async () => {
  await expectBlocked('file:///etc/passwd', 'unsupported-protocol');
  await expectBlocked('gopher://example.com/', 'unsupported-protocol');
  await expectBlocked('https://user:pass@example.com/', 'credentials');
  await expectBlocked('https://example.com:8443/', 'invalid-port');
});

test('rejects a DNS answer that resolves to a private address', async () => {
  lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

  await expectBlocked('https://rebind.example.com/', 'blocked-ip');
});

test('does not follow a redirect to a private address', async () => {
  await withServer(
    (_request, response) => {
      response.statusCode = 302;
      response.setHeader('location', 'http://10.0.0.1/');
      response.end();
    },
    async baseUrl => {
      const result = await safeFetch(baseUrl, {
        allowInsecureLocalForTests: true,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('redirect-blocked');
    },
  );
});

test('follows a same-host redirect', async () => {
  await withServer(
    (request, response) => {
      if (request.url === '/') {
        response.statusCode = 302;
        response.setHeader('location', '/final');
        response.end();
        return;
      }

      response.setHeader('content-type', 'text/html');
      response.end('<html><head></head><body>final</body></html>');
    },
    async baseUrl => {
      const result = await safeFetch(baseUrl, {
        allowInsecureLocalForTests: true,
        stopAtHeadEnd: false,
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.body).toContain('final');
    },
  );
});

test('stops after the configured redirect limit', async () => {
  await withServer(
    (request, response) => {
      const step = Number(new URL(request.url || '/', 'http://localhost').pathname.slice(1)) || 0;
      response.statusCode = 302;
      response.setHeader('location', `/${step + 1}`);
      response.end();
    },
    async baseUrl => {
      const result = await safeFetch(baseUrl, {
        allowInsecureLocalForTests: true,
        maxRedirects: 2,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('too-many-redirects');
    },
  );
});

test('returns a timeout result instead of throwing', async () => {
  await withServer(
    () => {
      // Intentionally never respond.
    },
    async baseUrl => {
      const result = await safeFetch(baseUrl, {
        allowInsecureLocalForTests: true,
        timeoutMs: 50,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('timeout');
    },
  );
});

test('returns the HTTP status and headers for a WAF challenge', async () => {
  await withServer(
    (_request, response) => {
      response.statusCode = 403;
      response.setHeader('cf-ray', 'abc123');
      response.setHeader('content-type', 'text/html');
      response.end('<html><body>challenge</body></html>');
    },
    async baseUrl => {
      const result = await safeFetch(baseUrl, {
        allowInsecureLocalForTests: true,
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(403);
      expect(result.headers?.['cf-ray']).toEqual(['abc123']);
    },
  );
});

test('truncates an oversized body instead of buffering it all', async () => {
  await withServer(
    (_request, response) => {
      response.setHeader('content-type', 'text/html');
      response.end('a'.repeat(300_000));
    },
    async baseUrl => {
      const result = await safeFetch(baseUrl, {
        allowInsecureLocalForTests: true,
        maxBodyBytes: 1024,
      });

      expect(result.ok).toBe(true);
      expect(result.truncated).toBe(true);
      expect((result.body || '').length).toBeLessThanOrEqual(1024);
    },
  );
});

test('reads only the head of a normal HTML document', async () => {
  await withServer(
    (_request, response) => {
      response.setHeader('content-type', 'text/html');
      response.end(
        `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'"></head><body>${'x'.repeat(10_000)}</body></html>`,
      );
    },
    async baseUrl => {
      const result = await safeFetch(baseUrl, {
        allowInsecureLocalForTests: true,
        maxBodyBytes: 256 * 1024,
      });

      expect(result.ok).toBe(true);
      expect(result.body).toContain('Content-Security-Policy');
      expect(result.body).not.toContain('xxxxxxxxxx');
    },
  );
});

test('sends a fixed user agent and never sends cookies or authorization', async () => {
  await withServer(
    (_request, response) => {
      response.setHeader('content-type', 'text/html');
      response.end('<html><head></head><body>ok</body></html>');
    },
    async (baseUrl, requests) => {
      const result = await safeFetch(baseUrl, { allowInsecureLocalForTests: true });

      expect(result.ok).toBe(true);
      expect(requests[0]?.['user-agent']).toBe(INSTALL_CHECK_USER_AGENT);
      expect(requests[0]?.cookie).toBeUndefined();
      expect(requests[0]?.authorization).toBeUndefined();
    },
  );
});

afterEach(() => {
  lookup.mockReset();
});
