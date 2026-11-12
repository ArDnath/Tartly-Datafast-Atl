# First-party install

Tartly ships two install modes for the same tracker:

| Mode        | Script source                 | Event endpoint               | When it is recommended                                          |
| ----------- | ----------------------------- | ---------------------------- | --------------------------------------------------------------- |
| Standard    | `https://tartly.in/script.js` | `https://tartly.in/api/send` | No blocking policy, or Tartly is allowed                        |
| First-party | `/_tartly/script.js`          | `/_tartly/api/send`          | The site's enforced policy blocks third-party script or connect |

The first-party mode is not a CSP bypass. A third-party `<script>` cannot run
when a policy blocks it; the browser enforces the policy before the script
executes. First-party works because the browser sees a same-origin request:

- `script-src 'self'` allows `/_tartly/script.js`.
- `connect-src 'self'` allows `/_tartly/api/send`.
- No new host source is needed in the policy.

The customer's server or edge function proxies those two paths to Tartly. The
tracker already supports this: `src/tracker/index.js` reads `data-host-url` and
builds `${host}/api/send`. The tracker is not modified for this install mode.

## Install snippet

```html
<script
  defer
  src="/_tartly/script.js"
  data-website-id="YOUR_WEBSITE_ID"
  data-host-url="/_tartly"
  data-domain="example.com"
></script>
```

The standard snippet remains the default when no blocking policy exists.

## Preflight

`GET /api/websites/:websiteId/onboarding/preflight` checks the website's
configured domain and returns a recommendation. It never accepts a URL from
the request body, uses `requireWebsiteAccess(..., 'ADMIN')`, and is rate
limited to 10 checks per minute per workspace.

The check uses `src/lib/safe-fetch.ts`, which:

- allows only HTTPS in production;
- rejects credentials, IP literals, localhost, `.local`, and non-standard ports;
- resolves DNS once, validates every answer, and pins the validated address to
  the connection to prevent DNS rebinding;
- follows at most three same-host or `www`-variant redirects, revalidating each
  hop;
- times out after five seconds;
- reads at most 256 KB of HTML and stops after `</head>`;
- sends no cookies or authorization headers;
- uses the fixed user agent
  `TartlyInstallCheck/1.0 (+https://tartly.in/docs/install/first-party)`.

The preflight also sends a GET to `https://<domain>/_tartly/script.js`, aborts
after the response headers, and marks `firstParty.installed` only when the
content type is JavaScript. It never posts a test event.

Expected failures return HTTP 200 with the standard recommendation:

- unreachable or timeout;
- WAF challenge (`blocked-by-waf`);
- no configured domain;
- localhost or a private address (no fetch is attempted);
- a malformed policy (`invalid-csp`).

Report-only policies are not blockers. `'strict-dynamic'` is reported as an
advanced policy and keeps the standard recommendation, because a nonce may
still be required. The response never persists the raw CSP header.

## Proxy security model

Every required host guide follows the same rules:

- allow only `script.js`, `recorder.js`, `api/send`, `api/batch`, `api/record`,
  and `api/heartbeat`;
- GET only for script/recorder, POST only for the API paths, 404 for unknown
  paths, 405 for a known path with the wrong method;
- forward only `user-agent`, `x-talivia-cache`, and `x-forwarded-for`;
- never forward `cookie`, `authorization`, `proxy-authorization`, or arbitrary
  client headers;
- force `content-type: application/json` for POST;
- limit `/api/send` to 1 MB and `/api/record` to 10 MB, returning 413 above the
  limit;
- time out the upstream after 10 seconds and return 502 on failure;
- return the upstream status and content type;
- never return upstream `set-cookie`;
- cache GET script responses and set `no-store` on every POST.

The proxy is deliberately not a blind rewrite and not an open proxy. The website
ID belongs in the snippet only, never in the proxy file.

### Next.js App Router

File: `app/%5Ftartly/[...path]/route.ts`

The `%5F` prefix is the URL-encoded underscore. Next.js treats `_`-prefixed
folders as private and excludes them from routing, so the encoded name is the
portable way to serve `/_tartly/*`. The guide in the product contains the full
standalone route handler. It uses `runtime = 'nodejs'`,
`dynamic = 'force-dynamic'`, and the Web `Request`/`Response` APIs.

### Vercel (non-Next project)

Files: `api/tartly/[...path].ts` and a `vercel.json` rewrite from
`/_tartly/:path*` to `/api/tartly/:path*`.

If the project is Next.js on Vercel, use the Next.js guide instead.

### Netlify

File: `netlify/edge-functions/tartly.ts`

The edge function declares `export const config = { path: '/_tartly/*' }` and
uses Web APIs only.

### Cloudflare Pages

File: `functions/_tartly/[[path]].ts`

The Pages Function exports `onRequest` and reads the path from the request URL.

## Caveats

### IP address and geo

The proxy forwards `x-forwarded-for` when present. Where the host does not
provide it, Tartly sees the customer's server or edge egress address rather
than the visitor's address. Country and IP-derived fields can therefore be
coarser or wrong on those hosts. This affects visitor geography, not the event
count or the attribution path.

### Session replay

Replay bodies can be large. `/api/record` is capped at 10 MB and `/api/send` at
1 MB. A replay chunk above the cap is rejected with 413. Keep the replay
configuration bounded; do not raise the proxy limit to an unbounded body size.
Raw replay payloads remain in the replay store and are never written into the
relational tenant tables.

### Hosts that cannot proxy

Some site builders do not allow a server route or edge function. For those
sites, use the standard install and allow the tracker origin in the policy:

```text
script-src https://tartly.in;
connect-src https://tartly.in;
```

That is an explicit policy change and is the only supported alternative. Do
not use a JSONP, WebRTC, image-pixel, or hidden-iframe workaround.

## What the install cannot promise

No analytics solution sees 100% of visitors. Ad blockers, privacy extensions,
network failures, disabled JavaScript, consent tooling, and policy decisions
can all prevent a request. The first-party install removes the third-party
policy blocker; it does not remove those other causes. The event verification
step reads the real event store, so "Tracker connected" is never shown before
a real event exists.

## Tests and current status

- `src/features/analytics/lib/csp.test.ts` covers parsing, fallbacks, multiple
  headers, meta CSP, wildcards, `'none'`, `'strict-dynamic'`, malformed input,
  and suggested headers.
- `src/lib/safe-fetch.test.ts` covers private addresses, metadata endpoints,
  protocols, credentials, ports, redirects, DNS rebinding, timeout, WAF, and
  oversized bodies.
- `src/features/docs/install-guides.test.ts` covers snippet generation and the
  proxy string invariants (path allowlist, stripped headers, limits).
- Handler tests cover auth, cross-tenant access, no-domain, unreachable,
  timeout, WAF, no CSP, report-only, blocking directive combinations, meta CSP,
  strict-dynamic, installed script detection, and the rate limit.
- Component tests cover standard, first-party, unreachable, loading, manual
  mode switching, copy actions, re-check, and the absence of policy jargon.

The proxy templates are unit-tested but have not been run against a live
customer app in this environment. The full browser pass is **UNVERIFIED**; the
human action is to deploy one of the four proxy guides to a real site and open
it once so the event verification endpoint can read the first event.
