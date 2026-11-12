import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingMessage, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import ipaddr from 'ipaddr.js';
import { BRAND } from '@/lib/brand';

/**
 * SSRF-safe outbound HTTP for install preflight checks.
 *
 * The preflight fetches a customer-controlled domain. This module therefore
 * refuses IP literals, private networks, metadata endpoints, credentials,
 * non-standard ports, and cross-host redirects. DNS is resolved once and the
 * validated address is pinned into the connection so a rebinding response
 * cannot redirect the actual socket to a private address.
 *
 * Expected failures return a result object. They never throw.
 */

export const INSTALL_CHECK_USER_AGENT = `${BRAND.name}InstallCheck/1.0 (+${BRAND.url}/docs/install/first-party)`;

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_BODY_BYTES = 256 * 1024;

export type SafeFetchFailureReason =
  | 'invalid-url'
  | 'unsupported-protocol'
  | 'credentials'
  | 'blocked-host'
  | 'blocked-ip'
  | 'invalid-port'
  | 'dns-failure'
  | 'redirect-blocked'
  | 'too-many-redirects'
  | 'timeout'
  | 'network-error';

export interface SafeFetchOptions {
  /** Total budget for each request hop. Default 5 seconds. */
  timeoutMs?: number;
  /** Maximum redirects to follow. Default 3. */
  maxRedirects?: number;
  /** Maximum HTML bytes to read. Default 256 KB. */
  maxBodyBytes?: number;
  /** Set false to abort as soon as response headers arrive. */
  readBody?: boolean;
  /** Stop reading as soon as </head> is seen. Default true. */
  stopAtHeadEnd?: boolean;
  /**
   * Test-only seam for local HTTP fixtures. Ignored outside NODE_ENV=test,
   * and only the first hop (or a same-host redirect) may use a private
   * address.
   */
  allowInsecureLocalForTests?: boolean;
}

export interface SafeFetchResult {
  ok: boolean;
  reason?: SafeFetchFailureReason;
  status?: number;
  finalUrl?: string;
  /** Header name -> every received value, preserving duplicates. */
  headers?: Record<string, string[]>;
  body?: string;
  truncated?: boolean;
}

interface ResolvedAddress {
  address: string;
  family: number;
}

interface ValidatedUrl {
  url: URL;
  address?: ResolvedAddress;
}

interface ValidationResult {
  ok: boolean;
  value?: ValidatedUrl;
  reason?: SafeFetchFailureReason;
}

interface RequestResult {
  ok: boolean;
  response?: RawResponse;
  reason?: SafeFetchFailureReason;
}

interface RawResponse {
  status: number;
  headers: Record<string, string[]>;
  body: string;
  truncated: boolean;
}

function isTestEnvironment() {
  return process.env.NODE_ENV === 'test';
}

function stripBrackets(hostname: string) {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function defaultPort(protocol: string) {
  if (protocol === 'https:') {
    return '443';
  }

  if (protocol === 'http:') {
    return '80';
  }

  return '';
}

export function isIpLiteral(value: string) {
  const hostname = stripBrackets(value);

  try {
    ipaddr.parse(hostname);
    return true;
  } catch {
    return false;
  }
}

export function isPrivateIpAddress(value: string) {
  const hostname = stripBrackets(value);

  try {
    const parsed = ipaddr.parse(hostname);

    if (parsed.kind() === 'ipv6') {
      const ipv6 = parsed as ipaddr.IPv6;

      if (ipv6.isIPv4MappedAddress()) {
        return ipv6.toIPv4Address().range() !== 'unicast';
      }
    }

    return parsed.range() !== 'unicast';
  } catch {
    return true;
  }
}

export function isBlockedHostname(value: string) {
  const hostname = stripBrackets(value).toLowerCase().replace(/\.$/, '');

  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  );
}

function sameHostOrWwwVariant(first: string, second: string) {
  const normalize = (host: string) => host.toLowerCase().replace(/^www\./, '');

  return normalize(first) === normalize(second);
}

