import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { BRAND } from '@/lib/brand';
import { getBaseUrl } from '@/lib/get-base-url';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { Providers } from './Providers';
import '@talivia/react-zen/styles.full.css';
import './global.css';

/**
 * Tartly uses Inter throughout — dashboard chrome, figures and the marketing
 * page. Loading it as a CSS variable keeps `--font-family` in global.css as
 * the single switch that every surface (CSS modules included) reads.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const FAVICON_VERSION = '20261106';

export default function ({ children }) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
         * Applies the saved theme before the first paint. React keeps the DOM
         * value during hydration because <html> suppresses attribute warnings.
         */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="icon" href={`/favicon.ico?v=${FAVICON_VERSION}`} />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={`/favicon-32x32.png?v=${FAVICON_VERSION}`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={`/favicon-16x16.png?v=${FAVICON_VERSION}`}
        />
        <link
          rel="icon"
          type="image/svg+xml"
          sizes="any"
          href={`/favicon.svg?v=${FAVICON_VERSION}`}
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`/apple-touch-icon.png?v=${FAVICON_VERSION}`}
        />
        <link rel="manifest" href={`/site.webmanifest?v=${FAVICON_VERSION}`} />
        <link
          rel="mask-icon"
          href={`/safari-pinned-tab.svg?v=${FAVICON_VERSION}`}
          color="#1b1b1b"
        />
        <meta name="msapplication-TileColor" content="#1b1b1b" />
        <meta name="theme-color" content="#1b1b1b" />
      </head>
      <body suppressHydrationWarning>
        <Suspense>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();

  return {
    metadataBase: getBaseUrl(headerStore),
    title: {
      template: `%s | ${BRAND.name}`,
      default: BRAND.name,
    },
  };
}
