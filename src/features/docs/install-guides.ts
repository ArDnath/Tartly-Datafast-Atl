import { BRAND } from '@/lib/brand';

/**
 * Tracker installation guides.
 *
 * These guides describe the script this repository actually ships. The
 * snippets are generated from one function so the onboarding flow, the public
 * docs, and the website settings screen cannot drift apart.
 *
 * `status` is deliberately honest: a guide is only `tested` when the snippet
 * was run against a real application in this environment. Unit tests cover the
 * generated shape, not the framework runtime.
 */
export type InstallGuideStatus = 'tested' | 'untested';

export interface InstallContext {
  websiteId: string;
  domain?: string;
  /** Origin that serves `/script.js`. Defaults to the brand URL. */
  hostUrl?: string;
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
  code: (context: InstallContext) => string;
}

const SCRIPT_NAME = 'script.js';

function snippet(context: InstallContext) {
  const host = (context.hostUrl || BRAND.url).replace(/\/$/, '');
  const attributes = [
    `src="${host}/${SCRIPT_NAME}"`,
    `data-website-id="${context.websiteId}"`,
    context.domain ? `data-domain="${context.domain}"` : '',
  ].filter(Boolean);

  return attributes.join(' ');
}

function htmlSnippet(context: InstallContext) {
  return `<script defer ${snippet(context)}></script>`;
}

const UNTESTED_RUNTIME =
  'Snippet generation is unit-tested. The install has not been run against a live app in this environment.';

export const INSTALL_GUIDES: InstallGuide[] = [
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
    code: ({ websiteId, domain, hostUrl }) => {
      const host = (hostUrl || BRAND.url).replace(/\/$/, '');
      const attributes = [
        `src="${host}/${SCRIPT_NAME}"`,
        `data-website-id="${websiteId}"`,
        domain ? `data-domain="${domain}"` : '',
      ]
        .filter(Boolean)
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
    code: ({ websiteId, domain, hostUrl }) => {
      const host = (hostUrl || BRAND.url).replace(/\/$/, '');

      return `<html lang="en">
  <head>
    <script
      is:inline
      defer
      src="${host}/${SCRIPT_NAME}"
      data-website-id="${websiteId}"${domain ? `\n      data-domain="${domain}"` : ''}
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
    code: ({ websiteId, domain, hostUrl }) => {
      const host = (hostUrl || BRAND.url).replace(/\/$/, '');

      return `export default function App() {
  return (
    <html lang="en">
      <body>
        <Outlet />
        <script
          defer
          src="${host}/${SCRIPT_NAME}"
          data-website-id="${websiteId}"${domain ? `\n          data-domain="${domain}"` : ''}
        />
      </body>
    </html>
  );
}`;
    },
  },
];

export const INSTALL_TROUBLESHOOTING = [
  {
    title: 'No events arrive',
    detail:
      'Ad blockers and privacy extensions can block analytics requests. Test in a normal browser profile and check the network tab for /api/send.',
  },
  {
    title: 'The script is blocked by CSP',
    detail: `Allow the tracker host in script-src and connect-src. The script loads from ${BRAND.domain} and sends events back to the same origin.`,
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
    title: 'The verification step still says waiting',
    detail:
      'Verification reads the event store, not a client-side flag. Open the site once and wait for the next poll. No event means the script is not running.',
  },
];

export function getInstallGuide(slug: string) {
  return INSTALL_GUIDES.find(guide => guide.slug === slug);
}

export function getInstallSnippet(
  guide: InstallGuide | string,
  context: InstallContext,
) {
  const resolved = typeof guide === 'string' ? getInstallGuide(guide) : guide;

  if (!resolved) {
    throw new Error(`Unknown install guide: ${guide}`);
  }

  return resolved.code(context);
}
