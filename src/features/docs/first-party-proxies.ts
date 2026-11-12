/**
 * Copy-paste proxy templates for the first-party install.
 *
 * Each template is deliberately standalone: no imports from product internals,
 * no shared helpers, and no customer website ID. Security invariants live in
 * the template text itself and are covered by install-guides tests.
 */

export const NEXTJS_FIRST_PARTY_PROXY = `// app/%5Ftartly/[...path]/route.ts
// Next.js treats folders that start with "_" as private and excludes them
// from routing. The %5F prefix is the URL-encoded underscore, so this handler
// is served at /_tartly/* while the folder stays out of the way.
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TARTLY_ORIGIN = 'https://tartly.in';
const ALLOWED_GET = new Set(['script.js', 'recorder.js']);
const ALLOWED_POST = new Set(['api/send', 'api/batch', 'api/record', 'api/heartbeat']);
const BODY_LIMITS: Record<string, number> = {
  'api/send': 1_000_000,
  'api/record': 10_000_000,
};

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: { status, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function proxy(request: NextRequest, path: string) {
  const method = request.method;
  const isGetPath = ALLOWED_GET.has(path);
  const isPostPath = ALLOWED_POST.has(path);

  if (!isGetPath && !isPostPath) {
    return errorResponse(404, 'Not found');
  }

  if (isGetPath && method !== 'GET') {
    return new Response(null, { status: 405, headers: { allow: 'GET' } });
  }

  if (isPostPath && method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  }

  const headers = new Headers();
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  const cacheHint = request.headers.get('x-talivia-cache');
  if (cacheHint) headers.set('x-talivia-cache', cacheHint);
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  // Cookies and authorization headers are intentionally not forwarded. This
  // endpoint only serves the tracker and its event paths; forwarding the
  // customer's session cookies to the analytics service would leak credentials across
  // origins and has no analytics purpose.
  let body: ArrayBuffer | undefined;
  if (method === 'POST') {
    headers.set('content-type', 'application/json');
    const limit = BODY_LIMITS[path] ?? 1_000_000;
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > limit) return errorResponse(413, 'Payload too large');
    body = await request.arrayBuffer();
    if (body.byteLength > limit) return errorResponse(413, 'Payload too large');
  }

  let upstream: Response;
  try {
    upstream = await fetch(\`\${TARTLY_ORIGIN}/\${path}\`, {
      method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return errorResponse(502, 'Upstream unavailable');
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  responseHeaders.set(
    'cache-control',
    method === 'GET'
      ? (upstream.headers.get('cache-control') ?? 'public, max-age=3600')
      : 'no-store',
  );

  // Never forward set-cookie from the upstream.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path.join('/'));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path.join('/'));
}
`;

export const VERCEL_FIRST_PARTY_PROXY = `import type { IncomingMessage, ServerResponse } from 'node:http';

const TARTLY_ORIGIN = 'https://tartly.in';
const ALLOWED_GET = new Set(['script.js', 'recorder.js']);
const ALLOWED_POST = new Set(['api/send', 'api/batch', 'api/record', 'api/heartbeat']);
const BODY_LIMITS: Record<string, number> = {
  'api/send': 1_000_000,
  'api/record': 10_000_000,
};

function sendJson(response: ServerResponse, status: number, message: string) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify({ error: { status, message } }));
}

function readBody(request: IncomingMessage, limit: number): Promise<Buffer | null> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];
    let total = 0;
    let done = false;

    request.on('data', (chunk: Buffer) => {
      if (done) return;
      total += chunk.length;
      if (total > limit) {
        done = true;
        resolve(null);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      if (!done) {
        done = true;
        resolve(Buffer.concat(chunks));
      }
    });

    request.on('error', () => {
      if (!done) {
        done = true;
        resolve(null);
      }
    });
  });
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url || '/', 'https://localhost');
  const path = url.pathname.replace(/^\\/api\\/tartly\\/?/, '').replace(/\\/+$/, '');
  const method = request.method || 'GET';
  const isGetPath = ALLOWED_GET.has(path);
  const isPostPath = ALLOWED_POST.has(path);

  if (!isGetPath && !isPostPath) {
    sendJson(response, 404, 'Not found');
    return;
  }

  if ((isGetPath && method !== 'GET') || (isPostPath && method !== 'POST')) {
    response.statusCode = 405;
    response.setHeader('allow', isGetPath ? 'GET' : 'POST');
    response.end();
    return;
  }

  const headers: Record<string, string> = {};
  const userAgent = request.headers['user-agent'];
  if (typeof userAgent === 'string') headers['user-agent'] = userAgent;
  const cacheHint = request.headers['x-talivia-cache'];
  if (typeof cacheHint === 'string') headers['x-talivia-cache'] = cacheHint;
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') headers['x-forwarded-for'] = forwardedFor;

  // Cookies and authorization headers are intentionally not forwarded. This
  // proxy only serves tracker assets and events, so a customer session cookie
  // must never leave the customer's domain.
  let body: Buffer | undefined;
  if (method === 'POST') {
    headers['content-type'] = 'application/json';
    const limit = BODY_LIMITS[path] ?? 1_000_000;
    const declared = Number(request.headers['content-length'] || 0);
    if (declared > limit) {
      sendJson(response, 413, 'Payload too large');
      return;
    }
    const read = await readBody(request, limit);
    if (!read) {
      sendJson(response, 413, 'Payload too large');
      return;
    }
    body = read;
  }

  let upstream: Response;
  try {
    upstream = await fetch(\`\${TARTLY_ORIGIN}/\${path}\`, {
      method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    sendJson(response, 502, 'Upstream unavailable');
    return;
  }

  response.statusCode = upstream.status;
  const contentType = upstream.headers.get('content-type');
  if (contentType) response.setHeader('content-type', contentType);
  response.setHeader(
    'cache-control',
    method === 'GET'
      ? (upstream.headers.get('cache-control') ?? 'public, max-age=3600')
      : 'no-store',
  );

  // Set-cookie is never copied from the upstream response.
  response.end(Buffer.from(await upstream.arrayBuffer()));
}
`;