async function resolvePublicAddresses(
  hostname: string,
): Promise<ResolvedAddress[] | SafeFetchFailureReason> {
  let addresses: ResolvedAddress[];

  try {
    addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    return 'dns-failure';
  }

  if (!addresses.length) {
    return 'dns-failure';
  }

  for (const address of addresses) {
    if (isPrivateIpAddress(address.address)) {
      return 'blocked-ip';
    }
  }

  return addresses;
}

async function validateUrl(
  rawUrl: string,
  options: SafeFetchOptions,
  context: { isRedirect: boolean; previousHost: string | null },
): Promise<ValidationResult> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }

  const secureProtocol = url.protocol === 'https:';
  const devHttp = url.protocol === 'http:' && process.env.NODE_ENV !== 'production';
  const localTest =
    isTestEnvironment() &&
    options.allowInsecureLocalForTests === true &&
    (!context.isRedirect ||
      (context.previousHost !== null && sameHostOrWwwVariant(context.previousHost, url.hostname)));

  if (!secureProtocol && !devHttp && !localTest) {
    return { ok: false, reason: 'unsupported-protocol' };
  }

  if (url.username || url.password) {
    return { ok: false, reason: 'credentials' };
  }

  const port = url.port || defaultPort(url.protocol);

  if (!localTest) {
    if (url.protocol === 'https:' && port !== '443') {
      return { ok: false, reason: 'invalid-port' };
    }

    if (url.protocol === 'http:' && port !== '80') {
      return { ok: false, reason: 'invalid-port' };
    }
  }

  const hostname = stripBrackets(url.hostname);

  if (!hostname) {
    return { ok: false, reason: 'blocked-host' };
  }

  if (!localTest && isBlockedHostname(hostname)) {
    return { ok: false, reason: 'blocked-host' };
  }

  if (!localTest && isIpLiteral(hostname)) {
    return { ok: false, reason: 'blocked-ip' };
  }

  if (localTest) {
    return { ok: true, value: { url } };
  }

  const addresses = await resolvePublicAddresses(hostname);

  if (typeof addresses === 'string') {
    return { ok: false, reason: addresses };
  }

  const chosen = addresses.find(address => address.family === 4) ?? addresses[0];

  return {
    ok: true,
    value: {
      url,
      address: { address: chosen.address, family: chosen.family },
    },
  };
}

function collectHeaders(response: IncomingMessage): Record<string, string[]> {
  const headers: Record<string, string[]> = {};
  const raw = response.rawHeaders;

  for (let index = 0; index < raw.length; index += 2) {
    const name = raw[index].toLowerCase();
    const value = raw[index + 1];

    if (!headers[name]) {
      headers[name] = [];
    }

    headers[name].push(value);
  }

  return headers;
}

function firstHeader(headers: Record<string, string[]>, name: string) {
  return headers[name.toLowerCase()]?.[0];
}

function decodeBody(buffer: Buffer, contentEncoding: string | string[] | undefined) {
  const encoding = String(contentEncoding || '').toLowerCase();

  try {
    if (encoding.includes('gzip')) {
      return gunzipSync(buffer, { maxOutputLength: DEFAULT_MAX_BODY_BYTES }).toString('utf8');
    }

    if (encoding.includes('br')) {
      return brotliDecompressSync(buffer, {
        maxOutputLength: DEFAULT_MAX_BODY_BYTES,
      }).toString('utf8');
    }

    if (encoding.includes('deflate')) {
      return inflateSync(buffer, { maxOutputLength: DEFAULT_MAX_BODY_BYTES }).toString('utf8');
    }
  } catch {
    // Fall through to the identity decode. A broken encoding is not a reason
    // to fail the whole check; header-only analysis still works.
  }

  return buffer.toString('utf8');
}

