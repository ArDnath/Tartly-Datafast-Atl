import { BRAND } from '@/lib/brand';
import {
  CLOUDFLARE_FIRST_PARTY_PROXY,
  NETLIFY_FIRST_PARTY_PROXY,
  NEXTJS_FIRST_PARTY_PROXY,
  VERCEL_FIRST_PARTY_PROXY,
  VERCEL_FIRST_PARTY_REWRITE,
} from './first-party-proxies';

/**
 * Tracker installation guides.
 *
 * These guides describe the script this repository actually ships. The
 * snippets are generated from one function so the onboarding flow, the public
 * docs, and the website settings screen cannot drift apart.
 *
 * Standard mode loads https://tartly.in/script.js. First-party mode loads the
 * same tracker and event endpoints from the customer's own origin, so a strict
 * Content-Security-Policy can keep `'self'` and need no new source.
 *
 * `status` is deliberately honest: a guide is only `tested` when the snippet
 * was run against a real application in this environment. Unit tests cover the
 * generated shape, not the framework runtime.
 */
export type InstallGuideStatus = 'tested' | 'untested';
export type InstallMode = 'standard' | 'first-party';

export const FIRST_PARTY_BASE_PATH = '/_tartly';

export interface InstallContext {
  websiteId: string;
  domain?: string;
  /** Origin that serves `/script.js` in standard mode. Defaults to the brand URL. */
  hostUrl?: string;
  mode?: InstallMode;
  basePath?: string;
  /** Optional cross-domain cookie domains already supported by the tracker. */
  crossDomainDomains?: string[];
}

export interface InstallGuideFile {
  label: string;
  path: string;
  language: string;
  code: string;
}

export interface FirstPartyGuideDetails {
  snippetPath: string;
  files: InstallGuideFile[];
  policyNote: string;
  cookiesNote: string;
}

export interface InstallGuide {
  slug: string;
  title: string;
  summary: string;
  language: string;
  status: InstallGuideStatus;
  statusNote: string;
  steps: string[];
  notes?: string[];
  mode?: InstallMode;
  firstParty?: FirstPartyGuideDetails;
  code: (context: InstallContext) => string;
}

export interface InstallTroubleshootingItem {
  title: string;
  detail: string;
  href?: string;
}

const SCRIPT_NAME = 'script.js';
const NO_POLICY_CHANGE =
  'No security-policy change is needed: the script and its events stay on your own domain.';
const NO_COOKIE_FORWARDING =
  'The proxy does not forward cookies or authorization headers to the analytics service.';

function normalizedBasePath(context: InstallContext) {
  return (context.basePath || FIRST_PARTY_BASE_PATH).replace(/\/$/, '');
}

function scriptSource(context: InstallContext) {
  if (context.mode === 'first-party') {
    return `${normalizedBasePath(context)}/${SCRIPT_NAME}`;
  }

  return `${(context.hostUrl || BRAND.url).replace(/\/$/, '')}/${SCRIPT_NAME}`;
}

function snippetAttributes(context: InstallContext) {
  return [
    `src="${scriptSource(context)}"`,
    context.mode === 'first-party' ? `data-host-url="${normalizedBasePath(context)}"` : '',
    `data-website-id="${context.websiteId}"`,
    context.domain ? `data-domain="${context.domain}"` : '',
    context.crossDomainDomains?.length
      ? `data-cross-domain-domains="${context.crossDomainDomains.join(',')}"`
      : '',
  ].filter(Boolean);
}

function snippet(context: InstallContext) {
  return snippetAttributes(context).join(' ');
}

function htmlSnippet(context: InstallContext) {
  return `<script defer ${snippet(context)}></script>`;
}

function firstPartySnippet(context: InstallContext) {
  return htmlSnippet({ ...context, mode: 'first-party' });
}

const UNTESTED_RUNTIME =
  'Snippet generation is unit-tested. The install has not been run against a live app in this environment.';

const UNTESTED_PROXY =
  'The proxy template is unit-tested for path allowlists and header stripping. It has not been run against a live customer app in this environment.';

