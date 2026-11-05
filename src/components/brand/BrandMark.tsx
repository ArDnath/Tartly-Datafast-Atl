import { BRAND } from '@/lib/brand';

export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={BRAND.logo.alt}
      className={className}
    >
      <rect width="64" height="64" rx="15" fill={BRAND.colors.canvas} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="14.25"
        fill="none"
        stroke="white"
        strokeOpacity="0.08"
      />
      <circle cx="32" cy="32" r="18.5" fill="none" stroke={BRAND.colors.blush} strokeWidth="2.5" />
      <path
        d="M21.5 38.5 28.5 30.5 34.5 34.5 43 24"
        fill="none"
        stroke={BRAND.colors.foreground}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="43" cy="24" r="3" fill={BRAND.colors.blush} />
    </svg>
  );
}

export function BrandWordmark({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color: BRAND.colors.foreground,
        fontWeight: 600,
        letterSpacing: '-0.03em',
        fontSize: 16,
      }}
    >
      <BrandMark size={size} />
      {BRAND.name}
    </span>
  );
}