function requestOnce(
  url: URL,
  address: ResolvedAddress | undefined,
  options: SafeFetchOptions,
): Promise<RequestResult> {
  return new Promise(resolve => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    const readBody = options.readBody !== false;
    const stopAtHeadEnd = options.stopAtHeadEnd !== false;
    const controller = new AbortController();

    let settled = false;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (result: RequestResult) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const hostname = stripBrackets(url.hostname);
    const requestOptions: RequestOptions = {
      protocol: url.protocol,
      hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'user-agent': INSTALL_CHECK_USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
        'accept-encoding': 'identity',
      },
      signal: controller.signal,
      agent: false,
    };

    if (address) {
      requestOptions.lookup = ((
        _hostname: string,
        lookupOptions: { all?: boolean },
        callback: any,
      ) => {
        if (lookupOptions?.all) {
          callback(null, [address]);
        } else {
          callback(null, address.address, address.family);
        }
      }) as RequestOptions['lookup'];
    }

    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    let request: ReturnType<typeof httpsRequest>;

    try {
      request = transport(requestOptions, response => {
        const headers = collectHeaders(response);
        const status = response.statusCode ?? 0;

        if (!readBody) {
          response.destroy();
          finish({
            ok: true,
            response: { status, headers, body: '', truncated: false },
          });
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        response.on('data', (chunk: Buffer) => {
          if (settled) {
            return;
          }

          chunks.push(chunk);
          total += chunk.length;

          if (total >= maxBodyBytes) {
            const body = Buffer.concat(chunks).subarray(0, maxBodyBytes);
            finish({
              ok: true,
              response: {
                status,
                headers,
                body: decodeBody(body, response.headers['content-encoding']),
                truncated: true,
              },
            });
            response.destroy();
            return;
          }

          if (stopAtHeadEnd) {
            const text = Buffer.concat(chunks).toString('latin1').toLowerCase();
            const headEnd = text.indexOf('</head>');

            if (headEnd !== -1) {
              const body = Buffer.concat(chunks).subarray(0, headEnd + '</head>'.length);
              finish({
                ok: true,
                response: {
                  status,
                  headers,
                  body: decodeBody(body, response.headers['content-encoding']),
                  truncated: false,
                },
              });
              response.destroy();
            }
          }
        });

        response.on('end', () => {
          finish({
            ok: true,
            response: {
              status,
              headers,
              body: decodeBody(Buffer.concat(chunks), response.headers['content-encoding']),
              truncated: false,
            },
          });
        });

        response.on('aborted', () => {
          finish({
            ok: false,
            reason: timedOut ? 'timeout' : 'network-error',
          });
        });

        response.on('error', () => {
          finish({
            ok: false,
            reason: timedOut ? 'timeout' : 'network-error',
          });
        });
      });
    } catch {
      finish({ ok: false, reason: timedOut ? 'timeout' : 'network-error' });
      return;
    }

    request.on('error', () => {
      finish({
        ok: false,
        reason: timedOut ? 'timeout' : 'network-error',
      });
    });

    request.end();
  });
}

/**
 * Fetch a customer site with SSRF protection.
 *
 * `ok: true` means an HTTP response was obtained, even if its status is 4xx or
 * 5xx. Transport and policy failures return `ok: false` with a reason.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const visited = new Set<string>();
  let current = rawUrl;
  let previousHost: string | null = null;

  try {
    visited.add(new URL(rawUrl).href);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const validated = await validateUrl(current, options, {
      isRedirect: redirects > 0,
      previousHost,
    });

    if (!validated.ok) {
      return { ok: false, reason: validated.reason };
    }

    const result = await requestOnce(validated.value.url, validated.value.address, options);

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    const location = firstHeader(result.response.headers, 'location');
    const redirectStatus = [301, 302, 303, 307, 308].includes(result.response.status);

    if (redirectStatus && location) {
      if (redirects >= maxRedirects) {
        return { ok: false, reason: 'too-many-redirects' };
      }

      let next: URL;

      try {
        next = new URL(location, validated.value.url);
      } catch {
        return { ok: false, reason: 'redirect-blocked' };
      }

      if (!sameHostOrWwwVariant(validated.value.url.hostname, next.hostname)) {
        return { ok: false, reason: 'redirect-blocked' };
      }

      if (visited.has(next.href)) {
        return { ok: false, reason: 'redirect-blocked' };
      }

      visited.add(next.href);
      previousHost = validated.value.url.hostname;
      current = next.href;
      continue;
    }

    return {
      ok: true,
      status: result.response.status,
      finalUrl: validated.value.url.href,
      headers: result.response.headers,
      body: result.response.body,
      truncated: result.response.truncated,
    };
  }

  return { ok: false, reason: 'too-many-redirects' };
}