export const STANDARD_GUIDES: InstallGuide[] = [
  {
    slug: 'nextjs',
    title: 'Next.js',
    summary: 'Add the tracker to the App Router root layout with next/script.',
    language: 'tsx',
    status: 'untested',
    statusNote: UNTESTED_RUNTIME,
    steps: [
      'Open app/layout.tsx (or src/app/layout.tsx).',
      'Import Script from next/script and add it inside <body>, after {children}.',
      'Deploy. The script loads after hydration and tracks client-side route changes.',
    ],
    notes: [
      'Do not place the script in <head> with a blocking strategy; it only needs to run after the page is interactive.',
      'The Pages Router uses the same component in pages/_app.tsx.',
    ],
    code: context => {
      const attributes = snippetAttributes(context)
        .map(value => `          ${value}`)
        .join('\n');

      return `import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
${attributes}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`;
    },
  },
  {
    slug: 'react',
    title: 'React',
    summary: 'Put the script in the HTML entry point so it loads before React.',
    language: 'html',
    status: 'untested',
    statusNote: UNTESTED_RUNTIME,
    steps: [
      'Open the index.html file used by your React build (Vite, CRA, or a custom setup).',
      'Paste the snippet inside <head>, before the module script that mounts React.',
      'Deploy. The tracker captures the initial pageview and later history changes.',
    ],
    notes: [
      'If your app is server-rendered, use the framework guide instead so the script is present on first paint.',
    ],
    code: htmlSnippet,
  },
  {
    slug: 'vite',
    title: 'Vite',
    summary: 'Add the snippet to the Vite index.html entry point.',
    language: 'html',
    status: 'untested',
    statusNote: UNTESTED_RUNTIME,
    steps: [
      'Open index.html at the project root.',
      'Paste the snippet inside <head>. Do not import it from a module.',
      'Run the production build. Vite leaves an external script tag in place.',
    ],
    notes: [
      'Environment variables are not needed: the website ID is a public identifier, not a secret.',
    ],
    code: htmlSnippet,
  },
  {
    slug: 'html',
    title: 'Plain HTML',
    summary: 'Paste one script tag before the closing body tag on every page.',
    language: 'html',
    status: 'untested',
    statusNote: UNTESTED_RUNTIME,
    steps: [
      'Open the HTML template shared by your pages.',
      'Paste the snippet before </body>.',
      'Deploy and open the site from a normal browser profile, not an ad-blocking one.',
    ],
    notes: [
      'If every page has its own template, add the snippet to each one or to a shared include.',
    ],
    code: htmlSnippet,
  },
  {
    slug: 'astro',
    title: 'Astro',
    summary: 'Use an inline script in the shared layout so Astro does not bundle it.',
    language: 'astro',
    status: 'untested',
    statusNote: UNTESTED_RUNTIME,
    steps: [
      'Open src/layouts/Layout.astro (or your shared layout).',
      'Add the script to <head> with the is:inline directive.',
      'Build the site. Astro emits the tag as written.',
    ],
    notes: [
      'The is:inline directive is required; without it Astro may process the external script differently.',
    ],
    code: context => {
      const attributes = snippetAttributes(context)
        .map(value => `      ${value}`)
        .join('\n');

      return `<html lang="en">
  <head>
    <script
      is:inline
      defer
${attributes}
    ></script>
  </head>
  <body>
    <slot />
  </body>
</html>`;
    },
  },
  {
    slug: 'remix',
    title: 'Remix',
    summary: 'Render the script in the root route body.',
    language: 'tsx',
    status: 'untested',
    statusNote: UNTESTED_RUNTIME,
    steps: [
      'Open app/root.tsx.',
      'Add the script after <Outlet /> inside <body>.',
      'Deploy. Remix keeps the tag in the server-rendered document.',
    ],
    notes: [
      'Use a plain script tag, not a Remix module import, so the tracker can read its data attributes at load time.',
    ],
    code: context => {
      const attributes = snippetAttributes(context)
        .map(value => `          ${value}`)
        .join('\n');

      return `export default function App() {
  return (
    <html lang="en">
      <body>
        <Outlet />
        <script
          defer
${attributes}
        />
      </body>
    </html>
  );
}`;
    },
  },
  {
    slug: 'other',
    title: 'Other / No-code',
    summary:
      'Use the custom-code, code-injection, or embed field in your site builder. The snippet is plain HTML and needs no build step.',
    language: 'html',
    status: 'untested',
    statusNote: UNTESTED_RUNTIME,
    steps: [
      'Find the custom-code setting in your builder: Webflow → Project Settings → Custom Code; Framer → Site Settings → General → Custom Code; WordPress → Appearance → Theme File Editor (footer.php) or a header/footer plugin; Shopify → Themes → Edit code → theme.liquid; Wix → Settings → Custom Code; Squarespace → Settings → Advanced → Code Injection → Footer.',
      'Paste the snippet before the closing </body> tag, or into the footer/body code field.',
      'Publish the site, open it in a normal browser profile, and wait for the live check to report the first event.',
    ],
    notes: [
      'No package install, build step, or framework import is required. Every guide generates the same plain script tag.',
      'If the builder strips script tags, add the snippet through a global "Embed" or "HTML" element in the footer instead of a per-page block.',
      'Some builders only allow custom code on a paid plan or on a custom domain.',
    ],
    code: htmlSnippet,
  },
];

