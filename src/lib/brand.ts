/**
 * One place for everything customer-facing. A temporary rename should only
 * require editing this file (plus the raster favicons, which are generated
 * assets).
 *
 * RevenueLens is a working name. Do not treat it as a trademark.
 */
export const BRAND = {
  name: 'RevenueLens',
  shortName: 'RevenueLens',
  tagline: 'Revenue analytics for indie SaaS',
  promise: 'Connect your site, connect your payments, see which channels make money.',
  description:
    'Affordable revenue-first analytics for developers and indie SaaS founders. See the traffic, campaigns, and pages that turn into paying customers.',
  domain: 'revenuelens.app',
  url: 'https://revenuelens.app',
  supportEmail: 'support@revenuelens.app',
  noReplyEmail: 'RevenueLens <no-reply@revenuelens.app>',
  legalEntity: 'RevenueLens',
  logo: {
    mark: '/brand-mark.svg',
    alt: 'RevenueLens',
  },
  colors: {
    canvas: '#1b1b1b',
    card: '#222222',
    muted: '#262626',
    accent: '#2e2e2e',
    foreground: '#f4f4f5',
    mutedForeground: '#a1a1aa',
    border: 'rgba(255, 255, 255, 0.08)',
    blush: '#f2b4cb',
    blushSoft: '#f7d2e0',
    blushInk: '#2b1622',
    warning: '#f8b84e',
  },
} as const;

export type Brand = typeof BRAND;
