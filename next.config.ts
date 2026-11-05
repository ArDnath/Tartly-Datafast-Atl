import 'dotenv/config';
import createNextIntlPlugin from 'next-intl/plugin';
import packageJson from './package.json';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const TRACKER_SCRIPT = '/script.js';
const isProd = process.env.NODE_ENV === 'production';
const workspaceRoot = process.cwd();

const contentSecurityPolicy = `
  default-src 'self';
  img-src 'self' https: data:;
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https:;
  frame-src 'self';
  frame-ancestors 'self';
`;

const defaultHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
];

const trackerHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
  {
    key: 'Cache-Control',
    value: 'public, max-age=86400, must-revalidate',
  },
];

const apiHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: '*',
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, DELETE, POST, PUT',
  },
  {
    key: 'Access-Control-Max-Age',
    value: '86400',
  },
  {
    key: 'Cache-Control',
    value: 'no-cache',
  },
];

const headers = [
  {
    source: '/api/:path*',
    headers: apiHeaders,
  },
  {
    source: '/:path*',
    headers: defaultHeaders,
  },
];

if (isProd) {
  headers.push({
    source: TRACKER_SCRIPT,
    headers: trackerHeaders,
  });
}

/** @type {import('next').NextConfig} */
export default withNextIntl({
  env: {
    ossVersion: packageJson.version,
  },
  reactStrictMode: false,
  turbopack: {
    root: workspaceRoot,
  },
  outputFileTracingRoot: workspaceRoot,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  output: 'standalone',
  devIndicators: false,
  async headers() {
    return headers;
  },
  async redirects() {
    // The product moved from the inherited self-hosted route tree to the
    // single /app workbench during the SaaS conversion. Keep old bookmarks
    // working instead of returning a 404.
    return [
      {
        source: '/websites',
        destination: '/app',
        permanent: false,
      },
      {
        source: '/websites/:websiteId',
        destination: '/app/:websiteId',
        permanent: false,
      },
      {
        source: '/websites/:websiteId/:path*',
        destination: '/app/:websiteId/:path*',
        permanent: false,
      },
      {
        source: '/settings',
        destination: '/app/settings/workspace',
        permanent: false,
      },
      {
        source: '/settings/profile',
        destination: '/app/settings/account',
        permanent: false,
      },
      {
        source: '/settings/preferences',
        destination: '/app/settings/preferences',
        permanent: false,
      },
      {
        source: '/settings/websites',
        destination: '/app/settings/websites',
        permanent: false,
      },
      {
        source: '/settings/billing',
        destination: '/app/settings/billing',
        permanent: false,
      },
      {
        source: '/settings/workspace',
        destination: '/app/settings/workspace',
        permanent: false,
      },
    ];
  },
});