export const FIRST_PARTY_GUIDES: InstallGuide[] = [
  {
    slug: 'nextjs-first-party',
    title: 'Next.js (first-party)',
    summary:
      'Proxy /_tartly through a Next.js App Router route handler, then load the tracker from your own domain.',
    language: 'tsx',
    status: 'untested',
    statusNote: UNTESTED_PROXY,
    mode: 'first-party',
    steps: [
      'Create app/%5Ftartly/[...path]/route.ts (or src/app/%5Ftartly/[...path]/route.ts) and paste the proxy file below. The %5F prefix is the URL-encoded underscore; Next.js treats _-prefixed folders as private.',
      'Add the tracker snippet to app/layout.tsx (or src/app/layout.tsx) inside <body>.',
      'Deploy. The browser requests /_tartly/script.js and /_tartly/api/send from your own domain.',
    ],
    notes: [NO_POLICY_CHANGE, NO_COOKIE_FORWARDING],
    firstParty: {
      snippetPath: 'app/layout.tsx',
      files: [
        {
          label: 'Proxy route',
          path: 'app/%5Ftartly/[...path]/route.ts',
          language: 'ts',
          code: NEXTJS_FIRST_PARTY_PROXY,
        },
      ],
      policyNote: NO_POLICY_CHANGE,
      cookiesNote: NO_COOKIE_FORWARDING,
    },
    code: firstPartySnippet,
  },
  {
    slug: 'vercel-first-party',
    title: 'Vercel (first-party)',
    summary:
      'Add a Vercel function and rewrite, then load the tracker from /_tartly on your own domain.',
    language: 'ts',
    status: 'untested',
    statusNote: UNTESTED_PROXY,
    mode: 'first-party',
    steps: [
      'Create api/tartly/[...path].ts and paste the proxy function below.',
      'Add the rewrite from /_tartly/:path* to /api/tartly/:path* in vercel.json. Merge it with any existing rewrites.',
      'Add the tracker snippet to your HTML entry point or shared layout, then deploy.',
    ],
    notes: [NO_POLICY_CHANGE, NO_COOKIE_FORWARDING],
    firstParty: {
      snippetPath: 'index.html or your shared layout',
      files: [
        {
          label: 'Proxy function',
          path: 'api/tartly/[...path].ts',
          language: 'ts',
          code: VERCEL_FIRST_PARTY_PROXY,
        },
        {
          label: 'Rewrite',
          path: 'vercel.json',
          language: 'json',
          code: VERCEL_FIRST_PARTY_REWRITE,
        },
      ],
      policyNote: NO_POLICY_CHANGE,
      cookiesNote: NO_COOKIE_FORWARDING,
    },
    code: firstPartySnippet,
  },
  {
    slug: 'netlify-first-party',
    title: 'Netlify (first-party)',
    summary: 'Add a Netlify edge function, then load the tracker from /_tartly on your own domain.',
    language: 'ts',
    status: 'untested',
    statusNote: UNTESTED_PROXY,
    mode: 'first-party',
    steps: [
      'Create netlify/edge-functions/tartly.ts and paste the edge function below.',
      'Netlify picks up the function and its /_tartly/* path config on deploy.',
      'Add the tracker snippet to your HTML entry point or shared layout, then deploy.',
    ],
    notes: [NO_POLICY_CHANGE, NO_COOKIE_FORWARDING],
    firstParty: {
      snippetPath: 'index.html or your shared layout',
      files: [
        {
          label: 'Edge function',
          path: 'netlify/edge-functions/tartly.ts',
          language: 'ts',
          code: NETLIFY_FIRST_PARTY_PROXY,
        },
      ],
      policyNote: NO_POLICY_CHANGE,
      cookiesNote: NO_COOKIE_FORWARDING,
    },
    code: firstPartySnippet,
  },
  {
    slug: 'cloudflare-first-party',
    title: 'Cloudflare Pages (first-party)',
    summary: 'Add a Pages Function, then load the tracker from /_tartly on your own domain.',
    language: 'ts',
    status: 'untested',
    statusNote: UNTESTED_PROXY,
    mode: 'first-party',
    steps: [
      'Create functions/_tartly/[[path]].ts and paste the Pages Function below.',
      'Cloudflare Pages serves the function at /_tartly/* on the next deploy.',
      'Add the tracker snippet to your HTML entry point or shared layout, then deploy.',
    ],
    notes: [NO_POLICY_CHANGE, NO_COOKIE_FORWARDING],
    firstParty: {
      snippetPath: 'index.html or your shared layout',
      files: [
        {
          label: 'Pages Function',
          path: 'functions/_tartly/[[path]].ts',
          language: 'ts',
          code: CLOUDFLARE_FIRST_PARTY_PROXY,
        },
      ],
      policyNote: NO_POLICY_CHANGE,
      cookiesNote: NO_COOKIE_FORWARDING,
    },
    code: firstPartySnippet,
  },
];

