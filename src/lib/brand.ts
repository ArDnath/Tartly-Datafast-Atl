/**
 * One place for everything customer-facing. A temporary rename should only
 * require editing `BRAND_NAME` / `BRAND_DOMAIN` here (plus the raster favicons,
 * which are generated assets).
 *
 * Tartly is the final product name; tartly.in is the production domain.
 * Do not treat the name as a trademark claim beyond the owner's own use.
 */
const BRAND_NAME = 'Tartly';
const BRAND_DOMAIN = 'tartly.in';

export const BRAND = {
  name: BRAND_NAME,
  shortName: BRAND_NAME,
  tagline: 'Revenue analytics for indie SaaS',
  promise: 'Connect your site, connect your payments, see which channels make money.',
  description:
    'Affordable revenue-first analytics for developers and indie SaaS founders. See the traffic, campaigns, and pages that turn into paying customers.',
  domain: BRAND_DOMAIN,
  url: `https://${BRAND_DOMAIN}`,
  supportEmail: `support@${BRAND_DOMAIN}`,
  noReplyEmail: `${BRAND_NAME} <no-reply@${BRAND_DOMAIN}>`,
  legalEntity: BRAND_NAME,
  logo: {
    /**
     * The shared Tartly product mark copied from the sibling Tartly repo
     * (`../tartly`). Kept as WebP at 192px so a 32px nav lockup downloads ~8KB
     * instead of the 930px source. The raster favicons are generated from the
     * same source.
     */
    mark: '/brand/tartly-mark.webp',
    mark512: '/brand/tartly-mark-512.webp',
    alt: BRAND_NAME,
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
