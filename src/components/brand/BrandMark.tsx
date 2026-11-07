import { BRAND } from '@/lib/brand';

/**
 * The Tartly product mark, shared with the sibling Tartly app.
 *
 * The source artwork is a 930px square, served here as a 192px WebP for the
 * nav/auth/onboarding sizes used across the product. The 22% corner radius
 * matches the app-icon convention used by the source brand.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src={BRAND.logo.mark}
      alt={BRAND.logo.alt}
      width={size}
      height={size}
      className={className ? `brand-mark ${className}` : 'brand-mark'}
      loading="lazy"
      decoding="async"
    />
  );
}

export function BrandWordmark({
  size = 28,
  gradient = true,
  className,
}: {
  size?: number;
  /** Set false to render flat foreground ink instead of the brand gradient. */
  gradient?: boolean;
  className?: string;
}) {
  return (
    <span className={className ? `brand-lockup ${className}` : 'brand-lockup'}>
      <BrandMark size={size} />
      <span
        className={gradient ? 'tartly-wordmark' : 'tartly-wordmark tartly-wordmark-flat'}
        style={{ fontSize: Math.max(14, Math.round(size * 0.66)) }}
      >
        {BRAND.name}
      </span>
    </span>
  );
}