export const INSTALL_GUIDES: InstallGuide[] = [...STANDARD_GUIDES, ...FIRST_PARTY_GUIDES];

export const INSTALL_TROUBLESHOOTING: InstallTroubleshootingItem[] = [
  {
    title: 'No events arrive',
    detail:
      'Ad blockers and privacy extensions can block analytics requests. Test in a normal browser profile and check the network tab for /api/send.',
  },
  {
    title: 'A strict security policy blocks the script',
    detail:
      'Use the first-party install: the tracker is served from /_tartly on your own domain, so the existing policy already allows it. No policy edit is required.',
    href: '/docs/install#strict-security-policy',
  },
  {
    title: 'Domain mismatch',
    detail:
      'data-domain must match the hostname visitors use. A mismatch is reported in the live verification step, not silently ignored.',
  },
  {
    title: 'Single-page app routes are not counted',
    detail:
      'The tracker hooks history.pushState and history.replaceState. If your router bypasses both, send a manual pageview on navigation.',
  },
  {
    title: 'A no-code builder strips the script',
    detail:
      "Some builders remove script tags from per-page HTML blocks. Enter the snippet through the global custom-code or footer injection setting instead, or use the builder's Embed element.",
  },
  {
    title: 'The verification step still says waiting',
    detail:
      'Verification reads the event store, not a client-side flag. Open the site once and wait for the next poll. No event means the script is not running.',
  },
];

const FIRST_PARTY_GUIDE_BY_HOST: Record<string, string> = {
  nextjs: 'nextjs-first-party',
  vercel: 'vercel-first-party',
  netlify: 'netlify-first-party',
  cloudflare: 'cloudflare-first-party',
};

export function getInstallGuide(slug: string) {
  return INSTALL_GUIDES.find(guide => guide.slug === slug);
}

export function getFirstPartyGuideForHost(hostId: string | undefined | null) {
  return (
    getInstallGuide((hostId && FIRST_PARTY_GUIDE_BY_HOST[hostId]) || 'nextjs-first-party') ??
    FIRST_PARTY_GUIDES[0]
  );
}

export function getInstallSnippet(guide: InstallGuide | string, context: InstallContext) {
  const resolved = typeof guide === 'string' ? getInstallGuide(guide) : guide;

  if (!resolved) {
    throw new Error(`Unknown install guide: ${guide}`);
  }

  return resolved.code(context);
}