export const VERCEL_FIRST_PARTY_REWRITE = `{
  "rewrites": [
    {
      "source": "/_tartly/:path*",
      "destination": "/api/tartly/:path*"
    }
  ]
}
`;

export const NETLIFY_FIRST_PARTY_PROXY = `const TARTLY_ORIGIN = 'https://tartly.in';
const ALLOWED_GET = new Set(['script.js', 'recorder.js']);
const ALLOWED_POST = new Set(['api/send', 'api/batch', 'api/record', 'api/heartbeat']);
const BODY_LIMITS: Record<string, number> = {
  'api/send': 1_000_000,
  'api/record': 10_000_000,
};

export const config = { path: '/_tartly/*' };

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: { status, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\\/_tartly\\/?/, '').replace(/\\/+$/, '');
  const method = request.method;
  const isGetPath = ALLOWED_GET.has(path);
  const isPostPath = ALLOWED_POST.has(path);

  if (!isGetPath && !isPostPath) {
    return errorResponse(404, 'Not found');
  }

  if ((isGetPath && method !== 'GET') || (isPostPath && method !== 'POST')) {
    return new Response(null, { status: 405, headers: { allow: isGetPath ? 'GET' : 'POST' } });
  }

  const headers = new Headers();
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  const cacheHint = request.headers.get('x-talivia-cache');
  if (cacheHint) headers.set('x-talivia-cache', cacheHint);
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  // Cookies and authorization headers are intentionally not forwarded. The
  // edge function is a tracker proxy, not a general-purpose tunnel.
  let body: ArrayBuffer | undefined;
  if (method === 'POST') {
    headers.set('content-type', 'application/json');
    const limit = BODY_LIMITS[path] ?? 1_000_000;
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > limit) return errorResponse(413, 'Payload too large');
    body = await request.arrayBuffer();
    if (body.byteLength > limit) return errorResponse(413, 'Payload too large');
  }

  let upstream: Response;
  try {
    upstream = await fetch(\`\${TARTLY_ORIGIN}/\${path}\`, {
      method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return errorResponse(502, 'Upstream unavailable');
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  responseHeaders.set(
    'cache-control',
    method === 'GET'
      ? (upstream.headers.get('cache-control') ?? 'public, max-age=3600')
      : 'no-store',
  );

  // Never forward set-cookie from the upstream.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
`;

export const CLOUDFLARE_FIRST_PARTY_PROXY = `const TARTLY_ORIGIN = 'https://tartly.in';
const ALLOWED_GET = new Set(['script.js', 'recorder.js']);
const ALLOWED_POST = new Set(['api/send', 'api/batch', 'api/record', 'api/heartbeat']);
const BODY_LIMITS: Record<string, number> = {
  'api/send': 1_000_000,
  'api/record': 10_000_000,
};

interface PagesContext {
  request: Request;
  params: { path?: string | string[] };
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: { status, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\\/_tartly\\/?/, '').replace(/\\/+$/, '');
  const method = request.method;
  const isGetPath = ALLOWED_GET.has(path);
  const isPostPath = ALLOWED_POST.has(path);

  if (!isGetPath && !isPostPath) {
    return errorResponse(404, 'Not found');
  }

  if ((isGetPath && method !== 'GET') || (isPostPath && method !== 'POST')) {
    return new Response(null, { status: 405, headers: { allow: isGetPath ? 'GET' : 'POST' } });
  }

  const headers = new Headers();
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  const cacheHint = request.headers.get('x-talivia-cache');
  if (cacheHint) headers.set('x-talivia-cache', cacheHint);
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  // Cookies and authorization headers are intentionally not forwarded. The
  // function exists only to serve the tracker and its event endpoints.
  let body: ArrayBuffer | undefined;
  if (method === 'POST') {
    headers.set('content-type', 'application/json');
    const limit = BODY_LIMITS[path] ?? 1_000_000;
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > limit) return errorResponse(413, 'Payload too large');
    body = await request.arrayBuffer();
    if (body.byteLength > limit) return errorResponse(413, 'Payload too large');
  }

  let upstream: Response;
  try {
    upstream = await fetch(\`\${TARTLY_ORIGIN}/\${path}\`, {
      method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return errorResponse(502, 'Upstream unavailable');
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  responseHeaders.set(
    'cache-control',
    method === 'GET'
      ? (upstream.headers.get('cache-control') ?? 'public, max-age=3600')
      : 'no-store',
  );

  // Never forward set-cookie from the upstream.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
`;
